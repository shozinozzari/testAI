import httpx
import asyncio
import hashlib
from typing import List, Set
from app.services.firebase_service import firebase_service

class KeywordService:
    def __init__(self):
        self.google_url = "http://suggestqueries.google.com/complete/search?client=chrome&q={}"
        self.youtube_url = "http://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q={}"
        
        # Huge list of modifiers as requested
        self.modifiers = [
            "buy", "purchase", "shop", "order", "deal", "discount", "coupon", "sale", 
            "need", "want", "must have", "required", "now", "immediately", "quick", "fast", 
            "price", "cost", "budget", "affordable", "delivery", "online", "remote", "digital",
            "recommend", "suggest", "endorse", "approve", "branded", "improve", "enhance", 
            "increase", "benefit", "solve", "fix", "resolve", "answer", "get", "acquire", 
            "obtain", "secure", "quality", "durable", "reliable", "efficient", "results", 
            "outcome", "impact", "effect", "review", "rating", "feedback", "testimonial", 
            "shipping", "freight", "size", "color", "weight", "capacity", "limited time", 
            "limited edition", "special offer", "compare", "compared to", "versus", "vs.", 
            "certified", "endorsed by", "recommended by", "approved by", "for home", 
            "for work", "for travel", "for outdoor", "happy", "joyful", "excited", "pleased", 
            "trust", "guaranteed", "secure", "customer", "client", "buyer", "consumer", 
            "easy", "simple", "user-friendly", "intuitive", "alternatives", "reviews", 
            "best", "price comparison", "options", "how to buy now", "best place to buy", 
            "on sale", "promo", "where to buy", "order online", "near me", "how much is", 
            "how", "what", "guide", "tips", "where", "why", "quickly", "buy now", 
            "purchase online", "order today", "checkout", "add to cart", "pay now", 
            "instant purchase", "one-click buy", "subscribe", "book now", "enroll now", 
            "sign up", "get started", "start today", "lowest price", "best deal", "cheap", 
            "under", "price drop", "clearance", "flash sale", "special price", 
            "limited discount", "bulk price", "wholesale", "emi available", "no cost emi", 
            "cash on delivery", "free trial", "money back", "refund policy", "last chance", 
            "ending soon", "while stocks last", "only today", "few left", "selling out", 
            "back in stock", "restock", "pre order", "early access", "exclusive deal", 
            "money-back guarantee", "warranty", "return policy", "authentic", "original", 
            "verified", "trusted brand", "official store", "safe payment", "secure checkout", 
            "scam or legit", "is it worth it", "proof", "case study", "best alternative", 
            "better than", "worth buying", "pros and cons", "comparison chart", 
            "which is better", "top rated", "editor’s choice", "recommended option", 
            "#1 choice", "market leader", "for beginners", "for professionals", 
            "for small business", "for startups", "for students", "for creators", 
            "for agencies", "for enterprises", "personal use", "commercial use", 
            "fix problem fast", "stop problem", "avoid problem", "replace product", 
            "upgrade from", "switch to", "alternative to", "better solution for", 
            "tool for", "software for", "service for", "available in city", "local dealer", 
            "authorized seller", "same day delivery", "next day delivery", 
            "worldwide shipping", "india price", "usa price", "uae price", "demo", 
            "free demo", "live demo", "trial version", "sample", "walkthrough", "tutorial", 
            "how it works", "features", "specifications", "what’s included", "after buying", 
            "setup guide", "installation", "how to use", "support", "customer service", 
            "help desk", "documentation", "is worth buying", "should i buy", "best to buy", 
            "where can i buy", "which is best", "how much does cost", "price in india", 
            "price in usa", "price in uae", "discount today", "vs competitors"
        ]
        
        self.alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"

    async def fetch_suggestions(self, client: httpx.AsyncClient, query: str, source: str = "google") -> List[str]:
        url = self.google_url if source == "google" else self.youtube_url
        try:
            response = await client.get(url.format(query), timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                # Google/YT return [query, [suggestion1, ...], ...]
                if len(data) > 1 and isinstance(data[1], list):
                    return data[1]
        except Exception as e:
            print(f"Error fetching {source} suggestions for '{query}': {e}")
        return []

    async def expand_keywords(self, base_keyword: str) -> List[str]:
        # 1. Generate variations
        variations = set([base_keyword])
        
        # A-Z Expansion (Prefix/Suffix)
        for char in self.alphabet:
            variations.add(f"{base_keyword} {char}")
            variations.add(f"{char} {base_keyword}")
            
        # Modifier Expansion
        for mod in self.modifiers:
             variations.add(f"{base_keyword} {mod}")
             variations.add(f"{mod} {base_keyword}")
        
        print(f"Generated {len(variations)} seed variations for '{base_keyword}'")
        
        # 2. Fetch Autocomplete for each variation
        all_keywords = set()
        
        async with httpx.AsyncClient() as client:
            tasks = []
            for query in variations:
                # Add delay or limiter here if needed to avoid blocking
                tasks.append(self.fetch_suggestions(client, query, "google"))
                tasks.append(self.fetch_suggestions(client, query, "youtube"))
                
                # Batch requests to avoid overwhelming
                if len(tasks) >= 50:
                    results = await asyncio.gather(*tasks)
                    for res in results:
                        all_keywords.update(res)
                    tasks = []
                    await asyncio.sleep(0.5) # Politeness delay
            
            # Clean up remaining tasks
            if tasks:
                results = await asyncio.gather(*tasks)
                for res in results:
                    all_keywords.update(res)

        return list(all_keywords)

    async def process_and_store(self, campaign_id: str, base_keyword: str):
        print(f"Starting keyword extraction for {campaign_id} based on '{base_keyword}'")
        
        raw_keywords = await self.expand_keywords(base_keyword)
        print(f"Fetched {len(raw_keywords)} raw keywords.")
        
        # Deduplicate, Normalize, Filter
        processed_keywords = []
        seen_hashes = set()
        
        for kw in raw_keywords:
            normalized = kw.lower().strip()
            kw_hash = hashlib.md5(normalized.encode()).hexdigest()
            
            if kw_hash in seen_hashes:
                continue
            
            seen_hashes.add(kw_hash)
            
            # Simple Scoring (Mock logic)
            score = 10
            for mod in self.modifiers:
                if mod in normalized:
                    score += 5
            
            processed_keywords.append({
                "keyword": normalized,
                "score": score,
                "hash": kw_hash,
                "campaign_id": campaign_id,
                "source": "autocomplete",
                "used": False
            })

        # Cap at 5000-10000
        processed_keywords = sorted(processed_keywords, key=lambda x: x['score'], reverse=True)[:5000]
        
        # Store in Firestore (Batch)
        # Using a subcollection 'keywords' under 'campaigns' seems appropriate
        # or a root collection 'keywords' with campaign_id index
        batch_size = 400
        total = 0
        
        # Getting db reference from firebase_service
        db = firebase_service.db
        
        # Using root collection 'keywords' for easier querying
        chunks = [processed_keywords[i:i + batch_size] for i in range(0, len(processed_keywords), batch_size)]
        
        for chunk in chunks:
            batch = db.batch()
            for kw_data in chunk:
                ref = db.collection("keywords").document() # Auto-ID
                batch.set(ref, kw_data)
            batch.commit()
            total += len(chunk)
            print(f"Stored {total} keywords...")

        print(f"Finished. Stored {total} unique keywords for {campaign_id}.")
        return total

keyword_service = KeywordService()
