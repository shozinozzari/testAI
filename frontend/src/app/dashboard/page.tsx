"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
    const { user: authUser } = useAuth();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const API = process.env.NEXT_PUBLIC_API_URL;

    const getToken = async () => {
        if (!authUser) return null;
        return await authUser.getIdToken();
    };

    const fetchCampaigns = async () => {
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/v1/campaigns/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setCampaigns(await res.json());
        } catch (err) {
            console.error("Error fetching campaigns:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCampaigns(); }, [authUser]);

    // Poll if any campaign is processing
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (campaigns.some(c => c.status === 'processing')) {
            interval = setInterval(fetchCampaigns, 5000);
        }
        return () => clearInterval(interval);
    }, [campaigns]);

    // Close menu on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleToggle = async (id: string) => {
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/v1/campaigns/${id}/toggle`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const updated = await res.json();
                setCampaigns(prev => prev.map(c => c.id === id ? { ...c, is_active: updated.is_active } : c));
            }
        } catch (err) { console.error(err); }
        setOpenMenu(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this campaign?")) return;
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/v1/campaigns/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setCampaigns(prev => prev.filter(c => c.id !== id));
        } catch (err) { console.error(err); }
        setOpenMenu(null);
    };

    const handleDuplicate = async (id: string) => {
        const token = await getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/v1/campaigns/${id}/duplicate`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const newCamp = await res.json();
                setCampaigns(prev => [...prev, newCamp]);
            }
        } catch (err) { console.error(err); }
        setOpenMenu(null);
    };

    return (
        <div className="min-h-screen bg-black text-white flex">
            <Sidebar />

            <main className="flex-1 md:ml-64 p-6 md:p-10 transition-all duration-300">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold">Campaigns</h1>
                        <p className="text-gray-400 mt-1">Manage your video funnels and automation.</p>
                    </div>
                    <Link href="/create" className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 transition shadow-lg shadow-purple-500/25 flex items-center gap-2">
                        <span>+ New Campaign</span>
                    </Link>
                </header>

                {/* Campaigns Grid */}
                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading campaigns...</div>
                ) : (
                    <div className="grid gap-6">
                        {campaigns.map((camp) => (
                            <div key={camp.id} className="p-6 bg-zinc-900/50 border border-white/10 rounded-xl hover:border-purple-500/30 transition group relative">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold group-hover:text-purple-400 transition-colors truncate">
                                                {camp.business_name || "Untitled"}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${camp.is_active !== false
                                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                                }`}>
                                                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${camp.is_active !== false ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-yellow-400"
                                                    }`}></span>
                                                {camp.is_active !== false ? "Active" : "Paused"}
                                            </span>
                                            {camp.status && camp.status !== 'completed' && (
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${
                                                    camp.status === 'processing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                    camp.status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''
                                                }`}>
                                                    {camp.status === 'processing' && (
                                                        <svg className="animate-spin inline-block w-3 h-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    )}
                                                    {camp.status === 'processing' ? 'Generating...' : camp.status}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400">
                                            Objective: {camp.cta_option || "—"} • Socials: {(camp.connected_socials || []).length}
                                        </p>
                                        {camp.status === 'error' && camp.error_message && (
                                            <p className="text-xs text-red-400 mt-1 line-clamp-2" title={camp.error_message}>{camp.error_message}</p>
                                        )}

                                        {/* Landing Page Details */}
                                        {camp.cta_option === 'CALL_BOOKING' && (
                                            <div className="mt-3 flex items-center gap-2 text-xs">
                                                <div className="w-[60%] flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded border border-white/5 group-hover:border-white/10 transition-colors min-w-0">
                                                    <span className="text-gray-500 font-medium shrink-0">URL</span>
                                                    <code className="text-gray-300 font-mono truncate">
                                                        {typeof window !== 'undefined' ? window.location.origin : ''}/landing/{camp.id}
                                                    </code>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Link
                                                        href={`/landing/${camp.id}`}
                                                        target="_blank"
                                                        title="View Landing Page"
                                                        className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-md transition-all"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            navigator.clipboard.writeText(`${window.location.origin}/landing/${camp.id}`);
                                                            const btn = e.currentTarget;
                                                            const originalClass = btn.className;
                                                            btn.classList.add("text-green-400", "bg-green-400/10");
                                                            setTimeout(() => {
                                                                btn.classList.remove("text-green-400", "bg-green-400/10");
                                                            }, 1000);
                                                        }}
                                                        title="Copy Link"
                                                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-all"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0 ml-4">
                                        {/* On/Off Toggle Switch */}
                                        <button
                                            onClick={() => handleToggle(camp.id)}
                                            title={camp.is_active !== false ? "Pause Campaign" : "Activate Campaign"}
                                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${camp.is_active !== false ? "bg-green-500" : "bg-zinc-600"
                                                }`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${camp.is_active !== false ? "translate-x-5" : "translate-x-0"
                                                }`}></span>
                                        </button>

                                        {/* Edit Button */}
                                        <Link
                                            href={`/create?edit=${camp.id}`}
                                            title="Edit Campaign"
                                            className="p-2 rounded-lg text-sm bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </Link>

                                        {/* Duplicate Button */}
                                        <button
                                            onClick={() => handleDuplicate(camp.id)}
                                            title="Duplicate Campaign"
                                            className="p-2 rounded-lg text-sm bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDelete(camp.id)}
                                            title="Delete Campaign"
                                            className="p-2 rounded-lg text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && campaigns.length === 0 && (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📹</div>
                        <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
                        <p className="text-gray-400 mb-6">Launch your first automated video funnel today to start getting leads.</p>
                        <Link href="/create" className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 transition">
                            Create First Campaign
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
