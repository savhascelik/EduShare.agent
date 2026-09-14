import asyncio
import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import AgentTask, SurplusItem, NeedRequest, School
from app.agent import get_edushare_agent
from app.sse import sse_manager

logger = logging.getLogger("edushare_worker")
logging.basicConfig(level=logging.INFO)

ACTIVE_TASK_STATUSES = [
    "PENDING",
    "PROCESSING",
    "AWAITING_HUMAN_APPROVAL",
    "PENDING_RECIPIENT_REQUEST",
    "AWAITING_DONOR_APPROVAL"
]

async def process_single_task(task_id: str):
    """Processes a single pending agent task using the Strands Agent with concurrency and duplicate safeguards."""
    db: Session = SessionLocal()
    try:
        task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
        if not task or task.status != "PENDING":
            return
            
        # Concurrency & Duplicate Gate:
        # If this source_id ALREADY has an active task in progress or awaiting approval,
        # supersede this new task immediately to prevent race conditions & duplicate evaluations.
        if task.source_id:
            existing_active = db.query(AgentTask).filter(
                AgentTask.id != task.id,
                AgentTask.source_id == task.source_id,
                AgentTask.status.in_(["PROCESSING", "AWAITING_HUMAN_APPROVAL", "PENDING_RECIPIENT_REQUEST", "AWAITING_DONOR_APPROVAL"])
            ).first()
            if existing_active:
                logger.info(f"Task {task.id} superseded: source {task.source_id} already has active proposal {existing_active.id}")
                task.status = "SUPERSEDED"
                task.match_payload = {"superseded_reason": f"Active proposal already pending ({existing_active.id})"}
                db.commit()
                return

        task.status = "PROCESSING"
        db.commit()
        
        agent = get_edushare_agent()
        
        if task.task_type == "MATCH_SURPLUS":
            item = db.query(SurplusItem).filter(SurplusItem.id == task.source_id).first()
            if not item or item.status != "AVAILABLE" or item.quantity <= 0:
                task.status = "SUPERSEDED"
                task.match_payload = {"superseded_reason": "Item no longer available"}
                db.commit()
                return
            source_school = db.query(School).filter(School.id == item.school_id).first()
            if not source_school:
                task.status = "REJECTED"
                db.commit()
                return

            prompt = (
                f"Yeni bir fazla eşya bildirimi yapıldı.\n"
                f"- Task ID: {task.id}\n"
                f"- Fazla Eşya ID: {item.id}\n"
                f"- Eşya Başlığı: {item.title}\n"
                f"- Kategori: {item.item_category}\n"
                f"- Adet: {item.quantity}\n"
                f"- Durum: {item.condition_rating}\n"
                f"- Tahmini Birim Değer: {item.estimated_unit_value_tl} TL\n"
                f"- Kaynak Okul ID: {source_school.id}\n"
                f"- Kaynak Okul Adı: {source_school.name} ({source_school.district})\n"
                f"- Kaynak Koordinatlar: Lat {source_school.latitude}, Lng {source_school.longitude}\n\n"
                "Lütfen sırasıyla:\n"
                "1. query_nearby_needs aracını kullanarak bu kategoride açık ihtiyacı olan en yakın okulu sorgula.\n"
                "2. Bulunan okul için calculate_impact_metrics aracını çağırarak TL tasarrufu ve CO2 etkisini hesapla.\n"
                "3. Son olarak create_hitl_approval_card aracını çağırarak okul müdürünün onayına sunulacak HITL kartını oluştur."
            )
            
            logger.info(f"Invoking Strands Agent for task {task.id}...")
            agent_response = await agent.invoke_async(prompt)
            logger.info(f"Strands Agent completed for task {task.id}")
            
            # Refresh task to see if tool updated it
            db.refresh(task)
            if task.status in ["AWAITING_HUMAN_APPROVAL", "PENDING_RECIPIENT_REQUEST", "AWAITING_DONOR_APPROVAL"] and task.match_payload:
                await sse_manager.broadcast("NEW_HITL_TASK", {
                    "task_id": task.id,
                    "card": task.match_payload
                })

        elif task.task_type == "MATCH_NEED":
            need = db.query(NeedRequest).filter(NeedRequest.id == task.source_id).first()
            if not need or need.status != "OPEN" or need.quantity_needed <= 0:
                task.status = "SUPERSEDED"
                task.match_payload = {"superseded_reason": "Need no longer open"}
                db.commit()
                return
            target_school = db.query(School).filter(School.id == need.school_id).first()
            if not target_school:
                task.status = "REJECTED"
                db.commit()
                return

            prompt = (
                f"Yeni bir okul acil ihtiyaç bildirdi.\n"
                f"- Task ID: {task.id}\n"
                f"- İhtiyaç ID: {need.id}\n"
                f"- İhtiyaç Başlığı: {need.title}\n"
                f"- Açıklama: {need.raw_text}\n"
                f"- Kategori: {need.item_category}\n"
                f"- Gereken Adet: {need.quantity_needed}\n"
                f"- Aciliyet Seviyesi: {need.urgency_level}\n"
                f"- Hedef Okul ID: {target_school.id}\n"
                f"- Hedef Okul Adı: {target_school.name} ({target_school.district})\n"
                f"- Hedef Koordinatlar: Lat {target_school.latitude}, Lng {target_school.longitude}\n\n"
                "Lütfen sırasıyla:\n"
                "1. query_nearby_surplus aracını kullanarak bu ihtiyacı karşılayabilecek en yakın ve uygun okul fazla envanterini sorgula.\n"
                "2. Bulunan eşya için calculate_impact_metrics aracını çağırarak TL tasarrufu ve CO2 etkisini hesapla.\n"
                "3. Son olarak create_hitl_approval_card aracını çağırarak okul müdürünün onayına sunulacak HITL kartını oluştur."
            )
            
            logger.info(f"Invoking Strands Agent for NEED task {task.id}...")
            agent_response = await agent.invoke_async(prompt)
            logger.info(f"Strands Agent completed for NEED task {task.id}")
            
            db.refresh(task)
            if task.status in ["AWAITING_HUMAN_APPROVAL", "PENDING_RECIPIENT_REQUEST", "AWAITING_DONOR_APPROVAL"] and task.match_payload:
                await sse_manager.broadcast("NEW_HITL_TASK", {
                    "task_id": task.id,
                    "card": task.match_payload
                })

    except Exception as e:
        logger.error(f"Error processing task {task_id}: {e}", exc_info=True)
        try:
            task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
            if task and task.status == "PROCESSING":
                task.status = "PENDING"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

