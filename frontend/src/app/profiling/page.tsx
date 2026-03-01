"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase"; // Ensure firebase is initialized

export default function ProfilingPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        category: "",
        teamSize: "",
        acquisitionSource: "",
        businessDescription: ""
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not authenticated.");
            }

            // Get ID Token
            const token = await user.getIdToken();

            // Call Backend
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            console.log("Target API URL:", apiUrl);

            if (!apiUrl) {
                throw new Error("API URL is not defined in environment variables.");
            }

            const fetchUrl = `${apiUrl}/api/v1/users/me/profile`;
            console.log("Fetching:", fetchUrl);

            const response = await fetch(fetchUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    uid: user.uid,
                    category: formData.category,
                    team_size: formData.teamSize,
                    acquisition_source: formData.acquisitionSource,
                    business_description: formData.businessDescription
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Profiling Error Response:", response.status, errorText);
                throw new Error(`Failed to save profile: ${response.status} ${errorText}`);
            }

            console.log("Profiling Data Saved:", formData);

            // Redirect to Payment (Phase 3)
            router.push("/payment");
        } catch (error: any) {
            console.error("Profiling failed", error);
            alert(`Profiling failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md bg-zinc-900/50 p-8 rounded-2xl border border-white/10">
                <h1 className="text-2xl font-bold mb-2 text-center text-purple-400">Tell us about your business</h1>
                <p className="text-gray-400 text-sm mb-8 text-center">
                    We need this to customize your AI keywords and compliance settings.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Company Category</label>
                        <select
                            className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            required
                        >
                            <option value="">Select Category...</option>
                            <option value="ecommerce">E-Commerce</option>
                            <option value="agency">Agency</option>
                            <option value="saas">SaaS</option>
                            <option value="local_business">Local Business</option>
                            <option value="creator">Content Creator</option>
                            <option value="education">Education / Coaching</option>
                        </select>
                    </div>

                    {/* Team Size */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Team Size</label>
                        <select
                            className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                            value={formData.teamSize}
                            onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                            required
                        >
                            <option value="">Select Size...</option>
                            <option value="1">Solo (Just me)</option>
                            <option value="2-5">2 - 5 Employees</option>
                            <option value="6-20">6 - 20 Employees</option>
                            <option value="20+">20+ Employees</option>
                        </select>
                    </div>

                    {/* Acquisition Source */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">How did you hear about us?</label>
                        <select
                            className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                            value={formData.acquisitionSource}
                            onChange={(e) => setFormData({ ...formData, acquisitionSource: e.target.value })}
                            required
                        >
                            <option value="">Select Source...</option>
                            <option value="search">Google Search</option>
                            <option value="social">Social Media (FB/IG/LinkedIn)</option>
                            <option value="referral">Referral</option>
                            <option value="ad">Advertisement</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {/* Business Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Business Description</label>
                        <textarea
                            className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none min-h-24"
                            value={formData.businessDescription}
                            onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                            placeholder="What do you sell and who do you help?"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-full transition shadow-lg shadow-purple-500/25 disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Continue"}
                    </button>
                </form>
            </div>
        </div>
    );
}
