"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { ExternalLink, Copy, Check } from "lucide-react";

export default function LandingPages() {
    const { user: authUser } = useAuth();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const API = process.env.NEXT_PUBLIC_API_URL;

    // Fetch campaigns to get landing page data
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const fetchCampaigns = async () => {
            if (!authUser) return;
            const token = await authUser.getIdToken();
            try {
                const res = await fetch(`${API}/api/v1/campaigns/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // filter only active campaigns if needed, or show all
                    setCampaigns(data);
                }
            } catch (err) {
                console.error("Error fetching actions:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaigns();
    }, [authUser, API]);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!mounted) return <div className="min-h-screen bg-black text-white flex"><Sidebar /><main className="flex-1 md:ml-64 p-10"><div className="text-gray-400">Loading...</div></main></div>;

    return (
        <div className="min-h-screen bg-black text-white flex">
            <Sidebar />

            <main className="flex-1 md:ml-64 p-6 md:p-10 transition-all duration-300">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        Landing Pages
                    </h1>
                    <p className="text-gray-400 mt-1">
                        View and manage the generated landing pages for your campaigns.
                    </p>
                </header>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading landing pages...</div>
                ) : campaigns.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📄</div>
                        <h3 className="text-xl font-semibold mb-2">No landing pages found</h3>
                        <p className="text-gray-400 mb-6">Create a campaign to generate your first landing page.</p>
                        <Link href="/create" className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 transition">
                            Create Campaign
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map((camp) => {
                            const origin = typeof window !== 'undefined' ? window.location.origin : '';
                            const landingUrl = `${origin}/landing/${camp.id}`;

                            return (
                                <div key={camp.id} className="group bg-zinc-900/50 border border-white/10 hover:border-purple-500/30 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-purple-500/10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="min-w-0 pr-2">
                                            <h3 className="font-bold text-lg truncate text-white group-hover:text-purple-400 transition-colors">
                                                {camp.business_name || "Untitled Campaign"}
                                            </h3>
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider mt-1 ${camp.is_active !== false
                                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                    : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${camp.is_active !== false ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}></span>
                                                {camp.is_active !== false ? "Live" : "Paused"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="bg-black/40 rounded-lg p-3 border border-white/5 mb-4 group-hover:border-purple-500/20 transition-colors">
                                            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Target URL</div>
                                            <div onClick={() => window.open(landingUrl, '_blank')} className="text-xs text-purple-300 font-mono truncate cursor-pointer hover:underline hover:text-purple-200 transition-colors">
                                                /landing/{camp.id}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-auto pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => window.open(landingUrl, '_blank')}
                                            className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-sm font-medium py-2 rounded-lg transition-colors border border-white/10 hover:border-white/20"
                                        >
                                            <ExternalLink size={14} />
                                            <span>View</span>
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(landingUrl, camp.id)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-sm font-medium py-2 rounded-lg transition-colors border border-purple-500/20 hover:border-purple-500/30"
                                        >
                                            {copiedId === camp.id ? <Check size={14} /> : <Copy size={14} />}
                                            <span>{copiedId === camp.id ? "Copied" : "Copy Link"}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