async def run_autonomous_inventory_sweep():
    """
    Autonomous Proactive Sweeper:
    Periodically checks if any unassigned surplus items can fulfill open needs,
    ensuring continuous autonomous background matching without human prompting,
    while strictly preventing duplicate evaluations for items with existing pending proposals.
    """
    db: Session = SessionLocal()
    try:
        active_tasks = db.query(AgentTask).filter(
            AgentTask.status.in_(ACTIVE_TASK_STATUSES)
        ).all()
        
        active_source_ids = {t.source_id for t in active_tasks if t.source_id}
        active_matched_surplus_ids = set()
        active_matched_need_ids = set()

        for t in active_tasks:
            p = t.match_payload or {}
            s_id = p.get("surplus_item_id")
            n_id = p.get("need_id")
            if s_id:
                active_matched_surplus_ids.add(s_id)
            if n_id:
                active_matched_need_ids.add(n_id)
        
        available_surplus = db.query(SurplusItem).filter(
            SurplusItem.status == "AVAILABLE",
            SurplusItem.quantity > 0
        ).all()
        
        open_needs = db.query(NeedRequest).filter(
            NeedRequest.status == "OPEN",
            NeedRequest.quantity_needed > 0
        ).all()
        
        if not open_needs or not available_surplus:
            return
            
        for surplus in available_surplus:
            # Skip if already being evaluated or awaiting approval
            if surplus.id in active_source_ids or surplus.id in active_matched_surplus_ids:
                continue
                
            matching_need = next((
                n for n in open_needs
                if n.school_id != surplus.school_id
                and n.id not in active_source_ids
                and n.id not in active_matched_need_ids
                and (
                    surplus.item_category.lower() in n.item_category.lower() or
                    n.item_category.lower() in surplus.item_category.lower() or
                    surplus.item_category == "Genel Donanım" or
                    n.item_category == "Genel Donanım"
                )
            ), None)
            
            if matching_need:
                logger.info(f"Autonomous Sweeper: Discovered unassigned surplus {surplus.id} with matching open need {matching_need.id}. Enqueuing agent task...")
                new_task = AgentTask(
                    task_type="MATCH_SURPLUS",
                    source_id=surplus.id,
                    status="PENDING"
                )
                db.add(new_task)
                db.commit()
                # Task is committed as PENDING; the queue loop will process it on next tick
                break
    except Exception as e:
        logger.error(f"Error in autonomous inventory sweep: {e}", exc_info=True)
    finally:
        db.close()

async def start_background_queue_loop():
    """Runs a continuous self-waking loop to consume pending tasks and sweep for autonomous matches."""
    logger.info("EduShare Autonomous Background Queue Loop started.")
    iteration = 0
    while True:
        try:
            db = SessionLocal()
            pending_tasks = db.query(AgentTask).filter(AgentTask.status == "PENDING").all()
            task_ids = [t.id for t in pending_tasks]
            db.close()
            
            for tid in task_ids:
                await process_single_task(tid)

            # Proactive inventory sweep every 30 seconds
            iteration += 1
            if iteration % 6 == 0:
                await run_autonomous_inventory_sweep()

        except Exception as e:
            logger.error(f"Queue loop iteration error: {e}")
        
        await asyncio.sleep(5)
