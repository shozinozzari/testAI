import asyncio
import logging
import os
import uuid
from pathlib import Path
from typing import Any

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
        for index, scene in enumerate(visual_plan):
            query = str(scene.get("stock_query", "")).strip()
            if not query:
                enriched.append(self._with_clip_url(scene, ""))
                continue

            clip_url = ""
            try:
                clip_url = await self._find_and_download(query=query, campaign_dir=campaign_dir, index=index)
            except Exception as exc:
                logger.error("Stock clip download failed for scene %s: %s", index + 1, exc)

            enriched.append(self._with_clip_url(scene, clip_url))

            if index < len(visual_plan) - 1:
                await asyncio.sleep(0.25)

        downloaded = sum(1 for scene in enriched if scene.get("clip_url"))
        logger.info("Downloaded %s/%s stock clips for campaign %s", downloaded, len(enriched), campaign_id)
        return enriched

    def _with_clip_url(self, scene: dict[str, Any], clip_url: str) -> dict[str, Any]:
        updated = dict(scene)
        updated["clip_url"] = clip_url
        return updated

    async def _find_and_download(self, query: str, campaign_dir: Path, index: int) -> str:
        video_url = ""

        if self.pexels_key:
            video_url = await self._search_pexels(query)

        if not video_url and self.pixabay_key:
            video_url = await self._search_pixabay(query)

        if not video_url:
            simple_query = " ".join(query.split(",")[0].split()[:3]).strip()
            if simple_query and simple_query.lower() != query.lower():
                if self.pexels_key:
                    video_url = await self._search_pexels(simple_query)
                if not video_url and self.pixabay_key:
                    video_url = await self._search_pixabay(simple_query)

        if not video_url:
            logger.warning("No stock footage found for query: %s", query)
            return ""

        filename = f"scene_{index + 1:03d}_{uuid.uuid4().hex[:8]}.mp4"
        filepath = campaign_dir / filename
        await self._download_file(video_url, filepath)

        return f"/static/clips/{campaign_dir.name}/{filename}"

    async def _search_pexels(self, query: str) -> str:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    "https://api.pexels.com/videos/search",
                    params={
                        "query": query,
                        "orientation": "landscape",
                        "per_page": 6,
                        "size": "medium",
                    },
                    headers={"Authorization": self.pexels_key},
                )

            if response.status_code != 200:
                logger.warning("Pexels returned status %s for query '%s'", response.status_code, query)
                return ""

            videos = response.json().get("videos", [])
            for video in videos:
                width = int(video.get("width") or 0)
                height = int(video.get("height") or 0)
                if width and height and (width / height) < 1.5:
                    continue

                file_url = self._pick_best_pexels_file(video.get("video_files", []))
                if file_url:
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

    async def _search_pixabay(self, query: str) -> str:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    "https://pixabay.com/api/videos/",
                    params={
                        "key": self.pixabay_key,
                        "q": query,
                        "orientation": "horizontal",
                        "per_page": 6,
                        "safesearch": "true",
                    },
                )

            if response.status_code != 200:
                logger.warning("Pixabay returned status %s for query '%s'", response.status_code, query)
                return ""

            hits = response.json().get("hits", [])
            for hit in hits:
                variants = hit.get("videos", {})
                for quality in ["medium", "small", "large", "tiny"]:
                    variant = variants.get(quality, {})
                    url = str(variant.get("url") or "")
                    width = int(variant.get("width") or 0)
                    height = int(variant.get("height") or 0)
                    if url and width and height and (width / height) >= 1.5:
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
