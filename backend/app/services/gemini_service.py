import google.generativeai as genai
from app.core.config import settings
import logging
import json
from functools import lru_cache

logger = logging.getLogger(__name__)


def _clean_json(text: str) -> dict:
    """
    Extract valid JSON from model responses that may include extra text.
    """
    text = text.strip().replace("```json", "").replace("```", "")
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])


class GeminiService:
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY

        if self.api_key:
            genai.configure(api_key=self.api_key)

            # Controlled generation for consistent persuasive output
            self.model = genai.GenerativeModel(
                "gemini-2.5-flash",
                generation_config={
                    "temperature": 0.6,   # balanced creativity & clarity
                    "top_p": 0.9,
                    "top_k": 40,
                    "max_output_tokens": 8192,
                },
            )
        else:
            logger.warning("GOOGLE_API_KEY missing. AI generation disabled.")
            self.model = None

    async def generate_script(self, prompt: str) -> str:
        if not self.model:
            logger.error("Attempted script generation without API key.")
            return "Error: GOOGLE_API_KEY not configured."

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API Error: {str(e)}")
            return f"Error generating script: {str(e)}"

    @lru_cache(maxsize=128)
    def _cache_key(self, offer: str) -> str:
        """
        Normalize offer text for caching.
        """
        return offer.lower().strip()

    async def _generate_fallback_from_ai(self, promotion_offer: str, language: str = "English") -> dict:
        """
        Minimal AI-generated fallback (no hardcoded marketing claims).
        Used if primary generation fails.
        """
        fallback_prompt = f"""
Analyze this offer and generate valid JSON content in Colloquial {language}:

OFFER:
{promotion_offer}

Generate high-converting copy based on the offer details.
Identify target audience, key benefits, and calls to action.

Return JSON with keys:
headline, subheadline, target_audience, primary_outcome,
trust_signals, credibility_metrics, video_label, video_bullets,
cta_text, cta_supporting_text, urgency_text, friction_points,
primary_color, secondary_color, background_style,
who_is_this_for, who_is_this_not_for,
testimonials,
final_call_to_action_header, final_call_to_action_subtext

IMPORTANT RULES:
- friction_points: exactly 5 items. Each item must be a detailed objection handler (Question? Reassurance). e.g. "Worried about cost? We offer ROI-focused plans aligned with your growth."
- credibility_metrics: MUST be exactly 3 or 6 items (multiples of 3)
- video_bullets: exactly 6 items (short benefit statements)
- testimonials: array of objects with "name" and "text" keys, exactly 3 items. NEVER use placeholders like [Company Name] or [Brand]. Write each testimonial as a natural quote about the RESULT they experienced - no company references, just outcomes and feelings.

Keep it professional and persuasive.
Return raw JSON only.
"""
        try:
            response = self.model.generate_content(fallback_prompt)
            return _clean_json(response.text)
        except Exception as e:
            logger.error(f"Fallback generation failed: {e}")
            return {}

    async def generate_landing_page_content(
        self,
        promotion_offer: str,
        language: str = "English",
        vsl_script: str = "",
    ) -> dict:
        """
        Generate high-converting landing page copy using the offer and optional VSL script.
        AI infers audience, positioning, persuasion, and aligns copy to the VSL message.
        """

        if not self.model:
            return await self._generate_fallback_from_ai(promotion_offer, language)

        vsl_context = ""
        if vsl_script and vsl_script.strip():
            vsl_context = f"""
VSL SCRIPT CONTEXT:
{vsl_script}
"""

        prompt = f"""
You are an elite direct-response copywriter and CRO strategist.
TARGET LANGUAGE: Colloquial {language}.

Create HIGH-CONVERTING landing page copy designed to persuade
qualified prospects to book a strategy call.

OFFER:
{promotion_offer}
{vsl_context}

TASK:
- infer the ideal target audience
- identify their painful problem
- define the desired transformation
- position the offer as the safest and fastest solution
- remove hesitation and increase booking intent
- align headline, subheadline, bullets, and CTA with the same core promise used in the VSL

Use clear, confident, professional language.
Avoid hype, exaggeration, or unrealistic claims.

Return JSON with EXACT keys:

headline
subheadline
target_audience
primary_outcome
trust_signals
credibility_metrics
video_label
video_bullets
cta_text
cta_supporting_text
urgency_text
friction_points
primary_color
secondary_color
background_style
who_is_this_for
who_is_this_not_for
testimonials
final_call_to_action_header
final_call_to_action_subtext

IMPORTANT RULES:
- friction_points: exactly 5 items. Each item must be a detailed objection handler (Question? Reassurance). Example: "Worried about cost? We offer ROI-focused plans aligned with your growth."
- credibility_metrics: MUST be exactly 3 or 6 items (multiples of 3)
- video_bullets: exactly 6 items (short benefit statements)
- testimonials: array of objects with "name" and "text" keys, exactly 3 items. Never use placeholders like [Company Name] or [Brand].
- final_call_to_action_header: a compelling closing headline relevant to the offer

Return raw JSON only.
"""

        required_keys = [
            "headline", "subheadline", "target_audience", "primary_outcome",
            "trust_signals", "credibility_metrics", "video_label", "video_bullets",
            "cta_text", "cta_supporting_text", "urgency_text", "friction_points",
            "primary_color", "secondary_color", "background_style",
            "who_is_this_for", "who_is_this_not_for", "testimonials",
            "final_call_to_action_header", "final_call_to_action_subtext",
        ]

        try:
            logger.info(f"Generating landing page content for: {promotion_offer}")

            # retry logic
            for attempt in range(2):
                try:
                    response = self.model.generate_content(prompt)
                    result = _clean_json(response.text)

                    # ensure schema completeness
                    for key in required_keys:
                        if key not in result:
                            result[key] = [] if "signals" in key or "bullets" in key or "points" in key else ""

                    return result

                except Exception as e:
                    logger.warning(f"Attempt {attempt+1} failed: {e}")

            return await self._generate_fallback_from_ai(promotion_offer, language)

        except Exception as e:
            logger.error(f"Primary generation failed: {e}")
            return await self._generate_fallback_from_ai(promotion_offer, language)

    async def generate_viral_script(self, keyword: str) -> str:
        prompt = f"""
Write a 30-second viral script about "{keyword}".

Structure:
Hook (0-3s)
Body (3-25s)
CTA (25-30s)

Return only the script.
"""
        return await self.generate_script(prompt)

    async def generate_vsl_script(self, promotion_offer: str, language: str = "English") -> str:
        prompt = f"""
Act as an elite direct-response VSL copywriter.
TARGET LANGUAGE: Colloquial {language}.

Goal:
Maximize booked strategy calls from qualified prospects.

Offer:
"{promotion_offer}"

Required conversion structure (do NOT label sections):
1) Hook: pattern interrupt + specific promised outcome.
2) Problem agitation: vivid daily pains and cost of inaction.
3) Root-cause insight: why old attempts fail.
4) Offer mechanism: why this approach is different.
5) Proof framing: concrete, believable indicators (no fabricated stats or fake claims).
6) Objection handling: time, money, trust, and complexity.
7) CTA: one clear next step to book now, naturally repeated 2-3 times.

Hard rules:
- LANGUAGE: Entire script must be in Colloquial {language}. Avoid English unless a term is commonly used in that language.
- Plain text only for TTS. No markdown, no section headers, no bullet points, no stage directions.
- Write short spoken paragraphs (1-3 sentences each) for natural voiceover pacing.
- Use strong "you" language and specific real-world scenarios.
- Add urgency/scarcity without fake claims.
- Include one soft disqualifier line for poor-fit viewers.
- Avoid vague hype words: "revolutionary", "game-changing", "best ever", "guaranteed".
- Keep runtime roughly 90-150 seconds when spoken aloud.
"""
        return await self.generate_script(prompt)


gemini_service = GeminiService()

