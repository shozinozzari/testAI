"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";

const STATUSES = [
    { key: "NEW", label: "New", color: "bg-blue-500", dot: "bg-blue-400" },
    { key: "NA", label: "NA", color: "bg-gray-800", dot: "bg-gray-700" },
    { key: "CALLED", label: "Called", color: "bg-amber-500", dot: "bg-amber-400" },
    { key: "TEXTED", label: "Texted", color: "bg-cyan-500", dot: "bg-cyan-400" },
    { key: "DISQUALIFIED", label: "Disqualified", color: "bg-gray-500", dot: "bg-gray-400" },
    { key: "QUALIFIED", label: "Qualified", color: "bg-purple-500", dot: "bg-purple-400" },
    { key: "CONVERTED", label: "Converted", color: "bg-emerald-500", dot: "bg-emerald-400" },
    { key: "LOST", label: "Lost", color: "bg-red-500", dot: "bg-red-400" },
];

const SOURCES = ["YOUTUBE", "INSTAGRAM", "FACEBOOK", "TIKTOK", "WHATSAPP", "WEBSITE", "MANUAL", "OTHER"];

const SOURCE_COLORS: Record<string, string> = {
    YOUTUBE: "bg-red-500/20 text-red-300 border-red-500/30",
    INSTAGRAM: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    FACEBOOK: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    TIKTOK: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    WHATSAPP: "bg-green-500/20 text-green-300 border-green-500/30",
    WEBSITE: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    MANUAL: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    OTHER: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

const COUNTRIES = [
    { code: "+91", flag: "\ud83c\uddee\ud83c\uddf3", name: "India" },
    { code: "+1", flag: "\ud83c\uddfa\ud83c\uddf8", name: "United States" },
    { code: "+44", flag: "\ud83c\uddec\ud83c\udde7", name: "United Kingdom" },
    { code: "+971", flag: "\ud83c\udde6\ud83c\uddea", name: "UAE" },
    { code: "+966", flag: "\ud83c\uddf8\ud83c\udde6", name: "Saudi Arabia" },
    { code: "+61", flag: "\ud83c\udde6\ud83c\uddfa", name: "Australia" },
    { code: "+49", flag: "\ud83c\udde9\ud83c\uddea", name: "Germany" },
    { code: "+33", flag: "\ud83c\uddeb\ud83c\uddf7", name: "France" },
    { code: "+81", flag: "\ud83c\uddef\ud83c\uddf5", name: "Japan" },
    { code: "+86", flag: "\ud83c\udde8\ud83c\uddf3", name: "China" },
    { code: "+82", flag: "\ud83c\uddf0\ud83c\uddf7", name: "South Korea" },
    { code: "+55", flag: "\ud83c\udde7\ud83c\uddf7", name: "Brazil" },
    { code: "+52", flag: "\ud83c\uddf2\ud83c\uddfd", name: "Mexico" },
    { code: "+7", flag: "\ud83c\uddf7\ud83c\uddfa", name: "Russia" },
    { code: "+39", flag: "\ud83c\uddee\ud83c\uddf9", name: "Italy" },
    { code: "+34", flag: "\ud83c\uddea\ud83c\uddf8", name: "Spain" },
    { code: "+31", flag: "\ud83c\uddf3\ud83c\uddf1", name: "Netherlands" },
    { code: "+65", flag: "\ud83c\uddf8\ud83c\uddec", name: "Singapore" },
    { code: "+60", flag: "\ud83c\uddf2\ud83c\uddfe", name: "Malaysia" },
    { code: "+63", flag: "\ud83c\uddf5\ud83c\udded", name: "Philippines" },
    { code: "+62", flag: "\ud83c\uddee\ud83c\udde9", name: "Indonesia" },
    { code: "+66", flag: "\ud83c\uddf9\ud83c\udded", name: "Thailand" },
    { code: "+84", flag: "\ud83c\uddfb\ud83c\uddf3", name: "Vietnam" },
    { code: "+92", flag: "\ud83c\uddf5\ud83c\uddf0", name: "Pakistan" },
    { code: "+880", flag: "\ud83c\udde7\ud83c\udde9", name: "Bangladesh" },
    { code: "+94", flag: "\ud83c\uddf1\ud83c\uddf0", name: "Sri Lanka" },
    { code: "+977", flag: "\ud83c\uddf3\ud83c\uddf5", name: "Nepal" },
    { code: "+27", flag: "\ud83c\uddff\ud83c\udde6", name: "South Africa" },
    { code: "+234", flag: "\ud83c\uddf3\ud83c\uddec", name: "Nigeria" },
    { code: "+254", flag: "\ud83c\uddf0\ud83c\uddea", name: "Kenya" },
    { code: "+20", flag: "\ud83c\uddea\ud83c\uddec", name: "Egypt" },
    { code: "+90", flag: "\ud83c\uddf9\ud83c\uddf7", name: "Turkey" },
    { code: "+48", flag: "\ud83c\uddf5\ud83c\uddf1", name: "Poland" },
    { code: "+46", flag: "\ud83c\uddf8\ud83c\uddea", name: "Sweden" },
    { code: "+41", flag: "\ud83c\udde8\ud83c\udded", name: "Switzerland" },
    { code: "+353", flag: "\ud83c\uddee\ud83c\uddea", name: "Ireland" },
    { code: "+64", flag: "\ud83c\uddf3\ud83c\uddff", name: "New Zealand" },
    { code: "+1", flag: "\ud83c\udde8\ud83c\udde6", name: "Canada" },
];

export default function CRMPage() {
    const { user: authUser } = useAuth();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [showAddModal, setShowAddModal] = useState(false);
    const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", source: "MANUAL", gender: "", vibe: "", dreams_goals: "", call_summary: "", notes: "", follow_up: "", objections: "", pain_points: "", tags: "" });
    const [addLoading, setAddLoading] = useState(false);

    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState("");
    const countryRef = useRef<HTMLDivElement>(null);

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch)
    );

    const [selectedLead, setSelectedLead] = useState<any | null>(null);
    const [drawerNotes, setDrawerNotes] = useState("");
    const [drawerFollowUp, setDrawerFollowUp] = useState("");
    const [drawerObjections, setDrawerObjections] = useState("");
    const [drawerPainPoints, setDrawerPainPoints] = useState("");
    const [drawerTags, setDrawerTags] = useState("");
    const [drawerGender, setDrawerGender] = useState("");
    const [drawerVibe, setDrawerVibe] = useState("");
    const [drawerDreams, setDrawerDreams] = useState("");
    const [drawerCallSummary, setDrawerCallSummary] = useState("");
    const [savingDrawer, setSavingDrawer] = useState(false);
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const [sortByFollowUp, setSortByFollowUp] = useState(false);

    const API = process.env.NEXT_PUBLIC_API_URL;
    const getToken = async () => { if (!authUser) return null; return await authUser.getIdToken(); };

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (countryRef.current && !countryRef.current.contains(e.target as Node)) { setCountryDropdownOpen(false); setCountrySearch(""); }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    useEffect(() => { if (authUser) fetchLeads(); }, [authUser]);

    const fetchLeads = async () => {
        const token = await getToken(); if (!token) return;
        try { setLoading(true); const res = await fetch(`${API}/api/v1/leads/`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) setLeads(await res.json()); }
        catch (err) { console.error("Error fetching leads:", err); }
        finally { setLoading(false); }
    };

    const handleAddLead = async () => {
        if (!newLead.name) { alert("Name is required."); return; }
        setAddLoading(true);
        const token = await getToken(); if (!token) { setAddLoading(false); return; }
        try {
            const fullPhone = newLead.phone ? `${selectedCountry.code}${newLead.phone}` : "";
            const res = await fetch(`${API}/api/v1/leads/`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: newLead.name, email: newLead.email || undefined, phone: fullPhone || undefined, source: newLead.source, gender: newLead.gender || undefined, vibe: newLead.vibe || undefined, dreams_goals: newLead.dreams_goals, call_summary: newLead.call_summary, notes: newLead.notes, follow_up: newLead.follow_up || undefined, objections: newLead.objections, pain_points: newLead.pain_points, tags: newLead.tags ? newLead.tags.split(",").map(t => t.trim()).filter(Boolean) : [] }),
            });
            if (res.ok) { await fetchLeads(); setNewLead({ name: "", email: "", phone: "", source: "MANUAL", gender: "", vibe: "", dreams_goals: "", call_summary: "", notes: "", follow_up: "", objections: "", pain_points: "", tags: "" }); setSelectedCountry(COUNTRIES[0]); setShowAddModal(false); }
            else { const err = await res.json(); alert(`Failed: ${err.detail || "Unknown error"}`); }
        } catch (err) { console.error(err); alert("Failed to add lead."); }
        finally { setAddLoading(false); }
    };

    const handleStatusChange = async (leadId: string, newStatus: string) => {
        const token = await getToken(); if (!token) return;
        try {
            const res = await fetch(`${API}/api/v1/leads/${leadId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: newStatus }) });
            if (res.ok) { setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l)); if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, status: newStatus }); }
        } catch (err) { console.error(err); }
    };

    const handleDeleteLead = async (leadId: string) => {
        if (!confirm("Delete this lead?")) return;
        const token = await getToken(); if (!token) return;
        try {
            const res = await fetch(`${API}/api/v1/leads/${leadId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { setLeads(prev => prev.filter(l => l.id !== leadId)); if (selectedLead?.id === leadId) setSelectedLead(null); }
        } catch (err) { console.error(err); }
    };

    const handleSaveDrawer = async () => {
        if (!selectedLead) return; setSavingDrawer(true);
        const token = await getToken(); if (!token) { setSavingDrawer(false); alert("No auth token"); return; }
        try {
            const body = { notes: drawerNotes, gender: drawerGender || undefined, vibe: drawerVibe || undefined, dreams_goals: drawerDreams, call_summary: drawerCallSummary, follow_up: drawerFollowUp || undefined, objections: drawerObjections, pain_points: drawerPainPoints, tags: drawerTags.split(",").map(t => t.trim()).filter(Boolean) };
            const res = await fetch(`${API}/api/v1/leads/${selectedLead.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (res.ok) { const updated = await res.json(); setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l)); setSelectedLead(null); }
            else { const errData = await res.text(); console.error("Save failed:", res.status, errData); alert(`Save failed (${res.status}): ${errData}`); }
        } catch (err: any) { console.error("Save error:", err); alert(`Save error: ${err.message}`); }
        finally { setSavingDrawer(false); }
    };

    const openDrawer = (lead: any) => {
        setSelectedLead(lead); setDrawerNotes(lead.notes || ""); setDrawerFollowUp(lead.follow_up || "");
        setDrawerObjections(lead.objections || ""); setDrawerPainPoints(lead.pain_points || ""); setDrawerTags((lead.tags || []).join(", ")); setDrawerGender(lead.gender || "");
        setDrawerVibe(lead.vibe || ""); setDrawerDreams(lead.dreams_goals || ""); setDrawerCallSummary(lead.call_summary || "");
    };

    const fmtDT = (s: string) => { if (!s) return ""; const d = new Date(s); return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }); };
    const timeAgo = (s: string) => { if (!s) return ""; const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000); if (diff < 60) return "now"; if (diff < 3600) return `${Math.floor(diff / 60)}m`; if (diff < 86400) return `${Math.floor(diff / 3600)}h`; return `${Math.floor(diff / 86400)}d`; };

    const filtered = leads.filter(l => l.name?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search) || l.email?.toLowerCase().includes(search.toLowerCase()));
    const getLeadsByStatus = (status: string) => {
        const cols = filtered.filter(l => l.status === status);
        if (!sortByFollowUp) return cols;
        return [...cols].sort((a, b) => {
            if (!a.follow_up && !b.follow_up) return 0;
            if (!a.follow_up) return 1;
            if (!b.follow_up) return -1;
            return new Date(a.follow_up).getTime() - new Date(b.follow_up).getTime();
        });
    };

    const totalLeads = leads.length;
    const newToday = leads.filter(l => { if (!l.created_at) return false; return new Date(l.created_at).toDateString() === new Date().toDateString(); }).length;
    const convertedCount = leads.filter(l => l.status === "CONVERTED").length;
    const conversionRate = totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : "0";
    const now = new Date();
    const todayStr = now.toDateString();
    const followUpsDueToday = leads.filter(l => l.follow_up && new Date(l.follow_up).toDateString() === todayStr).length;
    const overdueCount = leads.filter(l => l.follow_up && new Date(l.follow_up) < now && new Date(l.follow_up).toDateString() !== todayStr).length;
    const isOverdue = (fu: string) => { if (!fu) return false; const d = new Date(fu); return d < now && d.toDateString() !== todayStr; };
    const isDueToday = (fu: string) => { if (!fu) return false; return new Date(fu).toDateString() === todayStr; };

    const quickSchedule = (days: number) => {
        const d = new Date(); d.setDate(d.getDate() + days); d.setHours(10, 0, 0, 0);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setDrawerFollowUp(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    };

    return (
        <div className="min-h-screen bg-black text-white flex">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-3 md:p-4 transition-all duration-300 overflow-hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">CRM Pipeline</h1>
                        <p className="text-gray-500 text-xs mt-0.5">Track and manage your leads</p>
                    </div>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Search..." className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500 w-44" value={search} onChange={e => setSearch(e.target.value)} />
                        <button onClick={() => setSortByFollowUp(!sortByFollowUp)} className={`px-3 py-2 rounded-lg transition font-medium text-xs whitespace-nowrap border ${sortByFollowUp ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-zinc-900 border-white/10 text-gray-400 hover:text-white hover:border-white/20"}`}>📅 Follow-up</button>
                        <button onClick={() => setShowAddModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition shadow-lg shadow-purple-500/20 font-medium text-xs whitespace-nowrap">+ Add Lead</button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                    {[
                        { label: "Total", value: totalLeads, color: "from-purple-500/20 to-purple-600/10 border-purple-500/20" },
                        { label: "New Today", value: newToday, color: "from-blue-500/20 to-blue-600/10 border-blue-500/20" },
                        { label: "Follow-ups", value: `${followUpsDueToday}${overdueCount > 0 ? ` (${overdueCount} ⚠️)` : ""}`, color: "from-amber-500/20 to-amber-600/10 border-amber-500/20" },
                        { label: "Won", value: convertedCount, color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20" },
                        { label: "Rate", value: `${conversionRate}%`, color: "from-pink-500/20 to-pink-600/10 border-pink-500/20" },
                    ].map(s => (
                        <div key={s.label} className={`bg-gradient-to-br ${s.color} border rounded-lg p-2.5 text-center`}>
                            <div className="text-lg font-bold text-white">{s.value}</div>
                            <div className="text-[10px] text-gray-400">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Kanban — flex columns, NO horizontal scroll */}
                {loading ? (
                    <div className="text-center text-gray-400 py-20 text-sm">Loading leads...</div>
                ) : (
                    <div className="grid grid-cols-8 gap-1.5" style={{ minHeight: "calc(100vh - 200px)" }}>
                        {STATUSES.map(col => {
                            const colLeads = getLeadsByStatus(col.key);
                            return (
                                <div key={col.key}
                                    className={`bg-zinc-900/60 border rounded-lg flex flex-col min-w-0 overflow-hidden transition-all duration-150 ${dragOverCol === col.key ? "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/10" : "border-white/5"}`}
                                    onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
                                    onDragLeave={() => setDragOverCol(null)}
                                    onDrop={e => { e.preventDefault(); setDragOverCol(null); if (draggedLeadId) { handleStatusChange(draggedLeadId, col.key); setDraggedLeadId(null); } }}
                                >
                                    {/* Column Header */}
                                    <div className="px-2 py-2 border-b border-white/5 flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`}></div>
                                        <span className="text-[11px] font-semibold text-white truncate">{col.label}</span>
                                        <span className="ml-auto text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-full flex-shrink-0">{colLeads.length}</span>
                                    </div>
                                    {/* Cards */}
                                    <div className="flex-1 overflow-y-auto p-1 space-y-1">
                                        {colLeads.map(lead => (
                                            <div key={lead.id}
                                                draggable
                                                onDragStart={e => { setDraggedLeadId(lead.id); e.dataTransfer.effectAllowed = "move"; }}
                                                onDragEnd={() => { setDraggedLeadId(null); setDragOverCol(null); }}
                                                onClick={() => openDrawer(lead)}
                                                className={`rounded-lg p-2 cursor-grab active:cursor-grabbing transition-all ${draggedLeadId === lead.id ? "opacity-40 scale-95" : ""} ${isOverdue(lead.follow_up) ? "bg-red-950/40 border border-red-500/40 hover:border-red-400/60 shadow-sm shadow-red-500/10" : isDueToday(lead.follow_up) ? "bg-amber-950/30 border border-amber-500/30 hover:border-amber-400/50" : "bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 hover:border-purple-500/30"}`}
                                            >
                                                <div className="text-[10px] text-gray-500 mb-0.5">{fmtDT(lead.created_at)}</div>
                                                <div className="font-semibold text-white text-[11px] truncate">{lead.name}</div>
                                                {lead.phone && <div className="text-[10px] text-gray-400 truncate mt-0.5">📱{lead.phone}</div>}
                                                {lead.follow_up && <div className={`text-[9px] mt-0.5 truncate font-medium ${isOverdue(lead.follow_up) ? "text-red-400" : isDueToday(lead.follow_up) ? "text-amber-400" : "text-amber-400/70"}`}>{isOverdue(lead.follow_up) ? "🔴" : isDueToday(lead.follow_up) ? "🟡" : "📅"} {fmtDT(lead.follow_up)}{isOverdue(lead.follow_up) ? " · OVERDUE" : isDueToday(lead.follow_up) ? " · TODAY" : ""}</div>}
                                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                    <span className={`text-[9px] px-1 py-0.5 rounded border leading-none ${SOURCE_COLORS[lead.source] || SOURCE_COLORS.OTHER}`}>{lead.source}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {colLeads.length === 0 && <div className="text-center text-gray-600 text-[10px] py-6">Empty</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Detail Drawer */}
            {selectedLead && (
                <>
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLead(null)}>
                        <div className="bg-zinc-900 p-5 rounded-2xl border border-white/10 w-full max-w-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-lg font-bold text-white">{selectedLead.name}</h2>
                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                                        <span>📅 {fmtDT(selectedLead.created_at)}</span>
                                        {selectedLead.phone && <span>📱 {selectedLead.phone}</span>}
                                        {selectedLead.email && <span>✉️ {selectedLead.email}</span>}
                                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded border ${SOURCE_COLORS[selectedLead.source] || SOURCE_COLORS.OTHER}`}>{selectedLead.source}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLead(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
                            </div>

                            {/* Stage Selector */}
                            <div className="mb-3">
                                <label className="block text-[11px] font-medium text-gray-400 mb-1">Move to Stage</label>
                                <div className="flex gap-1">
                                    {STATUSES.map(s => (
                                        <button key={s.key} onClick={() => handleStatusChange(selectedLead.id, s.key)}
                                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-medium ${selectedLead.status === s.key ? `${s.color} text-white border-transparent shadow-md` : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2-Column Grid */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-0.5">👤 Gender</label>
                                    <div className="flex gap-1.5">
                                        {["", "MALE", "FEMALE"].map(g => (
                                            <button key={g} onClick={() => setDrawerGender(g)}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${drawerGender === g ? "bg-purple-600 text-white border-transparent" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                                                {g === "" ? "Not Set" : g === "MALE" ? "♂ Male" : "♀ Female"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-0.5">📅 Follow Up</label>
                                    <input type="datetime-local" className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-purple-500 [color-scheme:dark] mb-1" value={drawerFollowUp} onChange={e => setDrawerFollowUp(e.target.value)} />
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => quickSchedule(1)} className="flex-1 text-[9px] py-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition">Tomorrow</button>
                                        <button type="button" onClick={() => quickSchedule(3)} className="flex-1 text-[9px] py-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition">+3 Days</button>
                                        <button type="button" onClick={() => quickSchedule(7)} className="flex-1 text-[9px] py-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition">+1 Week</button>
                                        <button type="button" onClick={() => setDrawerFollowUp("")} className="flex-1 text-[9px] py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">Clear</button>
                                    </div>
                                </div>

                                {/* Vibe — full width */}
                                <div className="col-span-2">
                                    <label className="block text-[11px] font-medium text-gray-400 mb-0.5">🌟 Vibe</label>
                                    <div className="flex gap-1.5">
                                        {["Friendly", "Excited", "Neutral", "Skeptical", "Aggressive"].map(v => (
                                            <button key={v} onClick={() => setDrawerVibe(drawerVibe === v ? "" : v)}
                                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition ${drawerVibe === v ? "bg-purple-600 text-white border-transparent" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                                                {v === "Friendly" ? "😊" : v === "Excited" ? "😄" : v === "Neutral" ? "😐" : v === "Skeptical" ? "🤨" : "😠"} {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Textareas in 2-col */}
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-0.5">✨ Dreams & Goals</label>
                                    <textarea className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none h-11" value={drawerDreams} onChange={e => setDrawerDreams(e.target.value)} placeholder="What do they want to achieve..." />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-0.5">📞 Call Summary</label>
                                    <textarea className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none h-11" value={drawerCallSummary} onChange={e => setDrawerCallSummary(e.target.value)} placeholder="Key takeaways from the call..." />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-0.5">🚫 Objections</label>
                                    <textarea className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none h-11" value={drawerObjections} onChange={e => setDrawerObjections(e.target.value)} placeholder="Price too high, timing..." />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-0.5">🎯 Pain Points</label>
                                    <textarea className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none h-11" value={drawerPainPoints} onChange={e => setDrawerPainPoints(e.target.value)} placeholder="Low conversions, no traffic..." />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-0.5">📝 Notes</label>
                                    <textarea className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none h-11" value={drawerNotes} onChange={e => setDrawerNotes(e.target.value)} placeholder="Add notes..." />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-0.5">🏷️ Tags</label>
                                    <input type="text" className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-purple-500" value={drawerTags} onChange={e => setDrawerTags(e.target.value)} placeholder="hot, follow-up, vip" />
                                </div>

                                {/* Buttons — full width */}
                                <div className="col-span-2 flex gap-2 mt-2">
                                    <button onClick={() => handleDeleteLead(selectedLead.id)} className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-sm transition">Delete</button>
                                    <button onClick={handleSaveDrawer} disabled={savingDrawer} className={`flex-1 py-2 rounded-lg font-bold text-white shadow-lg shadow-purple-500/25 transition ${savingDrawer ? "bg-purple-600/50 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}>
                                        {savingDrawer ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Add Lead Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 p-5 rounded-2xl border border-white/10 w-full max-w-3xl shadow-2xl">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-bold text-white">Add New Lead</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {/* Left Column */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">Full Name *</label>
                                <input type="text" className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white outline-none focus:border-purple-500" placeholder="John Doe" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">Email</label>
                                <input type="email" className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white outline-none focus:border-purple-500" placeholder="john@example.com" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">Phone</label>
                                <div className="flex gap-1">
                                    <div className="relative" ref={countryRef}>
                                        <button type="button" onClick={() => { setCountryDropdownOpen(!countryDropdownOpen); setCountrySearch(""); }}
                                            className="flex items-center gap-1 bg-black border border-white/20 rounded-lg px-2 py-2 text-white hover:border-purple-500 transition-colors min-w-[80px] text-xs">
                                            <span className="text-sm">{selectedCountry.flag}</span>
                                            <span className="font-medium">{selectedCountry.code}</span>
                                            <span className="text-gray-500 text-[9px] ml-auto">▼</span>
                                        </button>
                                        {countryDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-1 w-52 bg-zinc-800 border border-white/10 rounded-lg shadow-2xl z-[60] overflow-hidden">
                                                <div className="p-1.5 border-b border-white/10">
                                                    <input type="text" placeholder="Search..." className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-purple-500" value={countrySearch} onChange={e => setCountrySearch(e.target.value)} autoFocus />
                                                </div>
                                                <div className="max-h-36 overflow-y-auto">
                                                    {filteredCountries.map((c, idx) => (
                                                        <div key={`${c.code}-${c.name}-${idx}`} onClick={() => { setSelectedCountry(c); setCountryDropdownOpen(false); setCountrySearch(""); }}
                                                            className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition text-xs ${selectedCountry.code === c.code && selectedCountry.name === c.name ? "bg-purple-600/15 text-white" : "hover:bg-white/5 text-gray-300"}`}>
                                                            <span>{c.flag}</span><span className="flex-1">{c.name}</span><span className="text-gray-500 text-[10px] font-mono">{c.code}</span>
                                                        </div>
                                                    ))}
                                                    {filteredCountries.length === 0 && <div className="p-2 text-center text-gray-500 text-xs">No match</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <input type="text" className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-sm text-white outline-none focus:border-purple-500" placeholder="9876543210" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value.replace(/[^0-9]/g, "") })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">Source</label>
                                <select className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white outline-none focus:border-purple-500 appearance-none" value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })}>
                                    {SOURCES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">👤 Gender</label>
                                <div className="flex gap-1.5">
                                    {["MALE", "FEMALE"].map(g => (
                                        <button key={g} type="button" onClick={() => setNewLead({ ...newLead, gender: newLead.gender === g ? "" : g })}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${newLead.gender === g ? "bg-purple-600 text-white border-transparent" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                                            {g === "MALE" ? "♂ Male" : "♀ Female"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">📅 Follow Up</label>
                                <input type="datetime-local" className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white outline-none focus:border-purple-500 [color-scheme:dark]" value={newLead.follow_up} onChange={e => setNewLead({ ...newLead, follow_up: e.target.value })} />
                            </div>

                            {/* Vibe — full width */}
                            <div className="col-span-2">
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">🌟 Vibe</label>
                                <div className="flex gap-1.5">
                                    {["Friendly", "Excited", "Neutral", "Skeptical", "Aggressive"].map(v => (
                                        <button key={v} type="button" onClick={() => setNewLead({ ...newLead, vibe: newLead.vibe === v ? "" : v })}
                                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition ${newLead.vibe === v ? "bg-purple-600 text-white border-transparent" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                                            {v === "Friendly" ? "😊" : v === "Excited" ? "😄" : v === "Neutral" ? "😐" : v === "Skeptical" ? "🤨" : "😠"} {v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Textareas in 2-col */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">✨ Dreams & Goals</label>
                                <textarea className="w-full bg-black border border-white/20 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none h-11" placeholder="What they want to achieve..." value={newLead.dreams_goals} onChange={e => setNewLead({ ...newLead, dreams_goals: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">📞 Call Summary</label>
                                <textarea className="w-full bg-black border border-white/20 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none h-11" placeholder="Key takeaways from the call..." value={newLead.call_summary} onChange={e => setNewLead({ ...newLead, call_summary: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">🚫 Objections</label>
                                <textarea className="w-full bg-black border border-white/20 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none h-11" placeholder="Price too high, timing..." value={newLead.objections} onChange={e => setNewLead({ ...newLead, objections: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">🎯 Pain Points</label>
                                <textarea className="w-full bg-black border border-white/20 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none h-11" placeholder="Low conversions, no traffic..." value={newLead.pain_points} onChange={e => setNewLead({ ...newLead, pain_points: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">📝 Notes</label>
                                <textarea className="w-full bg-black border border-white/20 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500 resize-none h-11" placeholder="Any notes..." value={newLead.notes} onChange={e => setNewLead({ ...newLead, notes: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-400 mb-0.5">🏷️ Tags</label>
                                <input type="text" className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white outline-none focus:border-purple-500" placeholder="hot, vip" value={newLead.tags} onChange={e => setNewLead({ ...newLead, tags: e.target.value })} />
                            </div>

                            {/* Buttons — full width */}
                            <div className="col-span-2 flex gap-2 mt-2">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition font-medium text-gray-300 text-sm" disabled={addLoading}>Cancel</button>
                                <button onClick={handleAddLead} disabled={addLoading} className={`flex-1 py-2 rounded-lg transition font-bold text-white shadow-lg shadow-purple-500/25 text-sm ${addLoading ? "bg-purple-600/50 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}>
                                    {addLoading ? "Adding..." : "Add Lead"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
