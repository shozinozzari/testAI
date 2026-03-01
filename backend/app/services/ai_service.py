import asyncio

class AIService:
    async def generate_vsl_script(self, business_desc: str, keywords: list, language: str = "en"):
        """
        """
        Generates a VSL script using Google Gemini.
        Format: "Scene: [Visual] | Audio: [Voiceover]"
        """
        from app.services.gemini_service import gemini_service
        
        prompt = f"""
        Write a high-converting Video Sales Letter (VSL) script for: {business_desc}
        Keywords: {', '.join(keywords)}
        Language: {language}

        Structure the script exactly like this for each scene:
        Scene X: [Visual Description] | Audio: [Voiceover text]

        Make it persuasive, addressing pain points and offering a solution. Max 60 seconds.
        """
        
        return await gemini_service.generate_script(prompt)

    async def generate_viral_hook(self, keyword: str):
        from app.services.gemini_service import gemini_service
        return await gemini_service.generate_viral_script(keyword)

ai_service = AIService()
