import sys
import os
import uuid
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from app.database import SessionLocal
from app.models import School, SurplusItem, NeedRequest, AgentTask, StockLedger, Transfer
from app.auth import create_access_token

client = TestClient(app)

def test_complete_bilateral_handshake():
    db = SessionLocal()
    try:
        # 1. Fetch or create test schools
        donor = db.query(School).filter(School.id == "sch_kadikoy_al").first()
        recipient = db.query(School).filter(School.id == "sch_maltepe_fl").first()
        assert donor is not None
        assert recipient is not None

        donor_token = create_access_token({"sub": donor.id})
        recipient_token = create_access_token({"sub": recipient.id})
        donor_headers = {"Authorization": f"Bearer {donor_token}"}
        recipient_headers = {"Authorization": f"Bearer {recipient_token}"}

        # 2. Create test surplus item
        surplus = SurplusItem(
            id=str(uuid.uuid4()),
            school_id=donor.id,
            title="Bilateral Test Mikroskop Seti",
            raw_text="Laboratuvarda atıl bekleyen 10 adet mikroskop",
            item_category="science",
            quantity=10,
            reserved_quantity=0,
            estimated_unit_value_tl=5000.0,
            condition_rating="İyi"
        )
        db.add(surplus)

        # 3. Create test need request
        need = NeedRequest(
            id=str(uuid.uuid4()),
            school_id=recipient.id,
            title="Biyoloji Laboratuvarı Mikroskop İhtiyacı",
            raw_text="Öğrenciler için 4 adet mikroskoba acil ihtiyaç var",
            item_category="science",
            quantity_needed=4,
            urgency_level="high",
            status="OPEN"
        )
        db.add(need)
        db.commit()

        # 4. Create AgentTask in PENDING_RECIPIENT_REQUEST stage
        task_id = str(uuid.uuid4())
        card_payload = {
            "from_school_id": donor.id,
            "from_school_name": donor.name,
            "from_district": donor.district,
            "to_school_id": recipient.id,
            "to_school_name": recipient.name,
            "to_district": recipient.district,
            "surplus_item_id": surplus.id,
            "need_id": need.id,
            "item_title": "Bilateral Test Mikroskop Seti",
            "quantity": 4,
            "distance_km": 12.5,
            "estimated_savings_tl": 20000.0,
            "prevented_co2_kg": 150.0,
            "reasoning": "En yakın ve uygun biyoloji laboratuvar mikroskop eşleşmesi.",
            "approval_stage": "RECIPIENT_REQUEST",
            "current_pending_school_id": recipient.id
        }
        task = AgentTask(
            id=task_id,
            task_type="MATCH_SURPLUS",
            source_id=surplus.id,
            target_school_id=recipient.id,
            initiator_type="AI",
            status="PENDING_RECIPIENT_REQUEST",
            match_payload=card_payload
        )
        db.add(task)
        db.commit()

        # 5. Security Check: Anonymous access to task approval should be rejected (401)
        anon_resp = client.post(f"/api/agent/approve/{task_id}")
        assert anon_resp.status_code == 401, f"Expected 401 for anonymous approve, got {anon_resp.status_code}"

        # 6. Role Check: Donor cannot approve before recipient requests it (403)
        donor_premature = client.post(f"/api/agent/approve/{task_id}", headers=donor_headers)
        print("DONOR PREMATURE DETAIL:", donor_premature.status_code, donor_premature.json())
        assert donor_premature.status_code == 403

        # 7. Phase 1: Recipient approves (submits formal request)
        recip_approve = client.post(f"/api/agent/approve/{task_id}", headers=recipient_headers)
        assert recip_approve.status_code == 200, f"Expected 200 for recipient request, got {recip_approve.status_code}: {recip_approve.text}"
        data1 = recip_approve.json()
        assert data1["stage"] == "DONOR_APPROVAL"
        assert data1["task"]["status"] == "AWAITING_DONOR_APPROVAL"

        # Check reservation in DB
        db.refresh(surplus)
        db.refresh(task)
        assert surplus.reserved_quantity == 4, f"Expected reserved 4, got {surplus.reserved_quantity}"
        assert surplus.quantity == 10, f"Physical stock should still be 10, got {surplus.quantity}"
        assert task.status == "AWAITING_DONOR_APPROVAL"

        # 8. Role Check: Recipient cannot approve again while waiting for donor dispatch (403)
        recip_premature = client.post(f"/api/agent/approve/{task_id}", headers=recipient_headers)
        assert recip_premature.status_code == 403, f"Expected 403 when recipient tries to approve donor stage, got {recip_premature.status_code}"

        # 9. Phase 2: Donor approves (authorizes dispatch and MEB transfer protocol)
        donor_approve = client.post(f"/api/agent/approve/{task_id}", headers=donor_headers)
        assert donor_approve.status_code == 200, f"Expected 200 for donor approval, got {donor_approve.status_code}: {donor_approve.text}"
        data2 = donor_approve.json()
        assert data2["stage"] == "COMPLETED"
        assert "protocol_code" in data2["transfer"]
        assert data2["transfer"]["protocol_code"].startswith("MEB-TR-2026-")

        # 10. Check stock deduction and ledger in DB
        db.refresh(surplus)
        db.refresh(need)
        db.refresh(task)
        assert task.status == "COMPLETED"
        assert surplus.quantity == 6, f"Expected physical quantity 6 (10 - 4), got {surplus.quantity}"
        assert surplus.reserved_quantity == 0, f"Expected reserved quantity 0, got {surplus.reserved_quantity}"
        assert need.status == "FULFILLED", f"Expected need FULFILLED, got {need.status}"

        ledger = db.query(StockLedger).filter(StockLedger.surplus_item_id == surplus.id).first()
        assert ledger is not None
        assert ledger.movement_type == "TRANSFER_OUT"
        assert ledger.quantity_delta == -4
        assert ledger.balance_after == 6

        transfer = db.query(Transfer).filter(Transfer.protocol_code == data2["transfer"]["protocol_code"]).first()
        assert transfer is not None
        assert transfer.status == "APPROVED"
        assert transfer.quantity == 4

        print("\nAll Bilateral Handshake assertions passed successfully!")

        # 11. Test Rejection during Phase 2 releases reserved stock
        surplus2 = SurplusItem(
            id=str(uuid.uuid4()),
            school_id=donor.id,
            title="Bilateral Test Bilgisayar",
            raw_text="5 adet bilgisayar",
            item_category="it",
            quantity=5,
            reserved_quantity=0,
            estimated_unit_value_tl=10000.0,
            condition_rating="İyi"
        )
        db.add(surplus2)
        task_id2 = str(uuid.uuid4())
        card_payload2 = {
            "from_school_id": donor.id,
            "from_school_name": donor.name,
            "to_school_id": recipient.id,
            "to_school_name": recipient.name,
            "surplus_item_id": surplus2.id,
            "quantity": 2,
            "approval_stage": "RECIPIENT_REQUEST"
        }
        task2 = AgentTask(
            id=task_id2,
            task_type="MATCH_SURPLUS",
            source_id=surplus2.id,
            target_school_id=recipient.id,
            status="PENDING_RECIPIENT_REQUEST",
            match_payload=card_payload2
        )
        db.add(task2)
        db.commit()

        # Recipient requests -> reserves 2
        r1 = client.post(f"/api/agent/approve/{task_id2}", headers=recipient_headers)
        assert r1.status_code == 200
        db.refresh(surplus2)
        assert surplus2.reserved_quantity == 2

        # Donor rejects in Phase 2 -> releases reservation
        r2 = client.post(f"/api/agent/reject/{task_id2}", headers=donor_headers, json={"reason": "Cihazlar başka bir atölyeye tahsis edildi."})
        assert r2.status_code == 200
        db.refresh(surplus2)
        assert surplus2.reserved_quantity == 0
        assert surplus2.quantity == 5

        print("Phase 2 Rejection and Reservation Release passed successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    test_complete_bilateral_handshake()
