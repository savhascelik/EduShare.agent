# EduShare Agent: System Architecture & Implementation Blueprint

> **Project Title:** EduShare Agent  
> **Tagline:** Autonomous Resource Sharing & Logistics Agent for Educational Communities  
> **Hackathon:** Agents for Humans Hackathon (Devpost & Amazon Web Services)  
> **Hackathon URL:** https://agentsforhumans.devpost.com/  
> **Target Track:** Good Neighbor Agents (Schools, Libraries, Non-Profits & Community Hubs)  
> **Submission Deadline:** September 14, 2026 @ 5:00pm PDT  
> **Core Stack:** Python 3.11+ (FastAPI + Strands Agents SDK) + PostgreSQL + React 18+ (Tailwind CSS + Leaflet)

---

## 📌 1. Mission & Real-World Impact

### 1.1 Problem & Vision
Public schools, vocational training centers, and local non-profits frequently hoard unused physical assets (desks, computers, printers, projectors, laboratory equipment) in storage rooms, while neighboring institutions face severe budget constraints and shortages. 

Manual inventory listing systems (like KUPA) proved that inter-institutional sharing can unlock over **65 Million TL (~$2M+)** in public savings. **EduShare Agent** upgrades this legacy bulletin-board model into a **proactive, self-waking autonomous community logistics agent** powered by the **Strands Agents SDK** and **Amazon Bedrock**.

Instead of requiring school principals to browse static catalogs, EduShare Agent operates quietly in the background:
1. Ingests freeform natural language text & photos of surplus items or needs.
2. Dynamically discovers tools via a **Tool Search Registry (Code Mode Pattern)**.
3. Computes optimal spatial-proximity matching and financial/carbon impact using PostgreSQL.
4. Generates a **Human-in-the-Loop (HITL)** decision card on the principal's dashboard for one-click approval.

---

## 🛠️ 2. High-Level Architecture & Tech Stack

| Component | Selected Technology | Purpose & Architectural Role |
| :--- | :--- | :--- |
| **Backend API** | **Python 3.11+ / FastAPI** | Async REST endpoints, SSE streams for real-time agent notifications. |
| **Agent Core** | **Strands Agents SDK (`strands-agents`)** | Background agent orchestration, tools execution, and HITL interrupts. |
| **LLM Engine** | **Amazon Bedrock (`boto3`)** | `anthropic.claude-3-5-sonnet` (for multimodal vision & spatial routing logic). |
| **Database** | **PostgreSQL (PostGIS / Haversine)** | Relational storage for schools, surplus inventory, needs, queue, and impact metrics. |
| **Tool Registry** | **Code Mode / Dynamic Tool Search** | Prevents context window overload by binding tools dynamically at runtime. |
| **Frontend Framework** | **React 18+ (Vite / Next.js)** | Light, accessible, warm community dashboard. |
| **Styling & UI Components**| **Tailwind CSS + Lucide-React** | Warm Amber, Emerald, and Slate palette with rounded cards. |
| **Interactive Map** | **React-Leaflet + Curved Paths** | Animated SVG arcs with glowing particles showing active school-to-school transfers. |
| **Animations** | **Framer Motion** | Smooth drawer entrances, rolling impact counter numbers, card popups. |

---

## 📐 3. Operational Data Flow & Queue Architecture

