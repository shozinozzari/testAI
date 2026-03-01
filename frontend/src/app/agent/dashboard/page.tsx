"use client";

import { useState } from "react";
// import { collection, query, where, getDocs } from "firebase/firestore";
// import { db, auth } from "@/lib/firebase";

export default function AgentDashboardPage() {
    const [leads, setLeads] = useState<any[]>([
        { id: "1", name: "John Doe", phone: "+15550101", status: "NEW", source: "Shozin's Auto Shop" },
        { id: "2", name: "Jane Smith", phone: "+15550102", status: "CONTACTED", source: "Shozin's Auto Shop" },
    ]);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Navbar */}
            <nav className="border-b border-white/10 bg-zinc-900/50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <span className="text-xl font-bold text-purple-500">
                        Agent Portal
                    </span>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">Sales Agent</span>
                        <button className="text-sm text-white hover:text-gray-300">Logout</button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-3xl font-bold">Assigned Leads</h1>
                    <div className="text-sm text-gray-400">
                        Showing only leads assigned to you.
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-black/50 text-gray-400">
                            <tr>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium">WhatsApp</th>
                                <th className="p-4 font-medium">Campaign</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-white/5 transition">
                                    <td className="p-4 font-medium">{lead.name}</td>
                                    <td className="p-4 text-gray-300">{lead.phone}</td>
                                    <td className="p-4 text-gray-300">{lead.source}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${lead.status === 'NEW' ? 'bg-purple-900 text-purple-300' : 'bg-green-900 text-green-300'
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition">
                                            Open Chat
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {leads.length === 0 && (
                        <div className="p-10 text-center text-gray-500">
                            No new leads assigned.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
