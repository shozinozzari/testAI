import asyncio
import hashlib
import logging
import os
import random
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


CLIPS_DIR = Path(__file__).resolve().parents[2] / "static" / "clips"
CLIPS_DIR.mkdir(parents=True, exist_ok=True)


class StockFootageService:
    """
    Download one stock clip per scene using scene `stock_query`.
    Primary source: Pexels, fallback: Pixabay.
    """

    def __init__(self) -> None:
        self.pexels_key = settings.PEXELS_API_KEY
        self.pixabay_key = settings.PIXABAY_API_KEY

    # Terms that indicate a clip contains baked-in UI overlays we don't want
    _BLACKLISTED_TAGS: set[str] = {
        "subscribe", "subscription", "subscriber",
        "youtube", "bell icon", "notification bell",
        "like button", "like and subscribe", "smash the like",
        "end screen", "end card", "outro",
        "channel", "follow me", "follow us",
        "click here", "link in bio", "link below",
        "social media button", "share button",
        "thumbs up", "notification", "alert icon",
    }

    @classmethod
    def _is_blacklisted(cls, *text_fields: str) -> bool:
        """Return True if any of the text fields contain a blacklisted term."""
        combined = " ".join(t.lower() for t in text_fields if t)
        return any(tag in combined for tag in cls._BLACKLISTED_TAGS)

    async def download_clips_for_visual_plan(
        self, visual_plan: list[dict[str, Any]], campaign_id: str
    ) -> list[dict[str, Any]]:
        if not isinstance(visual_plan, list) or not visual_plan:
            return []

        if not self.pexels_key and not self.pixabay_key:
            logger.warning("No stock footage API keys configured. Skipping clip download.")
            return [self._with_clip_url(scene, "") for scene in visual_plan]

        campaign_dir = CLIPS_DIR / campaign_id
        campaign_dir.mkdir(parents=True, exist_ok=True)

        enriched: list[dict[str, Any]] = []
        # ── Dedup tracking ──────────────────────────────────────────
        # Primary: canonical video IDs  ("pexels:12345", "pixabay:67890")
        # Secondary: normalised file URLs (strips CDN tokens so the same
        #   video served from different edge nodes is still caught)
        used_video_ids: set[str] = set()
        used_file_urls: set[str] = set()

        for index, scene in enumerate(visual_plan):
            query = str(scene.get("stock_query", "")).strip()
            if not query:
                enriched.append(self._with_clip_url(scene, ""))
                continue

            clip_url = ""
            try:
                clip_url = await self._find_and_download(
                    query=query, campaign_dir=campaign_dir, index=index,
                    used_video_ids=used_video_ids, used_file_urls=used_file_urls,
                )
            except Exception as exc:
                logger.error("Stock clip download failed for scene %s: %s", index + 1, exc)

            enriched.append(self._with_clip_url(scene, clip_url))
            logger.debug(
                "Scene %s dedup state: %s video IDs, %s file URLs blocked",
                index + 1, len(used_video_ids), len(used_file_urls),
            )

            if index < len(visual_plan) - 1:
                await asyncio.sleep(0.25)

        downloaded = sum(1 for scene in enriched if scene.get("clip_url"))
        logger.info(
            "Downloaded %s/%s stock clips for campaign %s (unique videos: %s)",
            downloaded, len(enriched), campaign_id, len(used_video_ids),
        )
        return enriched

    def _with_clip_url(self, scene: dict[str, Any], clip_url: str) -> dict[str, Any]:
        updated = dict(scene)
        updated["clip_url"] = clip_url
        return updated

    # ── URL normalisation ─────────────────────────────────────────

    @staticmethod
    def _normalize_url(url: str) -> str:
        """Strip CDN query tokens so the same video from different edges
        resolves to one canonical string for dedup."""
        parsed = urlparse(url)
        # keep scheme + netloc + path; drop query & fragment
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

    @staticmethod
    def _synthetic_video_id(source: str, url: str) -> str:
        """Generate a deterministic ID for a video that has no platform ID."""
        parsed = urlparse(url)
        raw = f"{parsed.netloc}{parsed.path}"
        return f"{source}:anon_{hashlib.md5(raw.encode()).hexdigest()[:12]}"

    # ── Fallback query strategies ─────────────────────────────────

    @staticmethod
    def _build_fallback_queries(original_query: str) -> list[str]:
        """
        Generate progressively simpler search queries from the original
        comma-separated keyword string, to maximise the chance of finding
        a *unique* (non-duplicate) clip.
        """
        parts = [p.strip() for p in original_query.split(",") if p.strip()]
        fallbacks: list[str] = []
        if not parts:
            return fallbacks

        # Strategy 1: first two keywords
        if len(parts) >= 2:
            fallbacks.append(f"{parts[0]} {parts[1]}")

        # Strategy 2: first keyword only (broad)
        fallbacks.append(parts[0])

        # Strategy 3: a middle keyword (adds randomness across scenes)
        if len(parts) >= 4:
            mid = parts[len(parts) // 2]
            if mid.lower() != parts[0].lower():
                fallbacks.append(mid)

        # Strategy 4: random keyword from the tail half
        if len(parts) >= 3:
            tail = parts[len(parts) // 2 :]
            pick = random.choice(tail)
            if pick.lower() not in {fb.lower() for fb in fallbacks}:
                fallbacks.append(pick)

        return fallbacks

    async def _find_and_download(
        self, query: str, campaign_dir: Path, index: int,
        used_video_ids: set[str], used_file_urls: set[str],
    ) -> str:
        video_url = ""

        # --- primary query (page 1) ---
        if self.pexels_key:
            video_url = await self._search_pexels(query, used_video_ids, used_file_urls, page=1)
        if not video_url and self.pixabay_key:
            video_url = await self._search_pixabay(query, used_video_ids, used_file_urls, page=1)

        # --- primary query page 2 (different results for same query) ---
        if not video_url:
            if self.pexels_key:
                video_url = await self._search_pexels(query, used_video_ids, used_file_urls, page=2)
            if not video_url and self.pixabay_key:
                video_url = await self._search_pixabay(query, used_video_ids, used_file_urls, page=2)

        # --- fallback queries (progressively simpler) ---
        if not video_url:
            for fb_query in self._build_fallback_queries(query):
                if self.pexels_key:
                    video_url = await self._search_pexels(fb_query, used_video_ids, used_file_urls, page=1)
                if not video_url and self.pixabay_key:
                    video_url = await self._search_pixabay(fb_query, used_video_ids, used_file_urls, page=1)
                if video_url:
                    break

        if not video_url:
            logger.warning("No unique stock footage found for scene %s, query: %s", index + 1, query)
            return ""

        # Record normalised file URL to prevent exact-URL reuse
        used_file_urls.add(self._normalize_url(video_url))

        filename = f"scene_{index + 1:03d}_{uuid.uuid4().hex[:8]}.mp4"
        filepath = campaign_dir / filename
        await self._download_file(video_url, filepath)

        return f"/static/clips/{campaign_dir.name}/{filename}"

    async def _search_pexels(
        self, query: str, used_video_ids: set[str], used_file_urls: set[str],
        *, page: int = 1,
    ) -> str:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    "https://api.pexels.com/videos/search",
                    params={
                        "query": query,
                        "orientation": "landscape",
                        "per_page": 30,
                        "size": "medium",
                        "page": page,
                    },
                    headers={"Authorization": self.pexels_key},
                )

            if response.status_code != 200:
                logger.warning("Pexels returned status %s for query '%s' (page %s)", response.status_code, query, page)
                return ""

            videos = response.json().get("videos", [])
            for video in videos:
                video_id = str(video.get("id") or "")
                vid_key = f"pexels:{video_id}" if video_id else ""

                # Skip if we already used this exact video (any resolution)
                if vid_key and vid_key in used_video_ids:
                    continue

                # Reject clips with baked-in subscribe/YouTube overlays
                video_url_str = str(video.get("url") or "")
                video_tags = " ".join(str(t) for t in video.get("tags", []))
                if self._is_blacklisted(video_url_str, video_tags):
                    continue

                width = int(video.get("width") or 0)
                height = int(video.get("height") or 0)
                if width and height and (width / height) < 1.5:
                    continue

                file_url = self._pick_best_pexels_file(video.get("video_files", []))
                if not file_url:
                    continue

                norm_url = self._normalize_url(file_url)
                if norm_url in used_file_urls:
                    continue

                # Lock: use platform ID if available, else synthetic ID
                if vid_key:
                    used_video_ids.add(vid_key)
                else:
                    used_video_ids.add(self._synthetic_video_id("pexels", file_url))
                return file_url
            return ""
        except Exception as exc:
            logger.error("Pexels search failed for '%s': %s", query, exc)
            return ""

    def _pick_best_pexels_file(self, files: list[dict[str, Any]]) -> str:
        candidates = []
        for file_info in files:
            width = int(file_info.get("width") or 0)
            height = int(file_info.get("height") or 0)
            link = str(file_info.get("link") or "")
            if not width or not height or not link:
                continue
            if (width / height) < 1.5:
                continue
            candidates.append((width, link))

        if not candidates:
            return ""

        def score(item: tuple[int, str]) -> int:
            width, _ = item
            if width == 1920:
                return 0
            if width == 1280:
                return 1
            if width > 1920:
                return 2 + width
            return 3 + (1920 - width)

        candidates.sort(key=score)
        return candidates[0][1]

    async def _search_pixabay(
        self, query: str, used_video_ids: set[str], used_file_urls: set[str],
        *, page: int = 1,
    ) -> str:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    "https://pixabay.com/api/videos/",
                    params={
                        "key": self.pixabay_key,
                        "q": query,
                        "orientation": "horizontal",
                        "per_page": 30,
                        "page": page,
                        "safesearch": "true",
                    },
                )

            if response.status_code != 200:
                logger.warning("Pixabay returned status %s for query '%s' (page %s)", response.status_code, query, page)
                return ""

            hits = response.json().get("hits", [])
            for hit in hits:
                hit_id = str(hit.get("id") or "")
                vid_key = f"pixabay:{hit_id}" if hit_id else ""

                # Skip if we already used this exact video (any quality variant)
                if vid_key and vid_key in used_video_ids:
                    continue

                # Reject clips with baked-in subscribe/YouTube overlays
                hit_tags = str(hit.get("tags") or "")
                hit_page_url = str(hit.get("pageURL") or "")
                if self._is_blacklisted(hit_tags, hit_page_url):
                    continue

                variants = hit.get("videos", {})
                for quality in ["medium", "small", "large", "tiny"]:
                    variant = variants.get(quality, {})
                    url = str(variant.get("url") or "")
                    width = int(variant.get("width") or 0)
                    height = int(variant.get("height") or 0)
                    if not url or not width or not height or (width / height) < 1.5:
                        continue
                    norm_url = self._normalize_url(url)
                    if norm_url in used_file_urls:
                        continue
                    # Lock video ID
                    if vid_key:
                        used_video_ids.add(vid_key)
                    else:
                        used_video_ids.add(self._synthetic_video_id("pixabay", url))
                    return url
            return ""
        except Exception as exc:
            logger.error("Pixabay search failed for '%s': %s", query, exc)
            return ""

    async def _download_file(self, source_url: str, filepath: Path) -> None:
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            async with client.stream("GET", source_url) as response:
                response.raise_for_status()
                with open(filepath, "wb") as output:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        output.write(chunk)

        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        logger.info("Downloaded stock clip %s (%.1f MB)", filepath.name, size_mb)


stock_footage_service = StockFootageService()
