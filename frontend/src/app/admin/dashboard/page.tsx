"use client";

import { useState } from "react";

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        totalUsers: 142,
        activeCampaigns: 89,
        queuedJobs: 1450,
        failedJobs: 3,
        totalRevenue: "$4,250"
    });

    const [killSwitches, setKillSwitches] = useState({
        globalPause: false,
        pausePublishing: false,
        pauseKeywords: false
    });

    const toggleSwitch = (key: keyof typeof killSwitches) => {
        // TODO: Call API to update Redis/Firestore key
        setKillSwitches({ ...killSwitches, [key]: !killSwitches[key] });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-10 font-mono">
            <h1 className="text-3xl font-bold mb-8 text-red-500">ADMIN OPERATIONS CENTER</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-5 gap-4 mb-10">
                <div className="bg-black border border-zinc-800 p-4 rounded">
                    <div className="text-gray-500 text-xs uppercase">Total Users</div>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </div>
                <div className="bg-black border border-zinc-800 p-4 rounded">
                    <div className="text-gray-500 text-xs uppercase">Active Campaigns</div>
                    <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
                </div>
                <div className="bg-black border border-zinc-800 p-4 rounded">
                    <div className="text-gray-500 text-xs uppercase">Queued Jobs</div>
                    <div className="text-2xl font-bold text-yellow-500">{stats.queuedJobs}</div>
                </div>
                <div className="bg-black border border-zinc-800 p-4 rounded">
                    <div className="text-gray-500 text-xs uppercase">Failed Jobs</div>
                    <div className="text-2xl font-bold text-red-500">{stats.failedJobs}</div>
                </div>
                <div className="bg-black border border-zinc-800 p-4 rounded">
                    <div className="text-gray-500 text-xs uppercase">MRR estimate</div>
                    <div className="text-2xl font-bold text-green-500">{stats.totalRevenue}</div>
                </div>
            </div>

            {/* Emergency Controls */}
            <div className="mb-10">
                <h2 className="text-xl font-bold mb-4 border-b border-zinc-800 pb-2">EMERGENCY CONTROLS (KILL SWITCHES)</h2>
                <div className="grid grid-cols-3 gap-6">

                    <div className={`p-6 border rounded-xl flex items-center justify-between ${killSwitches.globalPause ? 'bg-red-900/20 border-red-500' : 'bg-black border-zinc-800'}`}>
                        <div>
                            <h3 className="font-bold">GLOBAL PAUSE</h3>
                            <p className="text-sm text-gray-500">Stops ALL background jobs instantly.</p>
                        </div>
                        <button
                            onClick={() => toggleSwitch('globalPause')}
                            className={`px-4 py-2 font-bold rounded ${killSwitches.globalPause ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                        >
                            {killSwitches.globalPause ? "ACTIVE" : "OFF"}
                        </button>
                    </div>

                    <div className={`p-6 border rounded-xl flex items-center justify-between ${killSwitches.pausePublishing ? 'bg-yellow-900/20 border-yellow-500' : 'bg-black border-zinc-800'}`}>
                        <div>
                            <h3 className="font-bold">PAUSE PUBLISHING</h3>
                            <p className="text-sm text-gray-500">Stops uploads to YouTube/Cloudinary.</p>
                        </div>
                        <button
                            onClick={() => toggleSwitch('pausePublishing')}
                            className={`px-4 py-2 font-bold rounded ${killSwitches.pausePublishing ? 'bg-yellow-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                        >
                            {killSwitches.pausePublishing ? "PAUSED" : "OFF"}
                        </button>
                    </div>

                    <div className={`p-6 border rounded-xl flex items-center justify-between ${killSwitches.pauseKeywords ? 'bg-blue-900/20 border-blue-500' : 'bg-black border-zinc-800'}`}>
                        <div>
                            <h3 className="font-bold">PAUSE KEYWORDS</h3>
                            <p className="text-sm text-gray-500">Stops new keyword scraping.</p>
                        </div>
                        <button
                            onClick={() => toggleSwitch('pauseKeywords')}
                            className={`px-4 py-2 font-bold rounded ${killSwitches.pauseKeywords ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                        >
                            {killSwitches.pauseKeywords ? "PAUSED" : "OFF"}
                        </button>
                    </div>

                </div>
            </div>

        </div>
    );
}
