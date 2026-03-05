"""
Rotating API Key Manager for Gemini.

Reads comma-separated keys from GOOGLE_API_KEYS (or falls back to single
GOOGLE_API_KEY).  When a 429 / quota error is hit, the caller invokes
`mark_exhausted()` and the manager rotates to the next available key.

Both the old SDK (google.generativeai) and the new SDK (google.genai) are
supported — callers get the current key string and build their own
client/model as needed.
"""

import threading
import time
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class KeyManager:
    def __init__(self):
        # Parse keys: prefer GOOGLE_API_KEYS (comma-separated), fall back to GOOGLE_API_KEY
        raw_keys = getattr(settings, "GOOGLE_API_KEYS", "") or ""
        if raw_keys.strip():
            self._keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        elif settings.GOOGLE_API_KEY:
            self._keys = [settings.GOOGLE_API_KEY.strip()]
        else:
            self._keys = []

        # Track exhausted keys: key_index -> timestamp when it was marked exhausted
        self._exhausted: dict[int, float] = {}
        # Permanently invalid keys (expired, revoked, etc.)
        self._invalid: set[int] = set()
        # Cooldown period: how long (seconds) before retrying an exhausted key
        self._cooldown = 65  # slightly over 1 min (Google's per-minute window)
        self._current_index = 0
        self._lock = threading.RLock()

        if self._keys:
            logger.info(f"🔑 KeyManager initialised with {len(self._keys)} API key(s)")
        else:
            logger.warning("🔑 KeyManager: No API keys configured!")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def has_keys(self) -> bool:
        return len(self._keys) > 0

    @property
    def total_keys(self) -> int:
        return len(self._keys)

    def get_key(self) -> str | None:
        """Return the current active key, or None if all keys exhausted."""
        if not self._keys:
            return None

        with self._lock:
            self._refresh_exhausted()
            # Try to find a non-exhausted key starting from current index
            for _ in range(len(self._keys)):
                if self._current_index not in self._exhausted and self._current_index not in self._invalid:
                    key = self._keys[self._current_index]
                    return key
                self._current_index = (self._current_index + 1) % len(self._keys)

            # All keys exhausted
            logger.warning("🔑 All API keys are exhausted! Waiting for cooldown...")
            return None

    def mark_exhausted(self, key: str):
        """Mark a key as exhausted and rotate to the next one."""
        with self._lock:
            try:
                idx = self._keys.index(key)
            except ValueError:
                return
            self._exhausted[idx] = time.time()
            masked = f"{key[:8]}...{key[-4:]}"
            logger.warning(f"🔑 Key {masked} exhausted (key {idx+1}/{len(self._keys)}). Rotating...")
            # Move to next key
            self._current_index = (idx + 1) % len(self._keys)
            self._refresh_exhausted()
            next_key = self.get_key()
            if next_key:
                next_masked = f"{next_key[:8]}...{next_key[-4:]}"
                logger.info(f"🔑 Switched to key {next_masked}")
            else:
                logger.warning("🔑 No more available keys after rotation.")

    def mark_invalid(self, key: str):
        """Mark a key as permanently invalid and rotate to the next one."""
        with self._lock:
            try:
                idx = self._keys.index(key)
            except ValueError:
                return
            self._invalid.add(idx)
            masked = f"{key[:8]}...{key[-4:]}"
            logger.error(f"🔑 Key {masked} marked invalid/expired and removed from rotation.")
            self._current_index = (idx + 1) % len(self._keys)
            next_key = self.get_key()
            if next_key:
                next_masked = f"{next_key[:8]}...{next_key[-4:]}"
                logger.info(f"🔑 Switched to key {next_masked}")
            else:
                logger.warning("🔑 No more valid API keys available.")

    def _refresh_exhausted(self):
        """Remove keys from the exhausted set if cooldown has elapsed."""
        now = time.time()
        expired = [idx for idx, ts in self._exhausted.items() if now - ts > self._cooldown]
        for idx in expired:
            del self._exhausted[idx]
            masked = f"{self._keys[idx][:8]}...{self._keys[idx][-4:]}"
            logger.info(f"🔑 Key {masked} cooldown expired, available again.")

    def is_quota_error(self, error) -> bool:
        """Check if an exception is a 429 / quota error."""
        err_str = str(error)
        return "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()

    def is_invalid_key_error(self, error) -> bool:
        """Check if an exception is due to invalid/expired credentials."""
        err_str = str(error).lower()
        markers = [
            "api_key_invalid",
            "api key expired",
            "invalid api key",
            "api key not valid",
            "permission_denied",
            "401",
            "403",
        ]
        return any(marker in err_str for marker in markers)


# Singleton
key_manager = KeyManager()
