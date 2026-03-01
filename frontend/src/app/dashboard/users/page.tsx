"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

const COUNTRIES = [
    { code: "+91", flag: "🇮🇳", name: "India" },
    { code: "+1", flag: "🇺🇸", name: "United States" },
    { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
    { code: "+971", flag: "🇦🇪", name: "UAE" },
    { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
    { code: "+61", flag: "🇦🇺", name: "Australia" },
    { code: "+49", flag: "🇩🇪", name: "Germany" },
    { code: "+33", flag: "🇫🇷", name: "France" },
    { code: "+81", flag: "🇯🇵", name: "Japan" },
    { code: "+86", flag: "🇨🇳", name: "China" },
    { code: "+82", flag: "🇰🇷", name: "South Korea" },
    { code: "+55", flag: "🇧🇷", name: "Brazil" },
    { code: "+52", flag: "🇲🇽", name: "Mexico" },
    { code: "+7", flag: "🇷🇺", name: "Russia" },
    { code: "+39", flag: "🇮🇹", name: "Italy" },
    { code: "+34", flag: "🇪🇸", name: "Spain" },
    { code: "+31", flag: "🇳🇱", name: "Netherlands" },
    { code: "+65", flag: "🇸🇬", name: "Singapore" },
    { code: "+60", flag: "🇲🇾", name: "Malaysia" },
    { code: "+63", flag: "🇵🇭", name: "Philippines" },
    { code: "+62", flag: "🇮🇩", name: "Indonesia" },
    { code: "+66", flag: "🇹🇭", name: "Thailand" },
    { code: "+84", flag: "🇻🇳", name: "Vietnam" },
    { code: "+92", flag: "🇵🇰", name: "Pakistan" },
    { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
    { code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
    { code: "+977", flag: "🇳🇵", name: "Nepal" },
    { code: "+27", flag: "🇿🇦", name: "South Africa" },
    { code: "+234", flag: "🇳🇬", name: "Nigeria" },
    { code: "+254", flag: "🇰🇪", name: "Kenya" },
    { code: "+20", flag: "🇪🇬", name: "Egypt" },
    { code: "+90", flag: "🇹🇷", name: "Turkey" },
    { code: "+48", flag: "🇵🇱", name: "Poland" },
    { code: "+46", flag: "🇸🇪", name: "Sweden" },
    { code: "+41", flag: "🇨🇭", name: "Switzerland" },
    { code: "+353", flag: "🇮🇪", name: "Ireland" },
    { code: "+64", flag: "🇳🇿", name: "New Zealand" },
    { code: "+1", flag: "🇨🇦", name: "Canada" },
];

export default function UsersPage() {
    const { user, loading: authLoading } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [newUser, setNewUser] = useState({ name: "", email: "", phone_number: "", role: "SALES_AGENT", password: "" });

    // Country code selector state
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState("");
    const countryRef = useRef<HTMLDivElement>(null);

    // Close country dropdown on outside click
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
                setCountryDropdownOpen(false);
                setCountrySearch("");
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.includes(countrySearch)
    );

    useEffect(() => {
        console.log("Auth State in UsersPage:", { user, authLoading });
        if (!authLoading && user) {
            fetchUsers();
        } else if (!authLoading && !user) {
            console.warn("User is not logged in according to useAuth");
            setLoading(false);
        }
    }, [user, authLoading]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            if (!user) return;
            const token = await user.getIdToken();

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddUser = async () => {
        if (!newUser.name || !newUser.phone_number || (!isEditing && !newUser.password)) {
            alert("Please fill in Name, Phone, and Password.");
            return;
        }

        const fullPhone = `${selectedCountry.code}${newUser.phone_number}`;

        setIsSubmitting(true);
        try {
            if (!user) {
                alert("You must be logged in to perform this action.");
                setIsSubmitting(false);
                return;
            }
            const token = await user.getIdToken();

            if (isEditing && currentUserId) {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${currentUserId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        display_name: newUser.name,
                        email: newUser.email,
                        phone_number: fullPhone,
                        role: newUser.role,
                        password: newUser.password || undefined
                    })
                });

                if (res.ok) {
                    fetchUsers();
                    closeModal();
                } else {
                    const err = await res.json();
                    alert(`Failed to update user: ${err.detail || "Unknown error"}`);
                }
            } else {
                const payload = {
                    display_name: newUser.name,
                    role: newUser.role,
                    password: newUser.password,
                    email: newUser.email ? newUser.email : undefined,
                    phone_number: fullPhone
                };

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    fetchUsers();
                    closeModal();
                } else {
                    const err = await res.json();
                    console.error("Create User Error Response:", err);
                    const errorMessage = typeof err.detail === 'object'
                        ? JSON.stringify(err.detail)
                        : (err.detail || "Unknown error");
                    alert(`Failed to create user: ${errorMessage}`);
                }
            }
        } catch (error) {
            console.error("Error saving user:", error);
            alert("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditUser = (editUser: any) => {
        // Try to detect country code from existing phone number
        let phone = editUser.phone_number || "";
        let matched = COUNTRIES[0];
        for (const c of COUNTRIES) {
            if (phone.startsWith(c.code)) {
                matched = c;
                phone = phone.slice(c.code.length);
                break;
            }
        }
        setSelectedCountry(matched);
        setNewUser({
            name: editUser.display_name || "",
            email: editUser.email || "",
            phone_number: phone,
            role: editUser.role || "SALES_AGENT",
            password: ""
        });
        setCurrentUserId(editUser.uid);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleRemoveUser = async (uid: string) => {
        if (!confirm("Are you sure you want to remove this user?")) return;

        try {
            if (!user) return;
            const token = await user.getIdToken();

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${uid}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                setUsers(users.filter(u => u.uid !== uid));
            } else {
                alert("Failed to delete user");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    const openAddModal = () => {
        setNewUser({ name: "", email: "", phone_number: "", role: "SALES_AGENT", password: "" });
        setSelectedCountry(COUNTRIES[0]);
        setIsEditing(false);
        setCurrentUserId(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewUser({ name: "", email: "", phone_number: "", role: "SALES_AGENT", password: "" });
        setSelectedCountry(COUNTRIES[0]);
        setIsEditing(false);
        setCurrentUserId(null);
        setIsSubmitting(false);
    };

    return (
        <div className="p-6 text-white max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">User Management</h1>
                    <p className="text-gray-400 mt-1">Manage team access and roles</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl transition shadow-lg shadow-purple-500/20 font-medium flex items-center gap-2"
                >
                    <span>+ Add New User</span>
                </button>
            </div>

            <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading users...</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-gray-400 text-sm uppercase font-semibold">
                            <tr>
                                <th className="p-4 border-b border-white/10">Name</th>
                                <th className="p-4 border-b border-white/10">WhatsApp</th>
                                <th className="p-4 border-b border-white/10">Role</th>
                                <th className="p-4 border-b border-white/10">Status</th>
                                <th className="p-4 border-b border-white/10 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {users.map((user) => (
                                <tr key={user.uid} className="hover:bg-white/5 transition group">
                                    <td className="p-4 font-medium text-white">{user.display_name || "N/A"}</td>
                                    <td className="p-4 text-gray-400">
                                        {user.phone_number || "N/A"}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${user.role === 'ADMIN' || user.role === 'OWNER' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                            user.role === 'MANAGER' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                                'bg-green-500/20 text-green-300 border border-green-500/30'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${user.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {user.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditUser(user)}
                                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleRemoveUser(user.uid)}
                                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                                                title="Remove"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        No users found. Create one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">{isEditing ? "Edit User" : "Add New User"}</h2>
                            <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-black border border-white/20 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors"
                                    placeholder="Jane Doe"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                />
                            </div>

                            {/* WhatsApp Number with Country Code */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">WhatsApp Number</label>
                                <div className="flex gap-2">
                                    {/* Country Code Dropdown */}
                                    <div className="relative" ref={countryRef}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCountryDropdownOpen(!countryDropdownOpen);
                                                setCountrySearch("");
                                            }}
                                            className="flex items-center gap-1.5 bg-black border border-white/20 rounded-xl px-3 py-3 text-white hover:border-purple-500 transition-colors min-w-[110px]"
                                        >
                                            <span className="text-lg">{selectedCountry.flag}</span>
                                            <span className="text-sm font-medium">{selectedCountry.code}</span>
                                            <span className="text-gray-500 text-xs ml-auto">▼</span>
                                        </button>

                                        {countryDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl z-[60] overflow-hidden">
                                                {/* Search */}
                                                <div className="p-2 border-b border-white/10">
                                                    <input
                                                        type="text"
                                                        placeholder="Search country..."
                                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                                                        value={countrySearch}
                                                        onChange={(e) => setCountrySearch(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                {/* List */}
                                                <div className="max-h-48 overflow-y-auto">
                                                    {filteredCountries.map((c, idx) => (
                                                        <div
                                                            key={`${c.code}-${c.name}-${idx}`}
                                                            onClick={() => {
                                                                setSelectedCountry(c);
                                                                setCountryDropdownOpen(false);
                                                                setCountrySearch("");
                                                            }}
                                                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition text-sm ${selectedCountry.code === c.code && selectedCountry.name === c.name
                                                                    ? "bg-purple-600/15 text-white" : "hover:bg-white/5 text-gray-300"
                                                                }`}
                                                        >
                                                            <span className="text-base">{c.flag}</span>
                                                            <span className="flex-1">{c.name}</span>
                                                            <span className="text-gray-500 text-xs font-mono">{c.code}</span>
                                                        </div>
                                                    ))}
                                                    {filteredCountries.length === 0 && (
                                                        <div className="p-4 text-center text-gray-500 text-sm">No match found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Phone Number Input */}
                                    <input
                                        type="text"
                                        className="flex-1 bg-black border border-white/20 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors"
                                        placeholder="9876543210"
                                        value={newUser.phone_number}
                                        onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value.replace(/[^0-9]/g, "") })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Role</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-black border border-white/20 rounded-xl p-3 text-white outline-none focus:border-purple-500 appearance-none transition-colors"
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    >
                                        <option value="SALES_AGENT">Sales Agent</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                        ▼
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                    Password {isEditing && <span className="text-gray-500 font-normal">(Leave blank to keep current)</span>}
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-black border border-white/20 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors"
                                    placeholder={isEditing ? "••••••••" : "Secret Password"}
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 mt-8 pt-2">
                                <button
                                    onClick={closeModal}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition font-medium text-gray-300"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddUser}
                                    disabled={isSubmitting}
                                    className={`flex-1 py-3 rounded-xl transition font-bold text-white shadow-lg shadow-purple-500/25 ${isSubmitting
                                        ? "bg-purple-600/50 cursor-not-allowed"
                                        : "bg-purple-600 hover:bg-purple-700"}`}
                                >
                                    {isSubmitting ? "Processing..." : (isEditing ? "Save Changes" : "Create User")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
