import time
import hashlib
import threading
from datetime import datetime
from typing import Optional, Dict, List, Tuple
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

# Configurable Limits
GLOBAL_DAILY_LIMIT = 300      # Hard safety ceiling across entire site
SCHOOL_DAILY_LIMIT = 50       # 50 Bedrock credits per registered school per day
GUEST_DAILY_LIMIT = 5         # 5 trial credits for anonymous visitors per IP
IP_RPM_LIMIT = 5              # Max 5 visual analyses per minute per IP
MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024 # 4MB max upload limit

class SecurityAndQuotaShield:
    """
    Production-grade Billing & Abuse Shield for Amazon Bedrock:
    1. In-memory SHA-256 Image Hash Cache (0 token cost on repeated images)
    2. IP Sliding-Window Rate Limiter (protects against automated script spam)
    3. Per-School Daily Credit Quota (50 calls/school/day)
    4. Global Daily Circuit Breaker (300 calls/day hard ceiling)
    5. Max 4MB Image Size Validation
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._current_day = datetime.utcnow().strftime("%Y-%m-%d")
        self._global_calls_today = 0
        self._school_usage: Dict[str, int] = {}
        self._guest_usage: Dict[str, int] = {}
        self._ip_request_timestamps: Dict[str, List[float]] = {}
        self._image_hash_cache: Dict[str, dict] = {}

    def _reset_if_new_day(self):
        today = datetime.utcnow().strftime("%Y-%m-%d")
        if today != self._current_day:
            logger.info(f"Resetting daily AI quotas for new UTC day: {today}")
            self._current_day = today
            self._global_calls_today = 0
            self._school_usage.clear()
            self._guest_usage.clear()

    def check_file_size(self, file_bytes: bytes):
        """Rejects files larger than 4MB to prevent memory/bandwidth exhaustion."""
        if len(file_bytes) > MAX_IMAGE_SIZE_BYTES:
            size_mb = len(file_bytes) / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"Görsel boyutu ({size_mb:.1f} MB) 4 MB sınırını aşıyor. Lütfen daha küçük bir fotoğraf yükleyin."
            )

    def check_rate_limit(self, client_ip: str):
        """Enforces sliding-window rate limit (max 5 requests / minute per IP)."""
        now = time.time()
        with self._lock:
            timestamps = self._ip_request_timestamps.get(client_ip, [])
            # Filter timestamps within the last 60 seconds
            valid_timestamps = [t for t in timestamps if now - t < 60.0]
            if len(valid_timestamps) >= IP_RPM_LIMIT:
                logger.warning(f"Rate limit exceeded for IP {client_ip} ({len(valid_timestamps)} req/min)")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Çok hızlı istek gönderildi. Lütfen 1 dakika içinde en fazla 5 görsel analizi yapın."
                )
            valid_timestamps.append(now)
            self._ip_request_timestamps[client_ip] = valid_timestamps

    def compute_image_hash(self, image_bytes: bytes) -> str:
        return hashlib.sha256(image_bytes).hexdigest()

    def get_cached_result(self, image_hash: str) -> Optional[dict]:
        with self._lock:
            return self._image_hash_cache.get(image_hash)

    def store_cached_result(self, image_hash: str, result: dict):
        with self._lock:
            # Cache up to 1000 items in memory
            if len(self._image_hash_cache) > 1000:
                self._image_hash_cache.clear()
            self._image_hash_cache[image_hash] = result

    def get_quota_status(self, school_id: Optional[str], client_ip: str) -> dict:
        """Read-only check of current quota status."""
        with self._lock:
            self._reset_if_new_day()
            if school_id:
                used = self._school_usage.get(school_id, 0)
                limit = SCHOOL_DAILY_LIMIT
                remaining = max(0, limit - used)
                user_type = "school"
            else:
                used = self._guest_usage.get(client_ip, 0)
                limit = GUEST_DAILY_LIMIT
                remaining = max(0, limit - used)
                user_type = "guest"

            return {
                "user_type": user_type,
                "remaining": remaining,
                "limit": limit,
                "used": used,
                "global_used": self._global_calls_today,
                "global_limit": GLOBAL_DAILY_LIMIT
            }

    def consume_quota(self, school_id: Optional[str], client_ip: str, is_cache_hit: bool = False) -> Tuple[int, int, str]:
        """
        Deducts 1 AI credit if not a cache hit.
        Returns: (remaining_credits, total_limit, message)
        """
        with self._lock:
            self._reset_if_new_day()

            # Cache hit costs 0 credits
            if is_cache_hit:
                if school_id:
                    used = self._school_usage.get(school_id, 0)
                    limit = SCHOOL_DAILY_LIMIT
                else:
                    used = self._guest_usage.get(client_ip, 0)
                    limit = GUEST_DAILY_LIMIT
                remaining = max(0, limit - used)
                return remaining, limit, "⚡ Akıllı Önbellek (0 Kredi Harcandı)"

            # Check Global Circuit Breaker
            if self._global_calls_today >= GLOBAL_DAILY_LIMIT:
                logger.critical(f"GLOBAL BEDROCK DAILY CEILING REACHED ({GLOBAL_DAILY_LIMIT} calls).")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Sistem genel günlük yapay zeka kotası ({GLOBAL_DAILY_LIMIT}) dolmuştur. Bütçe koruması amacıyla yeni analizler yarına kadar durdurulmuştur."
                )

            # Check and consume school or guest quota
            if school_id:
                used = self._school_usage.get(school_id, 0)
                if used >= SCHOOL_DAILY_LIMIT:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Okulunuzun günlük yapay zeka analiz kotası ({SCHOOL_DAILY_LIMIT}/{SCHOOL_DAILY_LIMIT}) dolmuştur. Kotanız yarın sıfırlanacaktır."
                    )
                self._school_usage[school_id] = used + 1
                self._global_calls_today += 1
                remaining = SCHOOL_DAILY_LIMIT - (used + 1)
                return remaining, SCHOOL_DAILY_LIMIT, f"🤖 Amazon Bedrock Nova Pro ile Analiz Edildi (Kalan: {remaining}/{SCHOOL_DAILY_LIMIT})"
            else:
                used = self._guest_usage.get(client_ip, 0)
                if used >= GUEST_DAILY_LIMIT:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Misafir kullanıcı deneme kotası ({GUEST_DAILY_LIMIT}/{GUEST_DAILY_LIMIT}) dolmuştur. Lütfen okul hesabınızla giriş yapın."
                    )
                self._guest_usage[client_ip] = used + 1
                self._global_calls_today += 1
                remaining = GUEST_DAILY_LIMIT - (used + 1)
                return remaining, GUEST_DAILY_LIMIT, f"🤖 Amazon Bedrock Nova Pro ile Analiz Edildi (Misafir Kalan: {remaining}/{GUEST_DAILY_LIMIT})"

# Global singleton
shield = SecurityAndQuotaShield()