```
[ School Input (Voice/Text/Photo) ]
               │
               ▼
   [ FastAPI `/api/surplus` Endpoint ] ──► Insert into PostgreSQL (`agent_tasks` Queue: PENDING)
                                                   │
                                                   ▼
                                ┌────────────────────────────────────┐
                                │ Background Self-Waking Queue Loop │
                                └──────────────────┬─────────────────┘
                                                   │
                                                   ▼
                                ┌────────────────────────────────────┐
                                │ Strands Agent Engine + Bedrock     │
                                │ 1. Meta-Tool: `search_tools()`     │
                                │ 2. Dynamic Tool Binding            │
                                │ 3. Spatial Match & Impact Calc     │
                                └──────────────────┬─────────────────┘
                                                   │
                                                   ▼
                                [ Status: AWAITING_HUMAN_APPROVAL ]
                                                   │
                                                   ▼
                                ┌────────────────────────────────────┐
                                │ React UI (HITL Approval Drawer)    │
                                │ Principal clicks: [ Approve ]      │
                                └──────────────────┬─────────────────┘
                                                   │
                                                   ▼
                                [ Status: COMPLETED -> Live Map Arc ]
```

---

## 🗄️ 4. PostgreSQL Database Schema (DDL)

```sql
-- Schools Table
CREATE TABLE schools (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Surplus Inventory Items
CREATE TABLE surplus_items (
    id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES schools(id),
    raw_text TEXT NOT NULL,
    item_category VARCHAR(100),
    quantity INT NOT NULL,
    condition_rating VARCHAR(50), -- e.g. 'Good', 'Minor Wear', 'Refurbished'
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'AVAILABLE', -- AVAILABLE, MATCHED, TRANSFERRED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Need Requests
CREATE TABLE need_requests (
    id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES schools(id),
    raw_text TEXT NOT NULL,
    item_category VARCHAR(100),
    quantity_needed INT NOT NULL,
    urgency_level VARCHAR(50), -- HIGH, MEDIUM, LOW
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent Autonomous Task Queue
CREATE TABLE agent_tasks (
    id VARCHAR(64) PRIMARY KEY,
    task_type VARCHAR(50) NOT NULL, -- MATCH_SURPLUS, MATCH_NEED
    source_id VARCHAR(64) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, AWAITING_HUMAN_APPROVAL, COMPLETED
    match_payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Completed Transfers & Carbon Impact Log
CREATE TABLE transfers (
    id VARCHAR(64) PRIMARY KEY,
    surplus_item_id VARCHAR(64) REFERENCES surplus_items(id),
    from_school_id VARCHAR(64) REFERENCES schools(id),
    to_school_id VARCHAR(64) REFERENCES schools(id),
    estimated_savings_tl DECIMAL(12, 2),
    prevented_co2_kg DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'APPROVED',
    transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🤖 5. Strands Agent Core Implementation (Python Code Blueprint)

### `backend/agent.py`
```python
import os
import json
import psycopg2
from strands_agents import Agent, tool
from strands_agents.models import BedrockModel

# Initialize Amazon Bedrock Model
bedrock_model = BedrockModel(
    model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
    region_name="us-east-1"
)

# Tool Registry Index (Code Mode Pattern)
TOOL_CATALOG = {
    "query_nearby_needs": {
        "keywords": ["distance", "proximity", "nearby", "need", "mesafe", "ihtiyaç"],
        "description": "Searches PostgreSQL for schools within radius needing surplus items."
    },
    "calculate_impact_metrics": {
        "keywords": ["savings", "tl", "carbon", "co2", "tasarruf", "emisyon"],
        "description": "Calculates financial savings in TL and CO2 footprint reduction in kg."
    }
}

@tool
def search_tools(user_intent: str) -> str:
    """Meta-Tool: Dynamically discovers relevant tools based on natural language intent."""
    matched = []
    intent_lower = user_intent.lower()
    for name, meta in TOOL_CATALOG.items():
        if any(kw in intent_lower for kw in meta["keywords"]):
            matched.append({"tool_name": name, "description": meta["description"]})
    return json.dumps(matched, ensure_ascii=False)

@tool
def query_nearby_needs(item_category: str, source_lat: float, source_lng: float, max_km: float = 15.0) -> str:
    """Executes Haversine spatial SQL query in PostgreSQL to find recipient schools."""
    # SQL query calculating earth distance between school coordinates
    return json.dumps([
        {
            "target_school_id": "SCH_CUMHURİYET",
            "target_school_name": "Cumhuriyet İlkokulu",
            "distance_km": 3.2,
            "quantity_needed": 10
        }
    ])

