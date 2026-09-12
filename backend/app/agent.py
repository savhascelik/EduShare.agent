import json
import math
from typing import Dict, Any, List
from strands import Agent, tool
from strands.models import BedrockModel
from app.config import settings
from app.database import SessionLocal
from app.models import School, SurplusItem, NeedRequest, AgentTask, Transfer

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

TOOL_CATALOG = {
    "search_tools": {
        "keywords": ["bul", "keşfet", "search", "find", "tool", "araç"],
        "description": "Kullanıcı veya ajan niyetine göre uygun araçları dinamik olarak listeler (Code Mode)."
    },
    "query_nearby_needs": {
        "keywords": ["ihtiyaç", "yakın", "okul", "mesafe", "nearby", "distance", "need"],
        "description": "Verilen kategori ve koordinatlara göre en yakın okullardaki açık ihtiyaç taleplerini PostgreSQL'den sorgular."
    },
    "calculate_impact_metrics": {
        "keywords": ["tasarruf", "tl", "karbon", "co2", "emisyon", "savings", "impact"],
        "description": "Transfer edilecek eşyalar için TL cinsinden kamu tasarrufu ve önlenen CO2 ayak izini hesaplar."
    },
    "create_hitl_approval_card": {
        "keywords": ["onay", "kart", "hitl", "müdür", "approval", "human", "karar"],
        "description": "Okul müdürünün onayına sunulmak üzere Human-in-the-Loop (HITL) transfer teklif kartı oluşturur."
    }
}

@tool
def search_tools(user_intent: str) -> str:
    """Meta-Tool: Dynamically discovers relevant tools based on natural language intent (Code Mode)."""
    matched = []
    intent_lower = user_intent.lower()
    for name, meta in TOOL_CATALOG.items():
        if any(kw in intent_lower for kw in meta["keywords"]):
            matched.append({"tool_name": name, "description": meta["description"]})
    if not matched:
        matched = [{"tool_name": k, "description": v["description"]} for k, v in TOOL_CATALOG.items()]
    return json.dumps(matched, ensure_ascii=False)

@tool
def query_nearby_needs(category: str, source_lat: float, source_lng: float, max_km: float = 35.0) -> str:
    """Queries PostgreSQL for open school needs near coordinates and filters by distance and category."""
    db = SessionLocal()
    try:
        # Fetch open needs
        needs = db.query(NeedRequest).filter(NeedRequest.status == "OPEN").all()
        candidates = []
        for n in needs:
            school = db.query(School).filter(School.id == n.school_id).first()
            if not school:
                continue
            dist = haversine_distance_km(source_lat, source_lng, school.latitude, school.longitude)
            if dist <= max_km:
                # Check category match (or general relevance)
                cat_match = (
                    category.lower() in n.item_category.lower() or 
                    n.item_category.lower() in category.lower() or
                    category == "Genel Donanım" or
                    n.item_category == "Genel Donanım"
                )
                candidates.append({
                    "need_id": n.id,
                    "target_school_id": school.id,
                    "target_school_name": school.name,
                    "target_district": school.district,
                    "target_lat": school.latitude,
                    "target_lng": school.longitude,
                    "item_category": n.item_category,
                    "quantity_needed": n.quantity_needed,
                    "urgency_level": n.urgency_level,
                    "distance_km": dist,
                    "category_matched": cat_match
                })
        
        # Sort by category match priority, then distance
        candidates.sort(key=lambda x: (not x["category_matched"], x["distance_km"]))
        return json.dumps(candidates[:5], ensure_ascii=False)
    finally:
        db.close()

