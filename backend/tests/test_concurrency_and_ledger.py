import os
import sys
import uuid
import asyncio
from fastapi import HTTPException

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.seed import seed_database
from app.models import School, SurplusItem, NeedRequest, AgentTask, StockLedger, Transfer
from app.routes.agent_routes import approve_transfer_task, withdraw_proposal

async def run_all_tests():
    print("============================================================")
    print("RUNNING CONCURRENCY, LEDGER & PEER PROPOSAL VERIFICATION")
    print("============================================================")
    
    seed_database()
    db = SessionLocal()

    try:
        # Fetch existing schools
        school_a = db.query(School).filter(School.name.like("%Kadıköy%")).first()
        school_b = db.query(School).filter(School.name.like("%Maltepe%")).first()
        school_c = db.query(School).filter(School.name.like("%Haydarpaşa%")).first()

        assert school_a and school_b and school_c, "Sample schools must exist in DB"

        test_run_id = str(uuid.uuid4())[:6]

        # ---------------------------------------------------------
        # TEST 1: Stock Ledger Audit Trail & Accurate Math
        # ---------------------------------------------------------
        print("\n--- [TEST 1: Stock Ledger Audit Trail] ---")
        surplus = SurplusItem(
            school_id=school_a.id,
            title=f"Test Stok Eşyası ({test_run_id})",
            raw_text="Test stok eşyası 10 adet",
            item_category="BİLİŞİM",
            quantity=10,
            allocated_quantity=0,
            condition_rating="EXCELLENT",
            estimated_unit_value_tl=5000.0,
            status="AVAILABLE"
        )
        db.add(surplus)
        db.commit()
        db.refresh(surplus)

        # Initial ledger entry
        initial_ledger = StockLedger(
            surplus_item_id=surplus.id,
            school_id=school_a.id,
            movement_type="INITIAL_REGISTRATION",
            quantity_delta=10,
            balance_after=10,
            protocol_code=f"INIT-{surplus.id}",
            note="Initial registration"
        )
        db.add(initial_ledger)
        db.commit()

        # Verify initial ledger
        ledgers = db.query(StockLedger).filter(StockLedger.surplus_item_id == surplus.id).all()
        assert len(ledgers) == 1
        assert ledgers[0].movement_type == "INITIAL_REGISTRATION"
        assert ledgers[0].balance_after == 10
        print("[PASS] Initial StockLedger created with balance=10")

        # ---------------------------------------------------------
        # TEST 2: Crossing Proposals Auto-Merging
        # (AI proposal + School Peer Request for the same item)
        # ---------------------------------------------------------
        print("\n--- [TEST 2: Crossing Proposals Auto-Merging] ---")
        need = NeedRequest(
            school_id=school_b.id,
            title=f"Test İhtiyaç ({test_run_id})",
            raw_text="Bilgisayar ihtiyacı 3 adet",
            item_category="BİLİŞİM",
            quantity_needed=3,
            urgency_level="HIGH",
            status="OPEN"
        )
        db.add(need)
        db.commit()
        db.refresh(need)

        # 1. AI generated proposal: School A -> School B (3 units)
        ai_task = AgentTask(
            task_type="LOGISTICS_DISPATCH_PROPOSAL",
            source_id=surplus.id,
            status="AWAITING_HUMAN_APPROVAL",
            initiator_type="AI",
            initiator_school_id=None,
            target_school_id=school_b.id,
            match_payload={
                "surplus_item_id": surplus.id,
                "need_id": need.id,
                "from_school_id": school_a.id,
                "to_school_id": school_b.id,
                "quantity": 3,
                "estimated_savings_tl": 15000.0,
                "prevented_co2_kg": 120.0,
                "item_title": surplus.title
            }
        )
        db.add(ai_task)

        # 2. Peer proposal directly initiated by School B -> School A for the same surplus
        peer_task = AgentTask(
            task_type="LOGISTICS_DISPATCH_PROPOSAL",
            source_id=surplus.id,
            status="AWAITING_HUMAN_APPROVAL",
            initiator_type="SCHOOL_RECIPIENT",
            initiator_school_id=school_b.id,
            target_school_id=school_a.id,
            match_payload={
                "surplus_item_id": surplus.id,
                "need_id": need.id,
                "from_school_id": school_a.id,
                "to_school_id": school_b.id,
                "quantity": 3,
                "estimated_savings_tl": 15000.0,
                "prevented_co2_kg": 120.0,
                "item_title": surplus.title
            }
        )
        db.add(peer_task)
        db.commit()
        db.refresh(ai_task)
        db.refresh(peer_task)

        # Approve AI Task
        approval_res = await approve_transfer_task(task_id=ai_task.id, db=db)
        assert approval_res["status"] == "SUCCESS"
        db.refresh(ai_task)
        db.refresh(peer_task)
        db.refresh(surplus)

        assert ai_task.status == "COMPLETED"
        # Peer task must be auto-merged into ai_task to prevent double-spending!
        assert peer_task.status == "MERGED", f"Expected MERGED, got {peer_task.status}"
        assert peer_task.match_payload.get("merged_into_task_id") == ai_task.id
        # Stock deduction must happen only ONCE: 10 - 3 = 7
        assert surplus.quantity == 7, f"Expected surplus quantity 7, got {surplus.quantity}"
        print(f"[PASS] Crossing proposal merged cleanly. Stock correctly deducted once to {surplus.quantity}.")

        # ---------------------------------------------------------
        # TEST 3: Proposal Withdrawal
        # ---------------------------------------------------------
        print("\n--- [TEST 3: Proposal Withdrawal] ---")
        withdraw_task = AgentTask(
            task_type="LOGISTICS_DISPATCH_PROPOSAL",
            source_id=surplus.id,
            status="AWAITING_HUMAN_APPROVAL",
            initiator_type="SCHOOL_RECIPIENT",
            initiator_school_id=school_c.id,
            target_school_id=school_a.id,
            match_payload={
                "surplus_item_id": surplus.id,
                "from_school_id": school_a.id,
                "to_school_id": school_c.id,
                "quantity": 2,
                "item_title": surplus.title
            }
        )
        db.add(withdraw_task)
        db.commit()
        db.refresh(withdraw_task)

        # Withdraw
        w_res = await withdraw_proposal(task_id=withdraw_task.id, current_school=school_c, db=db)
        assert w_res["status"] == "SUCCESS"
        db.refresh(withdraw_task)
        assert withdraw_task.status == "WITHDRAWN"
        print("[PASS] Task successfully withdrawn and status set to WITHDRAWN.")

        # ---------------------------------------------------------
        # TEST 4: Race Condition & Concurrency Stock Exhaustion
        # ---------------------------------------------------------
        print("\n--- [TEST 4: Race Condition Stock Locking & Depletion] ---")
        # Current surplus stock is 7.
        # Create Task A requesting 7.
        # Create Task B requesting 5.
        task_a = AgentTask(
            task_type="LOGISTICS_DISPATCH_PROPOSAL",
            source_id=surplus.id,
            status="AWAITING_HUMAN_APPROVAL",
            match_payload={
                "surplus_item_id": surplus.id,
                "from_school_id": school_a.id,
                "to_school_id": school_b.id,
                "quantity": 7,
                "item_title": surplus.title
            }
        )
        task_b = AgentTask(
            task_type="LOGISTICS_DISPATCH_PROPOSAL",
            source_id=surplus.id,
            status="AWAITING_HUMAN_APPROVAL",
            match_payload={
                "surplus_item_id": surplus.id,
                "from_school_id": school_a.id,
                "to_school_id": school_c.id,
                "quantity": 5,
                "item_title": surplus.title
            }
        )
        db.add(task_a)
        db.add(task_b)
        db.commit()
        db.refresh(task_a)
        db.refresh(task_b)

        # 1. Approve Task A -> takes all remaining 7 units
        res_a = await approve_transfer_task(task_id=task_a.id, db=db)
        assert res_a["status"] == "SUCCESS"
        db.refresh(surplus)
        assert surplus.quantity == 0
        assert surplus.status == "TRANSFERRED"
        print("[PASS] Task A approved, surplus stock reduced to 0 (TRANSFERRED).")

        # 2a. Check Proactive Auto-Supersede: Task A's approval automatically marked Task B as SUPERSEDED!
        db.refresh(task_b)
        assert task_b.status == "SUPERSEDED", f"Expected Task B to be auto-superseded, got {task_b.status}"
        print("[PASS] Proactive Auto-Supersede: Task B was automatically archived with STOCK_DEPLETED.")

        # 2b. Test Reactive Race-Condition Lock:
        # Simulate simultaneous in-flight race condition where Task B was already dispatched as AWAITING_HUMAN_APPROVAL
        task_b.status = "AWAITING_HUMAN_APPROVAL"
        db.commit()
        db.refresh(task_b)

        conflict_caught = False
        try:
            await approve_transfer_task(task_id=task_b.id, db=db)
        except HTTPException as exc:
            if exc.status_code == 409:
                conflict_caught = True
                print(f"[PASS] Concurrency lock correctly caught stock depletion: HTTP 409 {exc.detail}")

        assert conflict_caught, "Must raise HTTP 409 Conflict when stock is depleted"
        db.refresh(task_b)
        assert task_b.status == "SUPERSEDED", f"Expected SUPERSEDED, got {task_b.status}"
        assert surplus.quantity == 0, "Surplus quantity must never drop below 0 (no negative inventory)!"

        # ---------------------------------------------------------
        # TEST 5: Complete Ledger Verification
        # ---------------------------------------------------------
        print("\n--- [TEST 5: Final Ledger Math Audit] ---")
        all_ledgers = db.query(StockLedger).filter(StockLedger.surplus_item_id == surplus.id).order_by(StockLedger.created_at.asc()).all()
        print(f"Total ledger records: {len(all_ledgers)}")
        for entry in all_ledgers:
            print(f"  - [{entry.movement_type}] delta={entry.quantity_delta:+d} -> balance={entry.balance_after} | protocol={entry.protocol_code}")

        # Check chronological balances: +10 -> -3 (bal 7) -> -7 (bal 0)
        assert all_ledgers[0].movement_type == "INITIAL_REGISTRATION"
        assert all_ledgers[0].balance_after == 10
        assert all_ledgers[1].movement_type == "TRANSFER_OUT"
        assert all_ledgers[1].quantity_delta == -3
        assert all_ledgers[1].balance_after == 7
        assert all_ledgers[2].movement_type == "TRANSFER_OUT"
        assert all_ledgers[2].quantity_delta == -7
        assert all_ledgers[2].balance_after == 0
        print("[PASS] Audit trail and exact inventory math verified 100%!")

        print("\n============================================================")
        print("ALL CONCURRENCY, LEDGER & PEER PROPOSAL TESTS PASSED! [100%]")
        print("============================================================")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_all_tests())