@tool
def trigger_human_in_the_loop_approval(source_school: str, target_school: str, item_summary: str, savings_tl: float) -> str:
    """HITL Gate: Pauses task execution and generates an interactive approval card for school principal."""
    return json.dumps({
        "status": "AWAITING_HUMAN_APPROVAL",
        "card_payload": {
            "title": "🤖 EduShare Agent Transfer Önerisi",
            "from": source_school,
            "to": target_school,
            "items": item_summary,
            "estimated_savings": f"₺{savings_tl:,.2f}"
        }
    })

# Master EduShare Agent
edushare_agent = Agent(
    model=bedrock_model,
    tools=[search_tools, query_nearby_needs, trigger_human_in_the_loop_approval],
    system_prompt=(
        "You are EduShare Agent, an autonomous community logistics coordinator for educational institutions. "
        "Your mission is to eliminate resource waste in public schools through intelligent spatial matching. "
        "Always use search_tools first if unsure which tool to execute. "
        "Never complete a transfer without calling trigger_human_in_the_loop_approval."
    )
)
```

---

## 🎨 6. Frontend UX & Animated Transfer Map Blueprint

### Visual Identity
- **Primary Colors:** Warm Amber (`#F59E0B`), Forest Emerald (`#10B981`), Friendly Cream (`#F8FAFC`).
- **Typography:** Modern Sans-Serif (`Inter` or `Outfit`).
- **Hero Counters (Framer Motion Animated Numbers):**
  - 💰 **Kamu Tasarrufu:** `₺65,420,000`
  - 📦 **Yeniden Kazanılan Ekipman:** `14,890 Adet`
  - 🌿 **Önlenen Karbon Emisyonu:** `34.2 Ton CO2`

### Animated Map Component (`components/TransferMap.jsx`)
- Built with **React-Leaflet**.
- Schools represented as distinct Amber (Surplus) and Emerald (Need) markers.
- Active transfers render as **curved animated SVG/Canvas paths** with glowing particles traveling from School A to School B.

---

## 🚀 7. Ready-to-Use Local LLM Prompt (Copy & Paste)

```text
You are an expert full-stack developer building a hackathon-winning application named "EduShare Agent" for the AWS "Agents for Humans Hackathon" (https://agentsforhumans.devpost.com/).

Mission:
Build a full-stack web application (FastAPI + PostgreSQL backend and React frontend) that automates surplus resource logistics between public schools and non-profits using Strands Agents SDK and Amazon Bedrock.

Key Architectural Specs:
1. Backend (Python/FastAPI + PostgreSQL):
   - Use Strands Agents SDK (`strands-agents`) with Amazon Bedrock (`anthropic.claude-3-5-sonnet`).
   - Implement Cloudflare Code Mode inspired Tool Search Registry (`search_tools`) for dynamic tool discovery.
   - Implement an autonomous self-waking queue loop using PostgreSQL `agent_tasks` table.
   - Include Human-in-the-Loop (HITL) interrupt gates before any transfer is finalized.

2. Frontend (React + Tailwind CSS + Framer Motion + React-Leaflet):
   - Warm, friendly, accessible UI (Amber, Emerald, Slate palette).
   - Live public dashboard with animated rolling metrics (Total TL Saved, Items Rehomed, CO2 Reduced).
   - Interactive Leaflet map with animated curved SVG paths showing live transfers between school markers.
   - Natural language voice/text input box for principals with drag & drop photo attachment for Bedrock Vision analysis.
   - Interactive HITL Approval Drawer for school principals to approve/reject recommended transfers.

Generate modular, production-ready code starting with PostgreSQL schema DDL, FastAPI endpoints, Strands Agent tools, and React Leaflet map components.
```
