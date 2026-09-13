import os
import sys
import uuid

# Set up python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, engine, Base
from app.seed import seed_database
from app.models import School, SurplusItem, NeedRequest, AgentTask, Transfer
import asyncio
from app.routes.agent_routes import approve_transfer_task

async def test_inventory_lifecycle_and_concurrency():
    seed_database()
    db = SessionLocal()
    try:
        # Fetch existing schools
        school_a = db.query(School).filter(School.name.like("%Kadıköy%")).first()
        school_b = db.query(School).filter(School.name.like("%Maltepe%")).first()
        school_c = db.query(School).filter(School.name.like("%Haydarpaşa%")).first()

        assert school_a and school_b and school_c, "Sample schools must exist in DB."

        test_run_id = str(uuid.uuid4())[:6]

        # 1. Create Surplus Item with 12 PCs
        surplus = SurplusItem(
            school_id=school_a.id,
            title=f"Test 12 PC Grubu ({test_run_id})",
            raw_text="Laboratuvardan çıkan 12 adet temiz i5 bilgisayar",
            item_category="BİLİŞİM",
            quantity=12,
            allocated_quantity=0,
            condition_rating="GOOD",
            estimated_unit_value_tl=6000.0,
            status="AVAILABLE"
        )
        db.add(surplus)
        db.commit()
        db.refresh(surplus)
        print(f"[OK] [1] Created Surplus: {surplus.title} with quantity={surplus.quantity}")

        # 2. Need A: 2 PCs
        need_a = NeedRequest(
            school_id=school_b.id,
            title=f"2 Adet PC İhtiyacı ({test_run_id})",
            raw_text="Öğretmen odası için 2 adet bilgisayar",
            item_category="BİLİŞİM",
            quantity_needed=2,
            urgency_level="HIGH",
            status="OPEN"
        )
        db.add(need_a)

        # 3. Need B: 5 PCs
        need_b = NeedRequest(
            school_id=school_c.id,
            title=f"5 Adet PC İhtiyacı ({test_run_id})",
            raw_text="Kütüphane için 5 adet bilgisayar",
            item_category="BİLİŞİM",
            quantity_needed=5,
            urgency_level="MEDIUM",
            status="OPEN"
        )
        db.add(need_b)
        db.commit()
        db.refresh(need_a)
        db.refresh(need_b)

        # 4. Create Task 1 for Need A (2 PCs)
        task_1 = AgentTask(
            task_type="LOGISTICS_DISPATCH_PROPOSAL",
            source_id=surplus.id,
            status="AWAITING_HUMAN_APPROVAL",
            match_payload={
                "surplus_item_id": surplus.id,
                "need_id": need_a.id,
                "from_school_id": school_a.id,
                "to_school_id": school_b.id,
                "quantity": 2,
                "estimated_savings_tl": 12000.0,
                "prevented_co2_kg": 95.0,
                "item_title": surplus.title
            }
        )
        # 5. Create Sibling Task 2 for Need B (5 PCs)
        task_2 = AgentTask(
            task_type="LOGISTICS_DISPATCH_PROPOSAL",
            source_id=surplus.id,
            status="AWAITING_HUMAN_APPROVAL",
            match_payload={
                "surplus_item_id": surplus.id,
                "need_id": need_b.id,
                "from_school_id": school_a.id,
                "to_school_id": school_c.id,
                "quantity": 5,
                "estimated_savings_tl": 30000.0,
                "prevented_co2_kg": 240.0,
                "item_title": surplus.title
            }
        )
        db.add(task_1)
        db.add(task_2)
        db.commit()
        db.refresh(task_1)
        db.refresh(task_2)
        print(f"[OK] [2] Created Task 1 (qty 2) and Sibling Task 2 (qty 5)")

        # 6. Approve Task 1 (Transfer 2 units)
        res1 = await approve_transfer_task(task_id=task_1.id, db=db)
        db.refresh(surplus)
        db.refresh(need_a)
        db.refresh(task_2)

        print(f"[OK] [3] Task 1 Approved! Protocol: {res1['transfer']['protocol_code']}")
        print(f"    -> Remaining surplus quantity: {surplus.quantity} (allocated: {surplus.allocated_quantity})")
        print(f"    -> Surplus status: {surplus.status}")
        print(f"    -> Need A status: {need_a.status} (quantity_needed: {need_a.quantity_needed})")
        print(f"    -> Sibling Task 2 status: {task_2.status} (quantity: {task_2.match_payload['quantity']})")

        assert surplus.quantity == 10, f"Expected 10 surplus, got {surplus.quantity}"
        assert surplus.allocated_quantity == 2
        assert surplus.status == "AVAILABLE"
        assert need_a.status == "FULFILLED"
        assert need_a.quantity_needed == 0
        assert task_2.status == "AWAITING_HUMAN_APPROVAL"
        assert res1["transfer"]["protocol_code"].startswith("MEB-TR-2026-")

        # 7. Add Task 3 requesting 8 PCs (10 are available, so both 5 and 8 would exceed 10)
        task_3 = AgentTask(
            task_type="LOGISTICS_DISPATCH_PROPOSAL",
            source_id=surplus.id,
            status="AWAITING_HUMAN_APPROVAL",
            match_payload={
                "surplus_item_id": surplus.id,
                "need_id": need_b.id,
                "from_school_id": school_a.id,
                "to_school_id": school_c.id,
                "quantity": 8,
                "item_title": surplus.title
            }
        )
        db.add(task_3)
        db.commit()
        db.refresh(task_3)

        # 8. Approve Task 2 (5 units transferred) -> Surplus drops to 5.
        # Task 3 requested 8, but only 5 remain! Task 3's quantity should adapt to 5!
        res2 = await approve_transfer_task(task_id=task_2.id, db=db)
        db.refresh(surplus)
        db.refresh(task_3)
        print(f"[OK] [4] Task 2 Approved! Protocol: {res2['transfer']['protocol_code']}")
        print(f"    -> Remaining surplus quantity: {surplus.quantity} (allocated: {surplus.allocated_quantity})")
        print(f"    -> Task 3 adjusted quantity: {task_3.match_payload['quantity']} (stock_adjusted: {task_3.match_payload.get('stock_adjusted')})")

        assert surplus.quantity == 5
        assert surplus.allocated_quantity == 7
        assert surplus.status == "AVAILABLE"
        assert task_3.match_payload["quantity"] == 5
        assert task_3.match_payload["stock_adjusted"] is True

        # 9. Now approve Task 3 (the remaining 5 units)
        # Sibling task 4 waiting for 3 units should now be SUPERSEDED because stock becomes 0!
        task_4 = AgentTask(
            task_type="LOGISTICS_DISPATCH_PROPOSAL",
            source_id=surplus.id,
            status="AWAITING_HUMAN_APPROVAL",
            match_payload={
                "surplus_item_id": surplus.id,
                "need_id": need_b.id,
                "from_school_id": school_a.id,
                "to_school_id": school_c.id,
                "quantity": 3,
                "item_title": surplus.title
            }
        )
        db.add(task_4)
        db.commit()
        db.refresh(task_4)

        res3 = await approve_transfer_task(task_id=task_3.id, db=db)
        db.refresh(surplus)
        db.refresh(task_4)
        print(f"[OK] [5] Task 3 Approved! Protocol: {res3['transfer']['protocol_code']}")
        print(f"    -> Final surplus quantity: {surplus.quantity} (allocated: {surplus.allocated_quantity})")
        print(f"    -> Final surplus status: {surplus.status}")
        print(f"    -> Task 4 status (depleted stock): {task_4.status} (reason: {task_4.match_payload.get('superseded_reason')})")

        assert surplus.quantity == 0
        assert surplus.allocated_quantity == 12
        assert surplus.status == "TRANSFERRED"
        assert task_4.status == "SUPERSEDED"
        assert task_4.match_payload["superseded_reason"] == "STOCK_DEPLETED"

        print("\n[SUCCESS] ALL TESTS PASSED: Dynamic partial stock, auto-supersede, protocol generation, and bilateral state tracking fully verified!\n")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_inventory_lifecycle_and_concurrency())