@tool
def calculate_impact_metrics(quantity: int, unit_value_tl: float, distance_km: float, category: str) -> str:
    """Calculates financial savings in TL and prevented CO2 footprint in kg."""
    carbon_factors = {
        "bilişim": 160.0,
        "bilgisayar": 160.0,
        "mobilya": 28.0,
        "sıra": 28.0,
        "fen": 50.0,
        "laboratuvar": 50.0,
        "spor": 18.0,
        "müzik": 22.0,
        "kütüphane": 4.5,
        "kitap": 4.5,
    }
    
    # Match carbon factor
    matched_factor = 25.0
    cat_lower = category.lower()
    for kw, factor in carbon_factors.items():
        if kw in cat_lower:
            matched_factor = factor
            break
            
    total_savings_tl = float(quantity * unit_value_tl)
    # CO2 prevented by reusing existing assets instead of new manufacturing, minus logistics impact
    gross_co2 = quantity * matched_factor
    logistics_co2 = distance_km * 0.12 # kg CO2 for local transport
    net_prevented_co2 = max(2.5, round(gross_co2 - logistics_co2, 2))
    
    return json.dumps({
        "savings_tl": total_savings_tl,
        "prevented_co2_kg": net_prevented_co2,
        "distance_km": distance_km,
        "summary": f"₺{total_savings_tl:,.2f} kamu tasarrufu ve {net_prevented_co2:.1f} kg CO2 önleme."
    }, ensure_ascii=False)

@tool
def create_hitl_approval_card(
    task_id: str,
    from_school_id: str,
    to_school_id: str,
    surplus_item_id: str,
    need_id: str,
    quantity: int,
    savings_tl: float,
    co2_kg: float,
    distance_km: float,
    reasoning: str
) -> str:
    """Sets task status to AWAITING_HUMAN_APPROVAL and stores the transfer decision card."""
    db = SessionLocal()
    try:
        from_school = db.query(School).filter(School.id == from_school_id).first()
        to_school = db.query(School).filter(School.id == to_school_id).first()
        item = db.query(SurplusItem).filter(SurplusItem.id == surplus_item_id).first()
        
        card_payload = {
            "title": f"🤖 EduShare Lojistik Önerisi: {item.title if item else 'Eğitim Malzemesi'}",
            "from_school_id": from_school_id,
            "from_school_name": from_school.name if from_school else "Kaynak Okul",
            "from_district": from_school.district if from_school else "",
            "from_lat": from_school.latitude if from_school else 0.0,
            "from_lng": from_school.longitude if from_school else 0.0,
            "to_school_id": to_school_id,
            "to_school_name": to_school.name if to_school else "Hedef Okul",
            "to_district": to_school.district if to_school else "",
            "to_lat": to_school.latitude if to_school else 0.0,
            "to_lng": to_school.longitude if to_school else 0.0,
            "surplus_item_id": surplus_item_id,
            "need_id": need_id,
            "item_title": item.title if item else "Eşya",
            "quantity": quantity,
            "distance_km": distance_km,
            "estimated_savings_tl": savings_tl,
            "prevented_co2_kg": co2_kg,
            "reasoning": reasoning
        }
        
        task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
        if task:
            task.status = "AWAITING_HUMAN_APPROVAL"
            task.match_payload = card_payload
            db.commit()
            
        return json.dumps({
            "status": "SUCCESS",
            "message": "HITL onay kartı oluşturuldu ve okul müdürünün paneline aktarıldı.",
            "card": card_payload
        }, ensure_ascii=False)
    finally:
        db.close()

def get_edushare_agent() -> Agent:
    """Initializes the Strands Agent powered by Amazon Bedrock."""
    bedrock_model = BedrockModel(
        model_id=settings.BEDROCK_MODEL_ID,
        region_name=settings.AWS_REGION
    )
    
    system_prompt = (
        "Sen EduShare Agent'sın. MEB okulları, kütüphaneler ve eğitim kurumları arasında fazla eşyaların "
        "israf edilmeyip en yakın ve en çok ihtiyacı olan okula aktarılmasını sağlayan otonom komşuluk ve lojistik ajanısın.\n\n"
        "GÖREVİN:\n"
        "1. Bir okul fazla eşya girdiğinde, önce query_nearby_needs ile yakın mesafedeki açık ihtiyaçları tespit et.\n"
        "2. En uygun eşleşme için calculate_impact_metrics ile tasarruf ve CO2 etkisini hesapla.\n"
        "3. Kesinlikle kendi başına transferi tamamlama! Daima create_hitl_approval_card aracını çağırarak "
        "okul müdürünün onayına sunulacak Human-in-the-Loop kartını hazırla.\n"
        "4. Her zaman Türkçe, saygılı, net ve kamu yararını gözeten bir üslupla çalış."
    )
    
    return Agent(
        model=bedrock_model,
        tools=[search_tools, query_nearby_needs, calculate_impact_metrics, create_hitl_approval_card],
        system_prompt=system_prompt
    )
