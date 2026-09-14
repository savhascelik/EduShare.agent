import asyncio
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models import School, SurplusItem, NeedRequest, AgentTask
from app.worker import run_autonomous_inventory_sweep, process_single_task, ACTIVE_TASK_STATUSES
from app.agent import create_hitl_approval_card
import json

async def test_duplicate_prevention():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("=== TEST: Duplicate Prevention & Sweeper Safeguards ===")
        
        # 1. Verify ACTIVE_TASK_STATUSES contains bilateral statuses
        assert "PENDING_RECIPIENT_REQUEST" in ACTIVE_TASK_STATUSES
        assert "AWAITING_DONOR_APPROVAL" in ACTIVE_TASK_STATUSES
        assert "AWAITING_HUMAN_APPROVAL" in ACTIVE_TASK_STATUSES
        print("[PASS] ACTIVE_TASK_STATUSES includes all active proposal statuses.")

        # 2. Setup mock schools
        school_a = db.query(School).first()
        school_b = db.query(School).offset(1).first()
        assert school_a and school_b, "Need at least 2 schools in db"

        # Create test surplus
        surplus = SurplusItem(
            school_id=school_a.id,
            title="Safeguard Test Mikroskop",
            raw_text="Test",
            item_category="Fen Laboratuvarı",
            quantity=5,
            allocated_quantity=0,
            reserved_quantity=0,
            status="AVAILABLE",
            estimated_unit_value_tl=1500.0
        )
        db.add(surplus)
        db.commit()
        db.refresh(surplus)

        # Create active task with status PENDING_RECIPIENT_REQUEST
        task_1 = AgentTask(
            task_type="MATCH_SURPLUS",
            source_id=surplus.id,
            status="PENDING_RECIPIENT_REQUEST",
            match_payload={
                "surplus_item_id": surplus.id,
                "from_school_id": school_a.id,
                "to_school_id": school_b.id,
                "item_title": surplus.title,
                "quantity": 1
            }
        )
        db.add(task_1)
        db.commit()
        db.refresh(task_1)

        # 3. Create a matching open need
        need = NeedRequest(
            school_id=school_b.id,
            title="Mikroskop İhtiyacı",
            raw_text="Laboratuvar için",
            item_category="Fen Laboratuvarı",
            quantity_needed=2,
            urgency_level="HIGH",
            status="OPEN"
        )
        db.add(need)
        db.commit()
        db.refresh(need)

        # 4. Run autonomous inventory sweep - it should NOT create a new task for this surplus!
        tasks_before = db.query(AgentTask).filter(AgentTask.source_id == surplus.id).count()
        await run_autonomous_inventory_sweep()
        tasks_after = db.query(AgentTask).filter(AgentTask.source_id == surplus.id).count()
        assert tasks_before == tasks_after, f"Sweeper created duplicate task! Before: {tasks_before}, After: {tasks_after}"
        print("[PASS] Sweeper correctly ignored surplus item with active PENDING_RECIPIENT_REQUEST proposal.")

        # 5. Test process_single_task duplicate safeguard
        task_dup = AgentTask(
            task_type="MATCH_SURPLUS",
            source_id=surplus.id,
            status="PENDING"
        )
        db.add(task_dup)
        db.commit()
        db.refresh(task_dup)

        await process_single_task(task_dup.id)
        db.refresh(task_dup)
        assert task_dup.status == "SUPERSEDED", f"Expected duplicate task to be SUPERSEDED, got {task_dup.status}"
        print("[PASS] process_single_task immediately superseded duplicate task for active source_id.")

        # 6. Test create_hitl_approval_card tool safeguard
        task_tool = AgentTask(
            task_type="MATCH_SURPLUS",
            source_id="dummy_id",
            status="PROCESSING"
        )
        db.add(task_tool)
        db.commit()
        db.refresh(task_tool)

        card_res = create_hitl_approval_card(
            task_id=task_tool.id,
            from_school_id=school_a.id,
            to_school_id=school_b.id,
            surplus_item_id=surplus.id,
            need_id=need.id,
            quantity=1,
            savings_tl=1500.0,
            co2_kg=50.0,
            distance_km=5.0,
            reasoning="Test"
        )
        card_data = json.loads(card_res)
        assert card_data["status"] == "SUPERSEDED"
        db.refresh(task_tool)
        assert task_tool.status == "SUPERSEDED"
        print("[PASS] create_hitl_approval_card tool rejected duplicate proposal for surplus item.")

        print("\nALL SAFEGUARD TESTS PASSED 100%!")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_duplicate_prevention())
