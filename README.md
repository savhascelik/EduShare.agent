# EduShare Agent • Autonomous Inter-School Surplus Redistribution Network

> **Track:** Good Neighbor Agents  
> **Hackathon:** Agents for Humans Hackathon 2026 (Devpost & AWS)  
> **Repository:** [https://github.com/savhascelik/EduShare.agent](https://github.com/savhascelik/EduShare.agent)

---

## 🌟 Executive Summary

Across state school systems worldwide, millions of dollars worth of educational equipment, laboratory kits, computer workstations, and ergonomic desks sit dormant in school basements and storage facilities. Concurrently, neighboring schools located just a few kilometers away suffer from acute resource shortages and constrained public budgets.

Traditional bureaucratic reallocation processes are slow, opaque, and lack inter-school logistical visibility.

**EduShare Agent** bridges this gap as an **Autonomous "Good Neighbor" AI Agent**:
1. **Multimodal Warehouse Intake (Amazon Bedrock Nova Pro):** School administrators snap a photo of dormant inventory. Nova Pro Vision instantly identifies the item, category, condition, quantity, and market valuation in seconds.
2. **Autonomous Geospatial Matching (Strands Agents SDK):** The background agent continuously matches surpluses with neighboring school needs based on Haversine distance corridors, urgency, public budget savings (₺), and prevented manufacturing carbon footprint ($kg\ CO_2$).
3. **Bilateral Handshake Verification (Human-in-the-Loop):** Transfers enforce mutual consent. The recipient principal formally requests the equipment (locking reserved stock), and the donor principal authorizes physical dispatch.
4. **Official Protocol & Immutable Audit:** Upon mutual approval, physical inventory decrements, an official Ministry of National Education protocol code (`MEB-TR-2026-XXXXXX`) is generated, and an immutable ledger records the chain of custody.

---

## 🌐 Live Cloud Architecture

```
[ School Principal / Public Browser ]
         │  ▲
         │  │ Vite + React 19 + Tailwind CSS + Leaflet GIS + SSE Streaming
         ▼  │
 [ Nginx Reverse Proxy (Port 80) ]
         │
         ├──▶ /api/stream/agent ── (Server-Sent Events Real-Time Telemetry)
         └──▶ /api/* ───────────── (FastAPI Backend Python 3.11)
                     │
                     ├──▶ [ PostgreSQL 16 Alpine ] (Real relational persistence)
                     │
                     ├──▶ [ Amazon Bedrock (us-east-1) ]
                     │       ├── Model: us.amazon.nova-pro-v1:0
                     │       ├── Multimodal Vision (Zero-shot equipment inspection)
                     │       └── Strategic Reasoning (Contextual transfer rationale)
                     │
                     └──▶ [ Strands Agents SDK ]
                             ├── Autonomous Background Self-Waking Loop
                             ├── Tool: query_nearby_needs (Haversine corridor)
                             ├── Tool: calculate_impact_metrics (₺ savings & CO2)
                             └── Tool: create_hitl_proposal (Bilateral workflow)
```

---

## 🚀 Key Innovations & Features

### 1. Bilateral Handshake Protocol (Two-Phase Verification)
To eliminate unilateral allocations and inventory discrepancies, transfers operate through a deterministic two-phase handshake:
- **Phase 1 (`PENDING_RECIPIENT_REQUEST`):** AI identifies a surplus-need match. The recipient school principal reviews the proposal and clicks `[📋 Send Formal Request]`. The required inventory quantity is immediately marked as **Reserved** in the donor's warehouse to prevent race conditions.
- **Phase 2 (`AWAITING_DONOR_APPROVAL`):** The donor school principal receives the inbound formal request and reviews the impact report. Upon clicking `[🚚 Authorize Dispatch & Transfer]`, reserved stock is released, physical stock is decremented, and an official transfer protocol is minted (`MEB-TR-2026-XXXXXX`).
- **Graceful Rejection:** Rejection at any stage automatically unreserves inventory back to available stock.

### 2. Principal Role-Based Access Control (RBAC) & Security Gating
- The **Agent Decision Center (HITL Drawer)** is strictly protected. Unauthenticated visitors are prompted with a secure login gate.
- Pending notification badges are dynamically scoped: principals only see badges for transfers that require **their** immediate action (Recipient in Phase 1, Donor in Phase 2).

### 3. Dynamic Impact & Proportional Allocation
- **Deterministic Valuation & Carbon Calculation:** Evaluated using standardized manufacturing emission factors and localized public procurement metrics.
- **Partial Stock Splitting:** When a batch surplus (e.g., 5 microscopes) is partially fulfilled (e.g., 4 units to School A), remaining proposals automatically adapt to the leftover balance (1 unit), dynamically recalculating savings and carbon impact proportionally.

### 4. Interactive Live GIS Map
- High-performance Leaflet map with custom institution markers.
- Dynamic bezier curved transfer arcs visualizing active equipment corridors across Istanbul districts.
- Filter layers for Open Needs, Available Surpluses, and Completed Transfers.

---

## 🔑 Pre-Seeded Test Accounts

The platform includes **one-click quick login buttons** in the **School Portal** modal:

| School Institution | District | Email | Password | Primary Role in Demo |
| :--- | :--- | :--- | :--- | :--- |
| **Kadıköy Anadolu Lisesi** | Kadıköy | `kadikoy@meb.gov.tr` | `Sifre123!` | Donor (Optic Microscopes & PCs) |
| **Maltepe Fen Lisesi** | Maltepe | `maltepe@meb.gov.tr` | `Sifre123!` | Recipient (STEM & Biology Labs) |
| **Beşiktaş Atatürk Anadolu Lisesi**| Beşiktaş | `besiktas@meb.gov.tr` | `Sifre123!` | Recipient (Student Desks) |
| **Kabataş Erkek Lisesi** | Beyoğlu | `kabatas@meb.gov.tr` | `Sifre123!` | Donor (Ergonomic Desks) |
| **Haydarpaşa MTAL** | Üsküdar | `haydarpasa@meb.gov.tr` | `Sifre123!` | Recipient (Desktop Workstations) |
| **Üsküdar Ahmet Keleşoğlu AL** | Üsküdar | `uskudar@meb.gov.tr` | `Sifre123!` | Partner School |

---

## 🛠️ Local Development & Quickstart

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 20+

### Option A: Complete Docker Compose (Production Stack)
```bash
# Clone the repository
git clone https://github.com/savhascelik/EduShare.agent.git
cd EduShare.agent

# Launch PostgreSQL, FastAPI, and Frontend with Nginx
docker compose -f docker-compose.prod.yml up -d --build
```
Access the application at `http://localhost`.

### Option B: Local Development Run
```bash
# 1. Start PostgreSQL
docker compose up -d postgres

# 2. Run Backend
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# 3. Run Frontend
cd ../frontend
npm install
npm run dev
```

---

## 🧪 Automated Testing Suite

Comprehensive unit and integration tests verify the bilateral handshake protocol, security boundaries, and concurrency handling:

```bash
cd backend
venv\Scripts\python.exe -m pytest tests/test_bilateral_handshake.py -v
```

**Test Coverage Highlights:**
- `test_unauthenticated_user_cannot_approve`: Enforces 401 Unauthorized for anonymous calls.
- `test_donor_cannot_approve_before_recipient_requests`: Prevents premature donor authorization (403 Forbidden).
- `test_recipient_submits_formal_request_reserves_stock`: Validates stock reservation (`reserved_quantity = 4`, physical stock unchanged = 10).
- `test_donor_approves_transfer_decrements_stock_and_creates_transfer`: Verifies physical inventory decrement, ledger recording, and protocol code generation.
- `test_rejection_releases_reserved_stock`: Verifies automatic reservation rollback.

---

## 🚢 Continuous Deployment (CI/CD)

The repository is equipped with an automated GitHub Actions pipeline (`.github/workflows/deploy.yml`):
- Triggers on every `git push` to `main`.
- Securely authenticates with the AWS EC2 production instance via SSH secrets.
- Pulls new code, rebuilds containers, and applies database migrations with zero manual intervention.

---

## 🏆 Hackathon Alignment (Devpost & AWS Judges)

- **Good Neighbor Spirit:** Rather than replacing human educators with autonomous black boxes, EduShare Agent empowers public school principals with real-time peer visibility, eliminating administrative burden while preserving human oversight.
- **Production AWS Bedrock Integration:** Uses `us.amazon.nova-pro-v1:0` with native boto3 runtime for multimodal vision intake and reasoning.
- **Zero Mock Policy:** All schools, equipment inventories, needs, and transfer ledgers persist in a real PostgreSQL relational database.
