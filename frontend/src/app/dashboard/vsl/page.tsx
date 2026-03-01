"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Copy, FileText, Check, X, Volume2, Pause, Play, RefreshCw, Mic, Film, Clock, Search, Clapperboard, Braces } from "lucide-react";

export default function VSLPage() {
    const { user: authUser } = useAuth();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedScript, setSelectedScript] = useState<any | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
    const [generatingScenesId, setGeneratingScenesId] = useState<string | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"script" | "scenes" | "json">("script");
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const API = process.env.NEXT_PUBLIC_API_URL;

    useEffect(() => {
        const fetchCampaigns = async () => {
            if (!authUser) return;
            const token = await authUser.getIdToken();
            try {
                const res = await fetch(`${API}/api/v1/campaigns/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Filter campaigns that have a VSL script
                    const vslCampaigns = data.filter((c: any) => c.vsl_script && c.vsl_script.trim().length > 0);
                    setCampaigns(vslCampaigns);
                }
            } catch (err) {
                console.error("Error fetching campaigns:", err);
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

    const generateAudio = async (campaignId: string) => {
        if (!authUser) return;
        setGeneratingAudioId(campaignId);
        try {
            const token = await authUser.getIdToken();
            const res = await fetch(`${API}/api/v1/campaigns/${campaignId}/generate-audio`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Update the campaign in state with the new audio URL and scene segments
                setCampaigns(prev => prev.map(c =>
                    c.id === campaignId ? { ...c, vsl_audio_url: data.vsl_audio_url, scene_segments: data.scene_segments } : c
                ));
                if (selectedScript?.id === campaignId) {
                    setSelectedScript((prev: any) => ({ ...prev, vsl_audio_url: data.vsl_audio_url, scene_segments: data.scene_segments }));
                }
            } else {
                const err = await res.json();
                alert(err.detail || "Audio generation failed");
            }
        } catch (err) {
            console.error("Audio generation error:", err);
            alert("Failed to generate audio. Please try again.");
        } finally {
            setGeneratingAudioId(null);
        }
    };

    const generateScenes = async (campaignId: string) => {
        if (!authUser) return;
        setGeneratingScenesId(campaignId);
        try {
            const token = await authUser.getIdToken();
            const res = await fetch(`${API}/api/v1/campaigns/${campaignId}/generate-scenes`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Update the campaign in state with the new scene segments
                setCampaigns(prev => prev.map(c =>
                    c.id === campaignId ? { ...c, scene_segments: data.scene_segments } : c
                ));
                if (selectedScript?.id === campaignId) {
                    setSelectedScript((prev: any) => ({ ...prev, scene_segments: data.scene_segments }));
                }
            } else {
                const err = await res.json();
                alert(err.detail || "Scene generation failed");
            }
        } catch (err) {
            console.error("Scene generation error:", err);
            alert("Failed to generate scenes. Please try again.");
        } finally {
            setGeneratingScenesId(null);
        }
    };

    const togglePlay = (audioUrl: string, campId: string) => {
        const fullUrl = `${API}${audioUrl}`;

        if (playingId === campId && audioRef.current) {
            audioRef.current.pause();
            setPlayingId(null);
            return;
        }

        // Stop any existing playback
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        const audio = new Audio(fullUrl);
        audioRef.current = audio;
        setPlayingId(campId);

        audio.play().catch(err => {
            console.error("Audio playback error:", err);
            setPlayingId(null);
        });

        audio.onended = () => {
            setPlayingId(null);
            audioRef.current = null;
        };
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-black text-white flex">
            <Sidebar />

            <main className="flex-1 md:ml-64 p-6 md:p-10 transition-all duration-300">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        Video Sales Letters
                    </h1>
                    <p className="text-gray-400 mt-1">
                        View and manage your AI-generated VSL scripts & audio.
                    </p>
                </header>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading scripts...</div>
                ) : campaigns.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📝</div>
                        <h3 className="text-xl font-semibold mb-2">No scripts found</h3>
                        <p className="text-gray-400 mb-6">Create a campaign to generate your first VSL script.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map((camp) => (
                            <div key={camp.id} className="group bg-zinc-900/50 border border-white/10 hover:border-purple-500/30 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-purple-500/10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="min-w-0 pr-2">
                                        <h3 className="font-bold text-lg truncate text-white group-hover:text-purple-400 transition-colors">
                                            {camp.business_name || "Untitled Campaign"}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                                {camp.cta_option}
                                            </span>
                                            {camp.anchor_voice && (
                                                <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Mic size={10} />
                                                    {camp.anchor_voice}
                                                </span>
                                            )}
                                            {camp.scene_segments && camp.scene_segments.length > 0 && (
                                                <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Film size={10} />
                                                    {camp.scene_segments.length} scenes
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 mb-4 relative">
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/90 pointer-events-none"></div>
                                    <pre className="text-sm text-gray-400 whitespace-pre-wrap font-sans h-32 overflow-hidden">
                                        {camp.vsl_script}
                                    </pre>
                                </div>

                                {/* Audio Player Section */}
                                <div className="mb-4">
                                    {camp.vsl_audio_url ? (
                                        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/20 border border-purple-500/20 rounded-xl p-3 flex items-center gap-3">
                                            <button
                                                onClick={() => togglePlay(camp.vsl_audio_url, camp.id)}
                                                className="w-10 h-10 flex-shrink-0 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center transition-all shadow-lg shadow-purple-500/30 hover:scale-105"
                                            >
                                                {playingId === camp.id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-purple-300 font-semibold mb-1 flex items-center gap-1">
                                                    <Volume2 size={12} />
                                                    VSL Audio Ready
                                                </div>
                                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all ${playingId === camp.id ? "animate-pulse w-full" : "w-0"}`}></div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => generateAudio(camp.id)}
                                                disabled={generatingAudioId === camp.id}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                                title="Regenerate Audio"
                                            >
                                                <RefreshCw size={14} className={generatingAudioId === camp.id ? "animate-spin" : ""} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => generateAudio(camp.id)}
                                            disabled={generatingAudioId === camp.id}
                                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-500/20 hover:border-purple-500/40 text-purple-300 text-sm font-medium py-3 rounded-xl transition-all"
                                        >
                                            {generatingAudioId === camp.id ? (
                                                <>
                                                    <RefreshCw size={14} className="animate-spin" />
                                                    <span>Generating Audio...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Volume2 size={14} />
                                                    <span>Generate Audio</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-auto pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => setSelectedScript(camp)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-sm font-medium py-2 rounded-lg transition-colors border border-white/10 hover:border-white/20"
                                    >
                                        <FileText size={14} />
                                        <span>Read Script</span>
                                    </button>
                                    <button
                                        onClick={() => copyToClipboard(camp.vsl_script, camp.id)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-sm font-medium py-2 rounded-lg transition-colors border border-purple-500/20 hover:border-purple-500/30"
                                    >
                                        {copiedId === camp.id ? <Check size={14} /> : <Copy size={14} />}
                                        <span>{copiedId === camp.id ? "Copied" : "Copy"}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Script Modal */}
            {selectedScript && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedScript(null)}>
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-white/10">
                            <div>
                                <h2 className="text-xl font-bold">{selectedScript.business_name || "VSL Script"}</h2>
                                <p className="text-sm text-gray-400">Generated Script & Scene Breakdown</p>
                            </div>
                            <button
                                onClick={() => setSelectedScript(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Audio Player in Modal */}
                        {selectedScript.vsl_audio_url && (
                            <div className="px-6 pt-4">
                                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/20 border border-purple-500/20 rounded-xl p-4 flex items-center gap-4">
                                    <button
                                        onClick={() => togglePlay(selectedScript.vsl_audio_url, selectedScript.id)}
                                        className="w-12 h-12 flex-shrink-0 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center transition-all shadow-lg shadow-purple-500/30 hover:scale-105"
                                    >
                                        {playingId === selectedScript.id ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                                    </button>
                                    <div className="flex-1">
                                        <div className="text-sm text-purple-300 font-semibold mb-1 flex items-center gap-2">
                                            <Volume2 size={14} />
                                            Listen to VSL Audio
                                            {selectedScript.anchor_voice && (
                                                <span className="text-xs bg-purple-800/50 px-2 py-0.5 rounded-full">
                                                    Voice: {selectedScript.anchor_voice}
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all ${playingId === selectedScript.id ? "animate-pulse w-full" : "w-0"}`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="px-6 pt-4">
                            <div className="flex gap-2 bg-black/30 p-1 rounded-lg w-fit">
                                <button
                                    onClick={() => setActiveTab("script")}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "script" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
                                >
                                    <FileText size={16} />
                                    Script
                                </button>
                                <button
                                    onClick={() => setActiveTab("scenes")}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "scenes" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
                                >
                                    <Clapperboard size={16} />
                                    Scene Breakdown
                                    {selectedScript.scene_segments?.length > 0 && (
                                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{selectedScript.scene_segments.length}</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab("json")}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "json" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
                                >
                                    <Braces size={16} />
                                    JSON
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-black/20">
                            {activeTab === "script" ? (
                                <article className="prose prose-invert max-w-none prose-headings:text-purple-400 prose-p:text-gray-300">
                                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                                        {selectedScript.vsl_script}
                                    </pre>
                                </article>
                            ) : activeTab === "json" ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <Braces size={20} className="text-green-400" />
                                            Scene Segments JSON
                                        </h3>
                                        <button
                                            onClick={() => copyToClipboard(JSON.stringify(selectedScript.scene_segments || [], null, 2), 'json')}
                                            className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm flex items-center gap-2 transition text-green-300"
                                        >
                                            {copiedId === 'json' ? <Check size={14} /> : <Copy size={14} />}
                                            {copiedId === 'json' ? "Copied!" : "Copy JSON"}
                                        </button>
                                    </div>
                                    <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 overflow-x-auto">
                                        <pre className="text-sm text-green-300 font-mono whitespace-pre">
                                            {JSON.stringify(selectedScript.scene_segments || [], null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {!selectedScript.scene_segments || selectedScript.scene_segments.length === 0 ? (
                                        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                                            <Film className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                                            <h3 className="text-lg font-semibold mb-2">No Scene Breakdown Yet</h3>
                                            <p className="text-gray-400 mb-4 text-sm">Generate scene segments to get stock footage recommendations.</p>
                                            <button
                                                onClick={() => generateScenes(selectedScript.id)}
                                                disabled={generatingScenesId === selectedScript.id}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition flex items-center gap-2 mx-auto"
                                            >
                                                {generatingScenesId === selectedScript.id ? (
                                                    <>
                                                        <RefreshCw size={16} className="animate-spin" />
                                                        Analyzing Audio...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Film size={16} />
                                                        Generate Scene Breakdown
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                                    <Clapperboard size={20} className="text-blue-400" />
                                                    Stock Footage Recommendations
                                                </h3>
                                                <button
                                                    onClick={() => generateScenes(selectedScript.id)}
                                                    disabled={generatingScenesId === selectedScript.id}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm flex items-center gap-2 transition"
                                                >
                                                    <RefreshCw size={14} className={generatingScenesId === selectedScript.id ? "animate-spin" : ""} />
                                                    Regenerate
                                                </button>
                                            </div>
                                            {selectedScript.scene_segments.map((scene: any, index: number) => (
                                                <div key={index} className="bg-zinc-800/50 border border-white/10 rounded-xl p-4 hover:border-blue-500/30 transition">
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 font-bold">
                                                            {index + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Clock size={14} className="text-gray-400" />
                                                                <span className="text-sm font-mono text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded">
                                                                    {scene.time_range}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-300 text-sm mb-3">
                                                                {scene.visual_description}
                                                            </p>
                                                            <div className="bg-black/30 border border-white/5 rounded-lg p-3">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <Search size={14} className="text-green-400 flex-shrink-0" />
                                                                        <span className="text-xs text-gray-500 flex-shrink-0">Stock Query:</span>
                                                                        <code className="text-green-300 text-sm truncate">{scene.stock_query}</code>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => copyToClipboard(scene.stock_query, `scene-${index}`)}
                                                                        className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded transition"
                                                                        title="Copy search query"
                                                                    >
                                                                        {copiedId === `scene-${index}` ? (
                                                                            <Check size={14} className="text-green-400" />
                                                                        ) : (
                                                                            <Copy size={14} className="text-gray-400" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/10 flex justify-between items-center gap-3 bg-zinc-900 rounded-b-2xl">
                            <div className="flex items-center gap-2">
                                {!selectedScript.vsl_audio_url && (
                                    <button
                                        onClick={() => generateAudio(selectedScript.id)}
                                        disabled={generatingAudioId === selectedScript.id}
                                        className="px-4 py-2.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-purple-300 font-medium rounded-lg hover:from-purple-600/30 hover:to-pink-600/30 transition flex items-center gap-2"
                                    >
                                        {generatingAudioId === selectedScript.id ? (
                                            <>
                                                <RefreshCw size={16} className="animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Volume2 size={16} />
                                                Generate Audio
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedScript(null)}
                                    className="px-6 py-2.5 text-gray-300 hover:text-white font-medium hover:bg-white/5 rounded-lg transition"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        copyToClipboard(selectedScript.vsl_script, 'modal');
                                    }}
                                    className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition shadow-lg shadow-purple-500/25 flex items-center gap-2"
                                >
                                    {copiedId === 'modal' ? <Check size={18} /> : <Copy size={18} />}
                                    {copiedId === 'modal' ? "Copied to Clipboard" : "Copy Full Script"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
