import google.generativeai as genai
from app.core.key_manager import key_manager
import logging
import json
import asyncio
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


def _build_model(api_key: str):
    """Configure the old SDK and return a GenerativeModel for the given key."""
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config={
            "temperature": 0.6,
            "top_p": 0.9,
            "top_k": 40,
            "max_output_tokens": 8192,
        },
    )


class GeminiService:
    def __init__(self):
        if not key_manager.has_keys:
            logger.warning("No GOOGLE API keys configured. AI generation disabled.")

    def _get_model(self):
        """Get a model configured with the current active API key."""
        key = key_manager.get_key()
        if not key:
            return None, None
        return _build_model(key), key

    async def generate_script(self, prompt: str) -> str:
        model, key = self._get_model()
        if not model:
            logger.error("Attempted script generation without API key.")
            return "Error: GOOGLE_API_KEY not configured."

        try:
            response = await asyncio.to_thread(model.generate_content, prompt)
            return response.text
        except Exception as e:
            if key_manager.is_quota_error(e) or key_manager.is_invalid_key_error(e):
                if key_manager.is_quota_error(e):
                    key_manager.mark_exhausted(key)
                else:
                    key_manager.mark_invalid(key)
                # Retry with next key
                model2, key2 = self._get_model()
                if model2:
                    try:
                        response = await asyncio.to_thread(model2.generate_content, prompt)
                        return response.text
                    except Exception as e2:
                        if key_manager.is_quota_error(e2):
                            key_manager.mark_exhausted(key2)
                        elif key_manager.is_invalid_key_error(e2):
                            key_manager.mark_invalid(key2)
                        logger.error(f"Gemini API Error (retry): {e2}", exc_info=True)
                        return f"Error generating script: {e2}"
            logger.error(f"Gemini API Error: {str(e)}", exc_info=True)
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
        model, key = self._get_model()
        if not model:
            return {}
        try:
            response = await asyncio.to_thread(model.generate_content, fallback_prompt)
            return _clean_json(response.text)
        except Exception as e:
            if key_manager.is_quota_error(e):
                key_manager.mark_exhausted(key)
            elif key_manager.is_invalid_key_error(e):
                key_manager.mark_invalid(key)
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

        model, key = self._get_model()
        if not model:
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

            response = await asyncio.to_thread(model.generate_content, prompt)
            result = _clean_json(response.text)

            # ensure schema completeness
            for rk in required_keys:
                if rk not in result:
                    result[rk] = [] if "signals" in rk or "bullets" in rk or "points" in rk else ""

            return result

        except Exception as e:
            if key_manager.is_quota_error(e):
                key_manager.mark_exhausted(key)
            elif key_manager.is_invalid_key_error(e):
                key_manager.mark_invalid(key)
            logger.error(f"Landing page generation failed: {e}")
            return {}

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
You are an elite direct-response VSL copywriter who writes the way real people TALK — not the way marketers write.
TARGET LANGUAGE: Colloquial, street-level {language} — the way a sharp friend would explain something on a voice note.

Goal:
Get qualified prospects to book a strategy call RIGHT NOW.

Offer:
"{promotion_offer}"

## VOICE & TONE — THIS IS CRITICAL

Write like a real human having an honest, slightly intense conversation.
- Use contractions, run-on thoughts, rhetorical questions, and everyday slang.
- Short punchy sentences. Some fragments. Then a longer one to drive the point home.
- Speak directly: "you", "your", "look", "here's the thing", "let me be real with you".
- Add natural filler sparingly for realism: "honestly", "look", "the thing is", "right?", "I mean".
- Vary rhythm: fast-fast-fast then slow. Build tension, then release.
- Sound like a mentor who's been through it, not a teleprompter reading a pitch deck.

## TECHNICAL / ENGLISH TERMS — KEEP IN ENGLISH

Even when writing in {language}, keep these types of words in English (they're universally understood):
- Business/marketing terms: ROI, leads, funnel, ads, CRM, pipeline, conversion, landing page, scaling, revenue, profit, B2B, SaaS, agency, retainer, clients, niche, offer, strategy call, onboarding, KPIs, ROAS, CPL, CPC, CTR, follow-up, close rate, upsell, churn
- Tech terms: AI, automation, dashboard, analytics, API, CRM, software, platform, tool, system, app, workflow, integration
- Social/brand terms: Instagram, YouTube, Facebook, Google, WhatsApp, LinkedIn, Zoom, Meta
- Common English phrases that feel natural in any language: "game plan", "next level", "no-brainer", "real talk", "step by step", "done-for-you", "plug and play"

## CONVERSION STRUCTURE (flow naturally — do NOT label sections)

1) HOOK (first 5-10 seconds): Pattern interrupt. Say something unexpected or contrarian that stops the scroll. State the specific outcome they'll get.
2) PROBLEM AGITATION: Paint their daily pain vividly — the late nights, the wasted ad spend, the ghosted proposals, the feast-or-famine cycle. Make them feel SEEN.
3) ROOT CAUSE: Explain why everything they've tried before didn't work. Be specific — not "you lacked a system" but name the actual broken approach.
4) THE MECHANISM: Reveal your different approach. Explain the "how" at a high level — enough to build belief, not so much it overwhelms.
5) PROOF FRAMING: Use believable, concrete indicators. Real-world scenarios, relatable before/after situations. NO fabricated stats, fake case studies, or made-up numbers.
6) OBJECTION HANDLING: Address the "yeah but..." thoughts — time, money, trust, complexity. Handle each one with empathy + logic.
7) CTA: One clear next step — book the call. Weave it in naturally 2-3 times (not copy-pasted, each time phrased slightly differently).

## HARD RULES

- LANGUAGE: Entire script in Colloquial {language}. But keep technical/business/platform terms in English as listed above.
- Plain text ONLY for TTS. No markdown, no headers, no bullets, no emojis, no stage directions, no [brackets].
- Write short spoken paragraphs (1-3 sentences). One thought per paragraph. Let the listener breathe.
- Every paragraph should feel like it could be a voice note — if it sounds "written", rewrite it.
- Include one soft disqualifier: "If you're not willing to [X], this isn't for you."
- FORBIDDEN words/phrases: "revolutionary", "game-changing", "best ever", "guaranteed results", "secret", "hack", "passive income", "financial freedom", "unlimited".
- Runtime: roughly 90-150 seconds when spoken aloud at natural pace.
- End with a single clear CTA — not a summary, not a recap. Just tell them what to do next.
"""
        return await self.generate_script(prompt)


gemini_service = GeminiService()
