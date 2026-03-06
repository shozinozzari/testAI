import asyncio
import logging
import re
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class VideoService:
    """
    Assemble a final VSL video from scene clips + VSL audio using FFmpeg.
    """

    def __init__(self) -> None:
        self.backend_root = Path(__file__).resolve().parents[2]
        self.static_root = self.backend_root / "static"
        self.video_root = self.static_root / "video"
        self.video_root.mkdir(parents=True, exist_ok=True)
        self.scene_playback_speed = 1.30
        # Background music preset
        self.bg_music_path = self.backend_root / "VSL Music.mp3"

    async def assemble_vsl(
        self,
        script: str = "",
        audio_url: str = "",
        timestamps: list[Any] | None = None,
        campaign_id: str = "",
        scene_segments: list[dict[str, Any]] | None = None,
    ) -> str:
        """
        Build one MP4 whose visuals are scene clips aligned to `time_range`
        and whose audio is the VSL narration.
        """
        audio_path = self._resolve_media_path(audio_url)
        if not audio_path or not audio_path.exists():
            raise RuntimeError(f"Audio file not found for assembly: {audio_url}")

        scenes = self._resolve_scenes(scene_segments=scene_segments, timestamps=timestamps)
        if not scenes:
            raise RuntimeError("No scene segments available for VSL assembly")

        audio_duration = await self._probe_duration_seconds(audio_path)
        if audio_duration <= 0:
            raise RuntimeError(f"Unable to read audio duration: {audio_path}")

        scene_specs = self._build_scene_specs(scenes=scenes, audio_duration=audio_duration)
        if not scene_specs:
            raise RuntimeError("Unable to build scene timing for VSL assembly")

        campaign_slug = campaign_id or uuid.uuid4().hex
        output_name = f"vsl_{campaign_slug}.mp4"
        output_path = self.video_root / output_name

        temp_dir = self.video_root / f"tmp_{campaign_slug}_{uuid.uuid4().hex[:8]}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        clips_campaign_dir = self.static_root / "clips" / campaign_slug

        try:
            segment_files: list[str] = []
            for i, spec in enumerate(scene_specs, start=1):
                segment_name = f"segment_{i:03d}.mp4"
                segment_path = temp_dir / segment_name

                if spec["clip_path"] and spec["clip_path"].exists():
                    await self._build_scene_segment_from_clip(
                        clip_path=spec["clip_path"],
                        duration=spec["duration"],
                        output_path=segment_path,
                    )
                else:
                    await self._build_black_scene_segment(
                        duration=spec["duration"],
                        output_path=segment_path,
                    )

                segment_files.append(segment_name)

            concat_list_path = temp_dir / "concat_list.txt"
            concat_list_path.write_text(
                "".join(f"file '{name}'\n" for name in segment_files),
                encoding="utf-8",
            )

            visual_track_path = temp_dir / "visual_track.mp4"
            await self._run_ffmpeg(
                [
                    "ffmpeg",
                    "-y",
                    "-f",
                    "concat",
                    "-safe",
                    "0",
                    "-i",
                    str(concat_list_path),
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "23",
                    "-pix_fmt",
                    "yuv420p",
                    "-an",
                    str(visual_track_path),
                ],
                cwd=temp_dir,
            )

            # ── Step 2: Mux visual track + narration (no music yet) ──
            narrated_path = temp_dir / "narrated.mp4"
            await self._run_ffmpeg(
                [
                    "ffmpeg", "-y",
                    "-i", str(visual_track_path),
                    "-i", str(audio_path),
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-shortest",
                    str(narrated_path),
                ]
            )

            # ── Step 3: Speed up the narrated video by 1.20x ──
            vsl_speed = 1.20
            sped_up_path = temp_dir / "sped_up.mp4"
            logger.info("Speeding up VSL by %.2fx", vsl_speed)
            # atempo only accepts 0.5–100, setpts accepts any positive value
            await self._run_ffmpeg(
                [
                    "ffmpeg", "-y",
                    "-i", str(narrated_path),
                    "-filter_complex",
                    f"[0:v]setpts=PTS/{vsl_speed}[v];[0:a]atempo={vsl_speed}[a]",
                    "-map", "[v]",
                    "-map", "[a]",
                    "-c:v", "libx264",
                    "-preset", "veryfast",
                    "-crf", "23",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    str(sped_up_path),
                ]
            )

            # ── Step 4: Mix in background music at full volume ──
            if self.bg_music_path.exists():
                logger.info("Mixing background music: %s", self.bg_music_path)
                await self._run_ffmpeg(
                    [
                        "ffmpeg", "-y",
                        "-i", str(sped_up_path),             # input 0: sped-up video+narration
                        "-stream_loop", "-1",
                        "-i", str(self.bg_music_path),       # input 1: music (looped)
                        "-filter_complex",
                        "[0:a][1:a]amix=inputs=2:duration=shortest:dropout_transition=2[aout]",
                        "-map", "0:v",
                        "-map", "[aout]",
                        "-c:v", "copy",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        "-shortest",
                        "-movflags", "+faststart",
                        str(output_path),
                    ]
                )
            else:
                logger.warning("Background music not found at %s — narration only", self.bg_music_path)
                await self._run_ffmpeg(
                    [
                        "ffmpeg", "-y",
                        "-i", str(sped_up_path),
                        "-c:v", "copy",
                        "-c:a", "copy",
                        "-movflags", "+faststart",
                        str(output_path),
                    ]
                )

            logger.info("VSL video assembled: %s", output_path)
            return f"/static/video/{output_name}"
        finally:
            self._cleanup_directory(temp_dir)
            self._cleanup_directory(clips_campaign_dir)

    def _resolve_scenes(
        self,
        scene_segments: list[dict[str, Any]] | None,
        timestamps: list[Any] | None,
    ) -> list[dict[str, Any]]:
        if isinstance(scene_segments, list) and scene_segments:
            return [s for s in scene_segments if isinstance(s, dict)]

        # Backward-compat: callers may pass scene-like data as third arg.
        if isinstance(timestamps, list) and timestamps and isinstance(timestamps[0], dict):
            if any("time_range" in t for t in timestamps):
                return [t for t in timestamps if isinstance(t, dict)]

        return []

    def _resolve_media_path(self, media_url_or_path: str) -> Path | None:
        if not media_url_or_path:
            return None
        candidate = Path(media_url_or_path)
        if candidate.exists():
            return candidate
        return self.backend_root / media_url_or_path.lstrip("/")

    async def _probe_duration_seconds(self, media_path: Path) -> float:
        result = await self._run_cmd(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(media_path),
            ],
            check=False,
        )
        if result.returncode != 0:
            return 0.0
        try:
            return max(0.0, float((result.stdout or "").strip()))
        except ValueError:
            return 0.0

    def _build_scene_specs(self, scenes: list[dict[str, Any]], audio_duration: float) -> list[dict[str, Any]]:
        specs: list[dict[str, Any]] = []
        parsed_durations: list[float] = []

        for scene in scenes:
            duration = self._parse_duration_from_time_range(str(scene.get("time_range", "")))
            parsed_durations.append(duration if duration > 0 else 0.0)

        has_valid = any(d > 0 for d in parsed_durations)
        fallback_duration = (audio_duration / len(scenes)) if scenes else 0.0
        fallback_duration = max(1.0, fallback_duration)

        for index, scene in enumerate(scenes):
            duration = parsed_durations[index] if has_valid else fallback_duration
            if duration <= 0:
                duration = fallback_duration

            clip_url = str(scene.get("clip_url", "")).strip()
            clip_path = self._resolve_media_path(clip_url) if clip_url else None
            if clip_path and not clip_path.exists():
                clip_path = None

            specs.append({"duration": duration, "clip_path": clip_path})

        total = sum(spec["duration"] for spec in specs)
        if specs and audio_duration > total + 0.25:
            specs[-1]["duration"] += audio_duration - total

        return specs

    def _parse_duration_from_time_range(self, time_range: str) -> float:
        if not time_range:
            return 0.0
        parts = [p.strip() for p in time_range.split("-")]
        if len(parts) != 2:
            return 0.0
        start = self._parse_timestamp(parts[0])
        end = self._parse_timestamp(parts[1])
        if start is None or end is None:
            return 0.0
        duration = end - start
        return duration if duration > 0 else 0.0

    def _parse_timestamp(self, value: str) -> float | None:
        if not value:
            return None
        # Accept HH:MM:SS(.ms) or MM:SS(.ms)
        pattern = re.compile(r"^\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?$")
        if not pattern.match(value):
            return None
        parts = value.split(":")
        try:
            if len(parts) == 3:
                hours = float(parts[0])
                minutes = float(parts[1])
                seconds = float(parts[2])
                return hours * 3600 + minutes * 60 + seconds
            if len(parts) == 2:
                minutes = float(parts[0])
                seconds = float(parts[1])
                return minutes * 60 + seconds
        except ValueError:
            return None
        return None

    async def _build_scene_segment_from_clip(self, clip_path: Path, duration: float, output_path: Path) -> None:
        # Speed up source scene clips before segment rendering for a snappier final cut.
        speed_filter = (
            f"setpts=PTS/{self.scene_playback_speed},"
            "scale=1920:1080:force_original_aspect_ratio=decrease,"
            "pad=1920:1080:(ow-iw)/2:(oh-ih)/2,"
            "setsar=1,fps=30,format=yuv420p"
        )
        await self._run_ffmpeg(
            [
                "ffmpeg",
                "-y",
                "-stream_loop",
                "-1",
                "-i",
                str(clip_path),
                "-t",
                f"{duration:.3f}",
                "-vf",
                speed_filter,
                "-an",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "23",
                str(output_path),
            ]
        )

    async def _build_black_scene_segment(self, duration: float, output_path: Path) -> None:
        await self._run_ffmpeg(
            [
                "ffmpeg",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "color=c=black:s=1920x1080:r=30",
                "-t",
                f"{duration:.3f}",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "23",
                "-pix_fmt",
                "yuv420p",
                str(output_path),
            ]
        )

    async def _run_ffmpeg(self, args: list[str], cwd: Path | None = None) -> None:
        result = await self._run_cmd(args, cwd=cwd, check=False)
        if result.returncode != 0:
            err = (result.stderr or "").strip().splitlines()
            tail = "\n".join(err[-15:]) if err else "Unknown ffmpeg error"
            raise RuntimeError(f"FFmpeg command failed:\n{tail}")

    async def _run_cmd(
        self,
        args: list[str],
        cwd: Path | None = None,
        check: bool = False,
    ) -> subprocess.CompletedProcess[str]:
        def runner() -> subprocess.CompletedProcess[str]:
            return subprocess.run(
                args,
                cwd=str(cwd) if cwd else None,
                capture_output=True,
                text=True,
                check=check,
            )

        return await asyncio.to_thread(runner)

    def _cleanup_directory(self, path: Path) -> None:
        try:
            if path.exists():
                shutil.rmtree(path, ignore_errors=True)
                logger.info("Deleted intermediate directory: %s", path)
        except Exception as exc:
            logger.warning("Failed to delete intermediate directory %s: %s", path, exc)


video_service = VideoService()
