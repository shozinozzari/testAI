import google.generativeai as genai
from app.core.key_manager import key_manager
import json
import asyncio
import os
import logging

logger = logging.getLogger(__name__)


def _build_model(api_key: str):
    """Configure the old SDK and return a GenerativeModel for the given key."""
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config={
            "temperature": 0.2
        },
    )


class SceneSegmentationService:
    def __init__(self):
        if not key_manager.has_keys:
            logger.warning("No GOOGLE API keys configured. Scene segmentation disabled.")

    def _get_model(self):
        """Get a model configured with the current active API key."""
        key = key_manager.get_key()
        if not key:
            return None, None
        return _build_model(key), key

    async def analyze_audio(self, audio_path: str) -> list:
        """
        Analyze audio file and return scene segments with stock footage recommendations.
        Uses key rotation: if the current key is exhausted, rotates and retries.
        """
        if not key_manager.has_keys:
            logger.error("Scene segmentation unavailable: No API keys")
            return []

        if not os.path.exists(audio_path):
            logger.error(f"Audio file not found: {audio_path}")
            return []

        # Try with key rotation
        max_key_attempts = key_manager.total_keys + 1
        for attempt in range(max_key_attempts):
            model, key = self._get_model()
            if not model:
                logger.error("No available API keys for scene segmentation.")
                return []

            try:
                return await self._do_analyze(model, key, audio_path)
            except Exception as e:
                if key_manager.is_quota_error(e):
                    key_manager.mark_exhausted(key)
                    logger.warning(f"Scene segmentation: key exhausted, rotating... (attempt {attempt+1})")
                    continue
                else:
                    logger.error(f"Scene segmentation error: {e}", exc_info=True)
                    return []

        logger.error("All API keys exhausted for scene segmentation.")
        return []

    async def _do_analyze(self, model, key: str, audio_path: str) -> list:
        """Perform the actual audio analysis with the given model/key."""
        logger.info(f"Uploading audio for scene segmentation: {audio_path}")

        # Upload the audio file to Gemini (blocking – run in thread)
        # Need to reconfigure genai for this specific key before upload
        genai.configure(api_key=key)
        audio_file = await asyncio.to_thread(genai.upload_file, audio_path)
        logger.info(f"File uploaded: {audio_file.name}. State: {audio_file.state.name}")

        # Poll for processing completion
        max_wait = 120
        waited = 0
        while audio_file.state.name == "PROCESSING" and waited < max_wait:
            await asyncio.sleep(3)
            waited += 3
            audio_file = await asyncio.to_thread(genai.get_file, audio_file.name)

        if audio_file.state.name == "FAILED":
            logger.error("Audio processing failed in Gemini")
            return []

        if audio_file.state.name == "PROCESSING":
            logger.error("Audio processing timed out after %ss", max_wait)
            await asyncio.to_thread(genai.delete_file, audio_file.name)
            return []

        logger.info("Audio processed. Generating scene segmentation...")

        prompt = """
            Role: You are an elite audio engineer AND cinematic stock-footage director who creates fast-paced, visually dynamic sales videos with MAXIMUM scene changes.

            ## YOUR GOAL
            Create as many scene cuts as possible — one per spoken phrase or sub-phrase.
            Every natural pause, breath, comma, or hesitation is a CUT POINT.
            More scenes = more visual variety = more engaging video.

            ## PASS 1 — Hyper-precise pause detection (do BEFORE writing any JSON)

            Listen to the FULL audio **twice**.
            On the first listen, mark EVERY pause point using ALL of these triggers:
              • Any silence or near-silence gap ≥ 150 ms — this INCLUDES:
                - Mid-sentence comma pauses ("We help businesses, grow their revenue" → 2 scenes)
                - Breaths between clauses
                - Dramatic/rhetorical pauses
                - Pauses before or after emphasis words
                - List item pauses ("first... second... third" → 3 separate scenes)
              • Punctuation-driven pauses: period, comma, semicolon, colon, em-dash, ellipsis
              • Intonation drop or rise that signals the end of ANY clause — even short ones
              • Filler words ("um", "uh", "so", "right", "you know") — cut immediately before the filler
              • Speed changes — if the speaker slows down or speeds up, that boundary is a cut
              • Emphasis shifts — if stress moves to a new word/idea, that's a new scene

            CRITICAL: Do NOT group short phrases together. If a phrase is 1.5 seconds long, it is its OWN scene. If a sentence has a comma pause in the middle, split it into TWO scenes at the comma.

            Record each phrase as (start_ts, end_ts, transcript_snippet) in MM:SS.s format (half-second precision).

            On the second listen, VERIFY:
              ✓ The cut does NOT land inside a word (0.5 s safety check before and after)
              ✓ The gap between last phoneme of phrase N and first phoneme of phrase N+1 is ≥ 150 ms
              ✓ You have NOT merged phrases that have an audible pause between them — if there's a pause, SPLIT
              ✓ Adjust timestamps ±0.5 s if a breath or plosive would be audibly clipped

            ## PASS 2 — Scene assembly

            HARD rules:
            1) ONE phrase/sub-phrase = ONE scene. NEVER merge phrases that have any audible gap between them.
               The ONLY exception: two words under 0.8 s each that form a single noun phrase ("digital marketing").
            2) Target scene duration: 2–5 seconds. This is the sweet spot for cinematic pacing.
               - Hard minimum: 1.0 s (short exclamations, single words with pauses around them)
               - Hard maximum: 7 s (only if the speaker truly does not pause at all)
               - If a spoken segment runs longer than 7 s, you MUST split it at the nearest breath/comma
            3) ZERO gaps, ZERO overlaps. scene[N].end == scene[N+1].start, exactly.
            4) First scene starts at 00:00.0. Last scene ends at the EXACT audio end time.
            5) Every scene cut MUST fall inside a verified silence gap (≥ 150 ms). NEVER cut mid-word.

            AIM FOR: roughly one scene every 2-4 seconds of audio. A 90-second audio should produce 25-45 scenes. A 120-second audio should produce 30-60 scenes. If you have fewer scenes than this, you are merging too aggressively — go back and split more.

            ## PASS 3 — Visual assignment

            For each scene, write:
            • visual_description — one vivid sentence: subject + action + specific real-world location + lighting/mood + camera shot type (close-up, wide, overhead, tracking, handheld, dolly, steadicam, drone, macro, slow-motion, rack focus, etc.)
            • stock_query — 8-14 comma-separated CONCRETE, tangible keywords for Pexels/Pixabay. Use only nouns, verbs, settings, camera terms. ABSOLUTELY NO abstract words (success, growth, strategy, innovation, journey, transformation, opportunity, potential, solution, concept).

            Visual uniqueness rules:
            • Every stock_query MUST be completely unique — no two scenes share the same primary subject, setting, or action.
            • No two CONSECUTIVE scenes may feature the same category of subject (e.g. no back-to-back "person at desk").
            • Cycle through diverse categories: people, nature, architecture, technology, food, vehicles, aerial views, close-ups of hands/objects, cityscapes, interiors, water/ocean, mountains, workshops, kitchens, factories, sports, animals, weather.
            • IMPORTANT: Similar queries return the SAME video clips from stock sites. Each query must be MAXIMALLY different from every other query — different nouns, different settings, different camera angles. If two queries share more than 2 keywords, rewrite one completely.
            • For SHORT scenes (under 2.5 s), prefer tight close-ups, macro shots, or quick-cut visuals (splashing water, sparks, typing fingers, coffee pour, flipping pages).

            Forbidden visuals: logos, brand names, text overlays, UI mockups, watermarks, famous people, screen recordings, AI-generated-looking imagery, subscribe buttons, YouTube end screens, YouTube subscribe animations, bell icons, like/share/subscribe buttons, social media UI elements, CTA button overlays, notification icons, channel art, video player interfaces.

            ## Output format

            Return ONLY a valid JSON array. No markdown fences, no comments, no explanation, no trailing commas.

            [
              {
                "time_range": "00:00.0 - 00:02.5",
                "visual_description": "Extreme close-up of a hand slamming a laptop shut in frustration, warm tungsten lighting, shallow depth of field.",
                "stock_query": "hand closing laptop, frustration, close up, shallow depth of field, tungsten light, office desk, dramatic, slow motion"
              },
              {
                "time_range": "00:02.5 - 00:05.0",
                "visual_description": "Aerial drone shot rising above a crowded city intersection at golden hour, cars and pedestrians flowing below.",
                "stock_query": "aerial drone, city intersection, golden hour, traffic flow, pedestrians, overhead shot, urban landscape, rising camera"
              },
              {
                "time_range": "00:05.0 - 00:07.0",
                "visual_description": "Macro close-up of coffee being poured into a white ceramic cup, steam rising, soft morning window light.",
                "stock_query": "coffee pour, white cup, steam rising, macro shot, morning light, window, ceramic, beverage close up"
              }
            ]

            ## Final self-check (MUST pass before responding)
            ✓ First scene starts at 00:00.0
            ✓ Last scene ends at exact audio end time
            ✓ scene[N].end == scene[N+1].start for every N
            ✓ Every cut sits inside a silence/pause gap ≥ 150 ms — no mid-word cuts
            ✓ No scene shorter than 1.0 s or longer than 7 s
            ✓ Average scene duration is 2-4 seconds (if higher, you need more splits)
            ✓ All stock_query values are fully unique — zero shared primary subjects
            ✓ No two consecutive scenes have the same category of visual subject
            ✓ Short scenes (under 2.5 s) use tight/macro/quick-cut visuals
            """

        response = await asyncio.to_thread(model.generate_content, [prompt, audio_file])

        try:
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            segments = json.loads(text.strip())

            # ── Post-parse validation ────────────────────────────────
            segments = self._validate_segments(segments)
            logger.info(f"Generated {len(segments)} scene segments (post-validation)")

            # Cleanup
            await asyncio.to_thread(genai.delete_file, audio_file.name)
            logger.info("Cleaned up audio file from Gemini storage")

            return segments

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {e}")
            logger.error(f"Raw response: {response.text}")
            await asyncio.to_thread(genai.delete_file, audio_file.name)
            return []

    # ── helpers ──────────────────────────────────────────────────

    @staticmethod
    def _ts_to_seconds(ts: str) -> float:
        """Convert 'MM:SS.s' to fractional seconds."""
        ts = ts.strip()
        parts = ts.split(":")
        try:
            minutes = int(parts[0])
            seconds = float(parts[1])
            return minutes * 60 + seconds
        except (IndexError, ValueError):
            return -1.0

    def _validate_segments(self, segments: list) -> list:
        """Post-process: fix gaps/overlaps, drop ultra-short scenes, ensure continuity."""
        if not segments:
            return segments

        cleaned = []
        for seg in segments:
            tr = seg.get("time_range", "")
            if " - " not in tr:
                continue
            start_s, end_s = tr.split(" - ", 1)
            start = self._ts_to_seconds(start_s)
            end = self._ts_to_seconds(end_s)
            if start < 0 or end < 0 or end <= start:
                logger.warning("Dropping invalid segment: %s", tr)
                continue
            seg["_start"] = start
            seg["_end"] = end
            cleaned.append(seg)

        if not cleaned:
            return []

        # Sort by start time
        cleaned.sort(key=lambda s: s["_start"])

        # Snap consecutive boundaries so end[N] == start[N+1]
        for i in range(len(cleaned) - 1):
            gap = cleaned[i + 1]["_start"] - cleaned[i]["_end"]
            if abs(gap) <= 1.0:  # close enough to snap
                mid = (cleaned[i]["_end"] + cleaned[i + 1]["_start"]) / 2
                cleaned[i]["_end"] = mid
                cleaned[i + 1]["_start"] = mid

        # Rebuild time_range strings and strip internal keys
        def fmt(seconds: float) -> str:
            m = int(seconds // 60)
            s = seconds - m * 60
            return f"{m:02d}:{s:04.1f}"

        for seg in cleaned:
            seg["time_range"] = f"{fmt(seg['_start'])} - {fmt(seg['_end'])}"
            seg.pop("_start", None)
            seg.pop("_end", None)

        return cleaned


scene_segmentation_service = SceneSegmentationService()
