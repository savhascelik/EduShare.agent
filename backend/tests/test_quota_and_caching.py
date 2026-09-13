import io
import sys
import os
from fastapi.testclient import TestClient
from fastapi import HTTPException

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from app.security_guard import SecurityAndQuotaShield
from app.database import SessionLocal
from app.models import School
from app.auth import create_access_token

client = TestClient(app)

def test_file_size_enforcement():
    print("[1/6] Testing 4MB file size enforcement...")
    shield = SecurityAndQuotaShield()
    
    # 3MB should pass
    small_bytes = b"0" * (3 * 1024 * 1024)
    shield.check_file_size(small_bytes)

    # 4.5MB should raise HTTPException 413
    large_bytes = b"0" * (int(4.5 * 1024 * 1024))
    caught = False
    try:
        shield.check_file_size(large_bytes)
    except HTTPException as exc:
        caught = True
        assert exc.status_code == 413
        assert "4 MB" in exc.detail
    assert caught, "Expected 413 HTTPException for file > 4MB"
    print("  [OK] Passed: Files > 4MB properly rejected with HTTP 413")

def test_sliding_window_rate_limiter():
    print("[2/6] Testing sliding-window IP rate limiter...")
    shield = SecurityAndQuotaShield()
    test_ip = "192.168.1.100"

    # First 5 calls in quick succession should pass
    for i in range(5):
        shield.check_rate_limit(test_ip)

    # 6th call should be blocked with 429
    caught = False
    try:
        shield.check_rate_limit(test_ip)
    except HTTPException as exc:
        caught = True
        assert exc.status_code == 429
        assert "Çok hızlı istek" in exc.detail
    assert caught, "Expected 429 HTTPException for 6th request within 1 minute"

    # A different IP should NOT be affected
    other_ip = "192.168.1.101"
    shield.check_rate_limit(other_ip)
    print("  [OK] Passed: IP rate limiting restricts spam to 5 rpm")

def test_sha256_cache_and_zero_credit_cost():
    print("[3/6] Testing SHA-256 caching and 0-credit deduction...")
    shield = SecurityAndQuotaShield()
    fake_img = b"fake_microscope_image_bytes_123"
    img_hash = shield.compute_image_hash(fake_img)

    # Initially not cached
    assert shield.get_cached_result(img_hash) is None

    # First analysis consumes 1 credit
    school_id = "sch_test_quota_1"
    rem1, lim1, msg1 = shield.consume_quota(school_id, "127.0.0.1", is_cache_hit=False)
    assert lim1 == 50
    assert rem1 == 49
    assert "Nova Pro" in msg1

    # Store mock result in cache
    mock_result = {
        "title": "Laboratuvar Mikroskobu",
        "category": "Fen & Laboratuvar",
        "estimated_quantity": 2,
        "condition_rating": "İyi",
        "estimated_unit_value_tl": 4500.0,
        "notes": "Lensleri temiz, çalışır durumda."
    }
    shield.store_cached_result(img_hash, mock_result)

    # Cache hit check
    cached = shield.get_cached_result(img_hash)
    assert cached is not None
    assert cached["title"] == "Laboratuvar Mikroskobu"

    # Second request with same image consumes 0 credits
    rem2, lim2, msg2 = shield.consume_quota(school_id, "127.0.0.1", is_cache_hit=True)
    assert rem2 == 49 # No credit deducted!
    assert "0 Kredi Harcandı" in msg2
    print("  [OK] Passed: Identical image recognized via SHA-256 with 0 credit deduction")

def test_school_quota_exhaustion():
    print("[4/6] Testing school daily quota exhaustion (50 credits)...")
    shield = SecurityAndQuotaShield()
    school_id = "sch_exhaustion_test"

    # Consume all 50 credits
    for _ in range(50):
        shield.consume_quota(school_id, "127.0.0.1", is_cache_hit=False)

    # 51st call should raise 429
    caught = False
    try:
        shield.consume_quota(school_id, "127.0.0.1", is_cache_hit=False)
    except HTTPException as exc:
        caught = True
        assert exc.status_code == 429
        assert "günlük yapay zeka analiz kotası" in exc.detail
    assert caught, "Expected 429 HTTPException when school quota exhausted"
    print("  [OK] Passed: School quota blocks 51st call with HTTP 429")

def test_global_circuit_breaker():
    print("[5/6] Testing global daily circuit breaker (300 ceiling)...")
    shield = SecurityAndQuotaShield()
    # Artificially set global calls to 300
    shield._global_calls_today = 300

    caught = False
    try:
        shield.consume_quota("any_school", "127.0.0.1", is_cache_hit=False)
    except HTTPException as exc:
        caught = True
        assert exc.status_code == 429
        assert "Sistem genel günlük yapay zeka kotası" in exc.detail
    assert caught, "Expected 429 HTTPException when global ceiling is reached"
    print("  [OK] Passed: Global hard cap triggers circuit breaker at 300 calls")

def test_quota_endpoint_api():
    print("[6/6] Testing /api/surplus/quota endpoint for Guest and School...")
    db = SessionLocal()
    try:
        school = db.query(School).first()
        assert school is not None

        token = create_access_token({"sub": school.id})
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Guest request
        res_guest = client.get("/api/surplus/quota")
        assert res_guest.status_code == 200
        data_guest = res_guest.json()
        assert data_guest["user_type"] == "guest"
        assert data_guest["limit"] == 5

        # 2. Authenticated school request
        res_auth = client.get("/api/surplus/quota", headers=headers)
        assert res_auth.status_code == 200
        data_auth = res_auth.json()
        assert data_auth["user_type"] == "school"
        assert data_auth["limit"] == 50
        assert data_auth["remaining"] <= 50
        print(f"  [OK] Passed: Quota API returns valid data (School: {data_auth['remaining']}/{data_auth['limit']})")
    finally:
        db.close()

if __name__ == "__main__":
    print("Running EduShare Shield & Quota Test Suite...")
    test_file_size_enforcement()
    test_sliding_window_rate_limiter()
    test_sha256_cache_and_zero_credit_cost()
    test_school_quota_exhaustion()
    test_global_circuit_breaker()
    test_quota_endpoint_api()
    print("\nALL 6 SHIELD & QUOTA TESTS PASSED WITH 100% SUCCESS!")
