"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Video,
    Settings,
    LogOut,
    Menu,
    X,
    Users,
    ContactRound,
    LayoutTemplate,
    FileVideo
} from "lucide-react";
import { useState } from "react";
import { auth } from "@/lib/firebase";

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [

        { name: "Campaigns", href: "/dashboard", icon: Video }, // Current focus
        { name: "VSL", href: "/dashboard/vsl", icon: FileVideo },
        { name: "Users", href: "/dashboard/users", icon: Users },
        { name: "CRM", href: "/dashboard/crm", icon: ContactRound },
        { name: "Landing Pages", href: "/dashboard/landing-pages", icon: LayoutTemplate },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    return (
        <>
            {/* Mobile Toggle */}
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-800 rounded-lg text-white"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X /> : <Menu />}
            </button>

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 z-40 h-screen w-64 bg-zinc-900 border-r border-white/10 transition-transform duration-300 ease-in-out
                ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
            `}>
                <div className="h-full flex flex-col p-6">
                    {/* Logo */}
                    <div className="mb-10 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-white">
                            V
                        </div>
                        <span className="text-xl font-bold text-white">VideoFunnel</span>
                    </div>

                    {/* Menu */}
                    <nav className="flex-1 space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            // Active state logic
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive
                                        ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="pt-6 border-t border-white/10">
                        <button
                            onClick={() => auth.signOut()}
                            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl w-full transition-colors font-medium"
                        >
                            <LogOut size={20} />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
