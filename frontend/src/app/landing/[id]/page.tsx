"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function LandingPage() {
    const params = useParams();
    const id = params?.id as string;

    // HOOKS
    const [pageData, setPageData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showVideo, setShowVideo] = useState(false);

    const API = process.env.NEXT_PUBLIC_API_URL;

    const resolveMediaUrl = (url?: string) => {
        if (!url) return "";
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        if (!API) return url;
        return `${API}${url.startsWith("/") ? "" : "/"}${url}`;
    };

    useEffect(() => {
        if (!id) return;
        const fetchPage = async () => {
            try {
                const res = await fetch(`${API}/api/v1/landing/${id}`);
                if (!res.ok) throw new Error("Landing page not found");
                const data = await res.json();
                setPageData(data);
                if (data?.vsl_url) {
                    setShowVideo(true);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPage();
    }, [id, API]);

    if (loading)
        return (
            <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-sm">Loading your page...</p>
                </div>
            </div>
        );

    if (error)
        return (
            <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold text-red-500 mb-2">Oops!</h1>
                <p className="text-gray-400">{error}</p>
            </div>
        );

    if (!pageData) return null;

    const pc = "#3B82F6";
    const ctaLink = `${API}${pageData.cta_link}`;

    const trustSignals = pageData.trust_signals || [];
    const credibilityMetrics = pageData.credibility_metrics || [];
    const videoBullets = pageData.video_bullets || [];
    const testimonials = pageData.testimonials || [];
    const faqs = pageData.faqs || [];

    const ctaText = pageData.cta_text || "Book Your Free Strategy Call";
    const ctaSupporting =
        pageData.cta_supporting_text ||
        "No sales pressure • Instant confirmation";
    const urgencyText = pageData.urgency_text || "Limited availability";
    const targetAudience = pageData.target_audience || "";
    const vslVideoUrl = resolveMediaUrl(pageData.vsl_url);
    const videoThumbnailUrl = resolveMediaUrl(pageData.video_thumbnail);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans antialiased selection:bg-blue-500/30">

            {/* ANIMATIONS */}
            <style jsx global>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes glowPulse {
                    0%,100% { box-shadow: 0 0 18px rgba(59,130,246,.35); }
                    50% { box-shadow: 0 0 46px rgba(59,130,246,.75); }
                }
                .fade { animation: fadeInUp .6s ease-out both; }
                .cta-glow { animation: glowPulse 2.5s ease-in-out infinite; }
                .cta-glow:hover { animation:none; transform: translateY(-2px); }
            `}</style>

            <main className="max-w-6xl mx-auto px-6">

                {/* HERO */}
                <section className="pt-14 md:pt-20 text-center">

                    {/* MICRO TRUST LINE */}
                    <p className="fade text-xs uppercase tracking-widest text-gray-500 mb-6 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 text-green-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        {pageData.micro_trust_text || "Trusted by growth-focused companies worldwide"}
                    </p>

                    {/* HEADLINE */}
                    <h1 className="fade text-[2.2rem] sm:text-5xl md:text-6xl font-black leading-[1.05] tracking-tight max-w-[22ch] mx-auto bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                        {pageData.headline}
                    </h1>

                    {/* SUBHEADLINE */}
                    <p className="fade text-lg md:text-xl text-gray-400 max-w-1xl mx-auto mt-6 leading-relaxed">
                        {pageData.subheadline}
                    </p>

                    {targetAudience && (
                        <p className="fade text-sm text-gray-500 italic mt-3">
                            For: {targetAudience}
                        </p>
                    )}

                    {/* VIDEO */}
                    <div className="fade mt-10 max-w-4xl mx-auto">
                        <div
                            className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer group"
                            onClick={() => setShowVideo(true)}
                        >
                            {showVideo && vslVideoUrl ? (
                                <video
                                    src={vslVideoUrl}
                                    controls
                                    autoPlay
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <>
                                    {videoThumbnailUrl && (
                                        <img
                                            src={videoThumbnailUrl}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            alt=""
                                        />
                                    )}

                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                                        <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border border-white/20 group-hover:scale-110 transition">
                                            <div className="ml-1 w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent"></div>
                                        </div>
                                        <p className="text-sm text-gray-200 mt-4">
                                            Watch how it works
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>


                    {/* Urgency — orange tone instead of red */}
                    <span className="mt-6 inline-block text-xs font-bold uppercase tracking-widest text-amber-400/90">
                        🔥 {urgencyText}
                    </span>


                    {/* Next available slot indicator */}
                    <p className="text-xs text-gray-500 mt-5 mb -7 flex items-center justify-center gap-1.5 text-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        {pageData.slot_availability_text || "Next available slot: Tomorrow"}
                    </p>

                    {/* PRIMARY CTA */}
                    <div className="mt-6 flex flex-col items-center">
                        <a
                            href={ctaLink}
                            className="cta-glow px-12 py-5 rounded-xl text-lg font-bold text-white"
                            style={{ backgroundColor: pc }}
                        >
                            {ctaText} →
                        </a>

                        {/* Micro-proof under primary CTA */}
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-yellow-500/80">
                            <span>★★★★★</span>
                            <span className="text-gray-500">Trusted by business owners</span>
                        </div>

                        {/* Improved friction removers */}
                        <div className="flex flex-col gap-3 mt-8 max-w-3xl mx-auto">
                            {(pageData.friction_points || [
                                "Concerned about a high-pressure sales pitch? This is a discovery session focused on your needs, not a hard sell.",
                                "Worried about technical complexity? We handle the implementation while you focus on strategy.",
                                "Unsure if this is right for you? We'll demonstrate specific use cases relevant to your industry.",
                                "Thinking about integration challenges? We specialize in seamless connection with your current tools.",
                                "Questioning the investment? We'll maintain a clear path to measurable ROI."
                            ]).map((point: string, idx: number) => (
                                <div key={idx} className="text-xs md:text-sm text-gray-400 text-center leading-relaxed px-4">
                                    <span className="text-green-400 mr-2 font-bold">✔</span>
                                    {point}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* TRUST STRIP */}
                {trustSignals.length > 0 && (
                    <section className="flex flex-wrap justify-center gap-3 mt-14">
                        {trustSignals.map((s: string, i: number) => (
                            <div key={i} className="px-4 py-2 bg-white/[0.03] border border-white/10 rounded-full text-sm text-gray-300 flex items-center gap-2">
                                <span className="text-green-400 text-xs">✓</span>{s}
                            </div>
                        ))}
                    </section>
                )}

                {/* BENEFITS */}
                {videoBullets.length > 0 && (
                    <section className="mt-20 max-w-6xl mx-auto">
                        <h3 className="text-3xl md:text-4xl font-bold mb-6 text-center">
                            What You'll Discover?
                        </h3>
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 hover:bg-white/[0.04] transition-colors">
                            <div className="grid md:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl mx-auto">
                                {videoBullets.map((b: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3 text-gray-300">
                                        <span className="text-green-400 shrink-0">▸</span>
                                        <span>{b}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}


                {/* METRICS */}
                {credibilityMetrics.length > 0 && (
                    <section className="mt-25 grid md:grid-cols-3 gap-6 text-center">
                        {credibilityMetrics.map((m: string, i: number) => (
                            <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl py-6 px-4 text-sm text-gray-300">
                                {m}
                            </div>
                        ))}
                    </section>
                )}

                {/* TESTIMONIALS */}
                {testimonials.length > 0 && (
                    <section className="mt-25">
                        <h3 className="text-3xl md:text-4xl font-bold mb-6 text-center">
                            Results From Clients
                        </h3>
                        <div className="grid md:grid-cols-3 gap-6">
                            {testimonials.map((t: any, i: number) => (
                                <div key={i} className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                                    <div className="text-yellow-400 text-sm mb-3">★★★★★</div>
                                    <p className="text-gray-300 text-sm italic">“{t.text}”</p>
                                    <p className="text-xs text-gray-500 mt-3 font-medium">— {t.name}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* FINAL CTA */}
                <section className="mt-24 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        {pageData.final_call_to_action_header || "Ready to Fill Your Calendar With Qualified Clients?"}
                    </h2>

                    <p className="text-gray-400 max-w-2xl mx-auto mb-8 whitespace-pre-line">
                        {pageData.body_copy}
                    </p>

                    <a
                        href={ctaLink}
                        className="cta-glow inline-flex px-14 py-6 rounded-xl text-xl font-bold text-white"
                        style={{ backgroundColor: pc }}
                    >
                        {ctaText}
                    </a>

                    <p className="mb-16 text-xs text-gray-500 mt-3">
                        🔒 {ctaSupporting}
                    </p>
                </section>




                {/* ═══════════ WHO THIS IS FOR / NOT FOR ═══════════ */}
                <section className="mb-16">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* FOR */}
                        <div className="bg-green-500/[0.04] border border-green-500/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-green-400 mb-4">✔ This Is For You If…</h3>
                            <ul className="space-y-3">
                                {(pageData.who_is_this_for && pageData.who_is_this_for.length > 0 ? pageData.who_is_this_for : ["You run an agency, consultancy, or service business", "You want qualified sales calls, not just leads", "You're ready to invest in a proven system", "You have a high-ticket offer worth promoting"]).map((item: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                                        <span className="text-green-400 mt-0.5">✓</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* NOT FOR */}
                        <div className="bg-red-500/[0.04] border border-red-500/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-red-400 mb-4">✖ This Is Not For You If…</h3>
                            <ul className="space-y-3">
                                {(pageData.who_is_this_not_for && pageData.who_is_this_not_for.length > 0 ? pageData.who_is_this_not_for : ["You sell low-ticket products under $500", "You're looking for a quick hack, not a system", "You're not ready to take calls", "You want to DIY everything yourself"]).map((item: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                                        <span className="text-red-400 mt-0.5">✖</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ═══════════ BODY COPY + FINAL CTA ═══════════ */}
                <section className="mb-16">
                    <div className="max-w-2xl mx-auto bg-gradient-to-b from-white/[0.04] to-transparent p-px rounded-3xl">
                        <div className="bg-[#0A0A0A] rounded-[23px] p-8 md:p-12 text-center">
                            <h2 className="text-2xl md:text-3xl font-bold mb-5">
                                {pageData.final_call_to_action_header || "Ready to Fill Your Calendar With Qualified Clients?"}
                            </h2>
                            <p className="text-gray-400 leading-relaxed mb-8 whitespace-pre-line">
                                {pageData.final_call_to_action_subtext || pageData.body_copy}
                            </p>

                            {/* Slot indicator */}
                            <p className="text-xs text-gray-500 mb-3 flex items-center justify-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                {pageData.slot_availability_text || "Next available slot: Tomorrow"}
                            </p>

                            {/* Urgency — orange tone */}
                            <span className="inline-block px-4 py-1.5 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wide rounded-full border border-amber-500/15 mb-5">
                                🔥 {urgencyText}
                            </span>

                            {/* Big CTA with glow */}
                            <div className="flex flex-col items-center gap-3">
                                <a href={ctaLink}
                                    className="cta-glow group relative w-full md:w-auto px-12 py-5 text-white font-bold text-xl rounded-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 overflow-hidden"
                                    style={{ backgroundColor: pc }}>
                                    <div className="absolute inset-0 bg-white/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <span className="relative">{ctaText}</span>
                                    <span className="relative group-hover:translate-x-1 transition-transform">→</span>
                                </a>

                                {/* Risk Reversal */}
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                    {ctaSupporting}
                                </div>

                                {/* Friction Points — improved copy */}
                                <div className="flex flex-wrap justify-center gap-4 mt-1">
                                    {(pageData.friction_points || ["Takes 30 seconds", "No sales pressure", "Instant confirmation"]).map((point: string, idx: number) => (
                                        <span key={idx} className="text-[11px] text-gray-500">✔ {point}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>


                {/* FAQ */}
                {faqs.length > 0 && (
                    <section className="mt-24 max-w-3xl mx-auto">
                        <h3 className="text-xl font-bold text-center mb-10">
                            Frequently Asked Questions
                        </h3>
                        <div className="space-y-6">
                            {faqs.map((f: any, i: number) => (
                                <div key={i}>
                                    <p className="font-semibold text-white">{f.q}</p>
                                    <p className="text-gray-400 text-sm mt-1">{f.a}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}





                <footer className="border-t border-white/5 py-8 mt-24 text-center text-xs text-gray-600">
                    © {new Date().getFullYear()} All rights reserved.
                </footer>
            </main>

            {/* MOBILE CTA */}
            <div className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-black/90 backdrop-blur-lg border-t border-white/5 px-4 py-3">
                <a
                    href={ctaLink}
                    className="block w-full text-center py-3.5 rounded-xl font-bold text-white text-sm"
                    style={{ backgroundColor: pc }}
                >
                    {ctaText}
                </a>
                <p className="text-[10px] text-gray-500 text-center mt-1">
                    ✔ No sales pressure • Instant confirmation
                </p>
            </div>

            <div className="h-20 md:hidden"></div>
        </div >


    );
}
