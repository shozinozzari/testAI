"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
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

const LANGUAGES = [
    "Afrikaans (South Africa)", "Albanian (Albania)", "Amharic (Ethiopia)", "Arabic (Egypt)", "Arabic (World)", "Armenian (Armenia)",
    "Azerbaijani (Azerbaijan)", "Bangla (Bangladesh)", "Basque (Spain)", "Belarusian (Belarus)", "Bulgarian (Bulgaria)", "Burmese (Myanmar)",
    "Catalan (Spain)", "Cebuano (Philippines)", "Chinese (Mandarin - China & Taiwan)", "Croatian (Croatia)", "Czech (Czech Republic)",
    "Danish (Denmark)", "Dutch (Netherlands)", "English (US, UK, India, Australia)", "Estonian (Estonia)", "Filipino (Philippines)",
    "Finnish (Finland)", "French (Canada)", "French (France)", "Galician (Spain)", "Georgian (Georgia)", "German (Germany)", "Greek (Greece)",
    "Gujarati (India)", "Haitian Creole (Haiti)", "Hebrew (Israel)", "Hindi (India)", "Hungarian (Hungary)", "Icelandic (Iceland)",
    "Indonesian (Indonesia)", "Italian (Italy)", "Japanese (Japan)", "Javanese (Java)", "Kannada (India)", "Konkani (India)",
    "Korean (South Korea)", "Lao (Laos)", "Latin (Vatican City)", "Latvian (Latvia)", "Lithuanian (Lithuania)", "Luxembourgish (Luxembourg)",
    "Macedonian (North Macedonia)", "Maithili (India)", "Malagasy (Madagascar)", "Malay (Malaysia)", "Malayalam (India)", "Marathi (India)",
    "Mongolian (Mongolia)", "Nepali (Nepal)", "Norwegian (Bokmål & Nynorsk)", "Odia (India)", "Pashto (Afghanistan)", "Persian (Iran)",
    "Polish (Poland)", "Portuguese (Brazil)", "Portuguese (Portugal)", "Punjabi (India)", "Romanian (Romania)", "Russian (Russia)",
    "Serbian (Serbia)", "Sindhi (India)", "Slovak (Slovakia)", "Slovenian (Slovenia)", "Somali (Somalia)", "Spanish (Spain)",
    "Swahili (Kenya, Tanzania)", "Swedish (Sweden)", "Tajik (Tajikistan)", "Tamil (India)", "Telugu (India)", "Thai (Thailand)",
    "Turkish (Turkey)", "Ukrainian (Ukraine)", "Urdu (Pakistan)", "Uzbek (Uzbekistan)", "Vietnamese (Vietnam)", "Welsh (United Kingdom)",
    "Zulu (South Africa)"
].sort();

const VOICES = [
    { id: "Charon", gender: "Male", desc: "Deep, authoritative, confident.", vibe: "Best for 'serious' business or dramatic narration." },
    { id: "Puck", gender: "Male", desc: "Energetic, youthful, clear.", vibe: "Good for fast-paced, excitement, or friendly sales." },
    { id: "Fenrir", gender: "Male", desc: "Fast, intense, urgent.", vibe: "Good for 'Act Now!' style urgencies." },
    { id: "Orus", gender: "Male", desc: "Firm, direct, instructional.", vibe: "Good for tutorials or educational content." },
    { id: "Kore", gender: "Female", desc: "Calm, professional, composed.", vibe: "Excellent for corporate/professional explanations." },
    { id: "Aoede", gender: "Female", desc: "Soft, elegant, reassuring.", vibe: "Good for storytelling angles." },
    { id: "Leda", gender: "Female", desc: "Friendly, warm, conversational.", vibe: "Good for testimonials or relatable content." },
    { id: "Zephyr", gender: "Female", desc: "Bright, high-pitched, very energetic.", vibe: "Good for upbeat intros." },
    { id: "Lyra", gender: "Female", desc: "Balanced, clear, articulate.", vibe: "Good all-rounder." },
];

type SelectedAgent = { uid: string; display_name: string; phone_number: string };

const DEFAULT_FORM_DATA = {
    businessName: "",
    businessDescription: "",
    websiteUrl: "",
    selectedAgents: [] as SelectedAgent[],
    connectedPlatforms: {
        youtube: false,
        instagram: false,
        facebook: false,
        tiktok: false,
        linkedin: false,
        twitter: false,
        threads: false,
        tumblr: false,
    },
    offerDetails: "",
    campaignObjective: "",
    meetingTitle: "",
    meetingDuration: "30 min",
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] as string[],
    availableTimeStart: "09:00",
    availableTimeEnd: "17:00",
    bufferTime: "15",
    maxBookingsPerDay: "10",
    syncGoogleCalendar: false,
    audienceLanguage: "English (US, UK, India, Australia)",
    anchorVoice: "Aoede",
};

type CampaignFormData = typeof DEFAULT_FORM_DATA;

export default function OnboardingPage() {
    const router = useRouter();
    const { user: authUser } = useAuth();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<CampaignFormData>(DEFAULT_FORM_DATA);
    const [hasLoadedStoredFormData, setHasLoadedStoredFormData] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("campaignFormData");
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as Partial<CampaignFormData>;
                setFormData((prev) => ({
                    ...prev,
                    ...parsed,
                    connectedPlatforms: {
                        ...prev.connectedPlatforms,
                        ...(parsed.connectedPlatforms ?? {}),
                    },
                    selectedAgents: Array.isArray(parsed.selectedAgents) ? parsed.selectedAgents : prev.selectedAgents,
                    availableDays: Array.isArray(parsed.availableDays) ? parsed.availableDays : prev.availableDays,
                }));
            } catch (e) {
                console.warn("Failed to parse saved form data:", e);
            }
        }
        setHasLoadedStoredFormData(true);
    }, []);

    // Save form data to localStorage whenever it changes
    useEffect(() => {
        if (!hasLoadedStoredFormData) return;
        localStorage.setItem("campaignFormData", JSON.stringify(formData));
    }, [formData, hasLoadedStoredFormData]);

    const [languageSearch, setLanguageSearch] = useState("");
    const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
    const languageDropdownRef = useRef<HTMLDivElement>(null);

    const filteredLanguages = LANGUAGES.filter(l => l.toLowerCase().includes(languageSearch.toLowerCase()));

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
                setLanguageDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Available users from backend
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    // Quick-create user modal
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [quickUser, setQuickUser] = useState({ name: "", phone_number: "", password: "" });
    const [quickCreateLoading, setQuickCreateLoading] = useState(false);

    // Country code selector for quick-create
    const [quickCountry, setQuickCountry] = useState(COUNTRIES[0]);
    const [quickCountryOpen, setQuickCountryOpen] = useState(false);
    const [quickCountrySearch, setQuickCountrySearch] = useState("");
    const [isPublishing, setIsPublishing] = useState(false);
    const quickCountryRef = useRef<HTMLDivElement>(null);

    const filteredQuickCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(quickCountrySearch.toLowerCase()) ||
        c.code.includes(quickCountrySearch)
    );

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (quickCountryRef.current && !quickCountryRef.current.contains(e.target as Node)) {
                setQuickCountryOpen(false);
                setQuickCountrySearch("");
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    // Dropdown open/close
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (authUser) {
            fetchAvailableUsers();
        }
    }, [authUser]);

    const fetchAvailableUsers = async () => {
        try {
            setUsersLoading(true);
            if (!authUser) return;
            const token = await authUser.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAvailableUsers(data);
            }
        } catch (err) {
            console.error("Error fetching users:", err);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleNext = () => {
        if (step === 3 && !formData.campaignObjective) {
            alert("Please select a Campaign Objective.");
            return;
        }
        setStep(step + 1);
    };
    const handleBack = () => setStep(step - 1);

    const toggleAgent = (user: any) => {
        const isSelected = formData.selectedAgents.some(a => a.uid === user.uid);
        if (isSelected) {
            setFormData({
                ...formData,
                selectedAgents: formData.selectedAgents.filter(a => a.uid !== user.uid)
            });
        } else {
            setFormData({
                ...formData,
                selectedAgents: [...formData.selectedAgents, {
                    uid: user.uid,
                    display_name: user.display_name,
                    phone_number: user.phone_number
                }]
            });
        }
    };

    const removeAgent = (uid: string) => {
        setFormData({
            ...formData,
            selectedAgents: formData.selectedAgents.filter(a => a.uid !== uid)
        });
    };

    const handleQuickCreate = async () => {
        if (!quickUser.name || !quickUser.phone_number || !quickUser.password) {
            alert("Please fill in Name, WhatsApp Number, and Password.");
            return;
        }
        setQuickCreateLoading(true);
        try {
            if (!authUser) return;
            const token = await authUser.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    display_name: quickUser.name,
                    phone_number: `${quickCountry.code}${quickUser.phone_number}`,
                    role: "SALES_AGENT",
                    password: quickUser.password
                })
            });

            if (res.ok) {
                const newUser = await res.json();
                // Auto-select the newly created user
                setFormData({
                    ...formData,
                    selectedAgents: [...formData.selectedAgents, {
                        uid: newUser.uid,
                        display_name: newUser.display_name,
                        phone_number: newUser.phone_number
                    }]
                });
                // Refresh users list
                await fetchAvailableUsers();
                // Reset and close
                setQuickUser({ name: "", phone_number: "", password: "" });
                setQuickCountry(COUNTRIES[0]);
                setShowQuickCreate(false);
            } else {
                const err = await res.json();
                const msg = typeof err.detail === "object" ? JSON.stringify(err.detail) : (err.detail || "Unknown error");
                alert(`Failed: ${msg}`);
            }
        } catch (err) {
            console.error("Quick create error:", err);
            alert("Failed to create user.");
        } finally {
            setQuickCreateLoading(false);
        }
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === "OAUTH_SUCCESS" && event.data?.provider) {
                const provider = event.data.provider.toLowerCase();
                setFormData(prev => ({
                    ...prev,
                    connectedPlatforms: {
                        ...prev.connectedPlatforms,
                        [provider]: true
                    }
                }));
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const togglePlatform = (platform: keyof typeof formData.connectedPlatforms) => {
        const isConnected = formData.connectedPlatforms[platform];

        if (isConnected) {
            // Disconnect (Local toggle for now, backend sync planned)
            setFormData({
                ...formData,
                connectedPlatforms: {
                    ...formData.connectedPlatforms,
                    [platform]: false
                }
            });
        } else {
            // Connect via OAuth Popup
            const width = 600;
            const height = 700;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/${platform.toUpperCase()}/login`;

            window.open(url, `Connect ${platform}`, `width=${width},height=${height},top=${top},left=${left}`);
        }
    };

    const handleSubmit = async () => {
        setIsPublishing(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                alert("Please login first");
                return;
            }
            const token = await user.getIdToken();

            // Build whatsapp numbers from selected agents
            const whatsappNumbers = formData.selectedAgents.map(a => a.phone_number);

            const connectedSocials = Object.entries(formData.connectedPlatforms)
                .filter(([_, isConnected]) => isConnected)
                .map(([platform]) => platform.toUpperCase());

            const payload = {
                business_name: formData.businessName,
                business_description: formData.businessDescription,
                website_url: formData.websiteUrl,
                calling_number: whatsappNumbers[0] || "",
                audience_language: formData.audienceLanguage,
                anchor_voice: formData.anchorVoice,
                connected_socials: connectedSocials,
                cta_option: formData.campaignObjective,
                config: {
                    whatsapp_numbers: whatsappNumbers,
                    selected_agent_ids: formData.selectedAgents.map(a => a.uid),
                    offer_details: formData.offerDetails,
                    meeting_title: formData.meetingTitle,
                    meeting_duration: formData.meetingDuration,
                    available_days: formData.availableDays,
                    available_time_start: formData.availableTimeStart,
                    available_time_end: formData.availableTimeEnd,
                    buffer_time: formData.bufferTime,
                    max_bookings_per_day: formData.maxBookingsPerDay,
                    sync_google_calendar: formData.syncGoogleCalendar,
                }
            };

            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const res = await fetch(`${apiUrl}/api/v1/campaigns/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(err);
            }

            console.log("Campaign Created!");
            setIsPublishing(false);
            router.push("/dashboard");

        } catch (error: any) {
            console.error("Campaign Creation Failed", error);
            alert(`Failed to create campaign: ${error.message}`);
        } finally {
            setIsPublishing(false);
        }
    };

    const platforms = [
        {
            id: "youtube",
            label: "YouTube",
            color: "hover:bg-red-600",
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            )
        },
        {
            id: "instagram",
            label: "Instagram",
            color: "hover:bg-pink-600",
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
            )
        },
        {
            id: "facebook",
            label: "Facebook",
            color: "hover:bg-blue-600",
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            )
        },
        {
            id: "tiktok",
            label: "TikTok",
            color: "hover:bg-gray-800",
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.03 5.91-.05 8.81-.4 2.91-2.9 5.25-5.79 5.56-4.58.53-8.82-3.23-7.98-7.98.54-3.03 3.25-5.39 6.29-5.45.02 1.35.01 2.71.01 4.06-.01.03-1.04.09-1.18.17-1.68.86-1.27 3.63.78 4.2 2.72.84 5.33-1.28 5.29-4.22.01-4.99-.01-9.98 0-14.97-.8.01-1.26.01-2.07.03.01.26 0 .52.01.78.33-.21.65-.43.99-.61V.02z" />
                </svg>
            )
        },
        {
            id: "linkedin",
            label: "LinkedIn",
            color: "hover:bg-blue-700",
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
            )
        },
        {
            id: "twitter",
            label: "X",
            color: "hover:bg-black",
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            )
        },
        {
            id: "threads",
            label: "Threads",
            color: "hover:bg-black",
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.74 3.06c4.66.69 8.08 4.79 8.08 9.53 0 4.18-2.61 7.82-6.38 9.3l-1.42 2.11H12v-2.11c-6.64 0-12-5.36-12-12S5.36 0 12 0c2.05 0 3.99.52 5.74 1.43l-.43 2.16-1.63-.53zM12 21.89c5.36 0 9.77-4.22 9.98-9.52.12-2.91-1.07-5.59-3.08-7.5l-1.07-.46C15.86 3.19 14.01 2.37 12 2.37c-5.36 0-9.76 4.38-9.76 9.77 0 5.37 4.38 9.75 9.76 9.75zM8.88 12.01c.21-1.74 1.69-3.08 3.47-3.08 1.79 0 3.25 1.34 3.46 3.08h2.2c-.22-2.96-2.7-5.29-5.69-5.29-2.97 0-5.46 2.33-5.69 5.29H8.88zM12 17.1c-2.98 0-5.46-2.2-5.69-5.06h2.2c.22 1.62 1.6 2.87 3.49 2.87 1.88 0 3.24-1.25 3.48-2.87h2.2c-.24 2.86-2.73 5.06-5.68 5.06z" />
                </svg>
            )
        },
        {
            id: "tumblr",
            label: "Tumblr",
            color: "hover:bg-blue-900",
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.051 9.941 0 9.999 0h3.517v6.114h4.801v3.633h-4.82v7.47c.016 1.001.375 2.371 2.207 2.371h2.609V24h-3.745z" />
                </svg>
            )
        },
    ];

    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
            <div className="w-full max-w-2xl">
                <h1 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                    Setup Your AI Campaign
                </h1>

                {/* Step Indicator */}
                <div className="flex justify-between mb-8 text-sm text-gray-500">
                    <span className={step >= 1 ? "text-purple-400 font-bold" : ""}>1. Campaign Info</span>
                    <span className={step >= 2 ? "text-purple-400 font-bold" : ""}>2. Connect Socials</span>
                    <span className={step >= 3 ? "text-purple-400 font-bold" : ""}>3. Campaign Objective</span>
                    <span className={step >= 4 ? "text-purple-400 font-bold" : ""}>4. Finish</span>
                </div>

                <div className="bg-zinc-900/50 p-8 rounded-2xl border border-white/10">

                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Campaign Details</h2>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Business Name</label>
                            <input
                                type="text"
                                placeholder="Business Name"
                                className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                value={formData.businessName}
                                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                            />
                            <label className="block text-sm font-medium text-gray-300 mb-1">What do you want to promote?</label>
                            <textarea
                                placeholder="Your product name or service name"
                                className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none resize-vertical min-h-[100px]"
                                value={formData.businessDescription}
                                onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                            />

                            <label className="block text-sm font-medium text-gray-300 mb-1">Audience Language</label>
                            <div className="relative" ref={languageDropdownRef}>
                                <div
                                    className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus-within:border-purple-500 flex justify-between items-center cursor-pointer"
                                    onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                                >
                                    <span>{formData.audienceLanguage || "Select Language"}</span>
                                    <span className="text-gray-500">▼</span>
                                </div>
                                {languageDropdownOpen && (
                                    <div className="absolute w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                                        <div className="p-2 sticky top-0 bg-zinc-900 border-b border-white/10">
                                            <input
                                                type="text"
                                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white focus:border-purple-500 outline-none"
                                                placeholder="Search language..."
                                                value={languageSearch}
                                                onChange={(e) => setLanguageSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        {filteredLanguages.map(lang => (
                                            <div
                                                key={lang}
                                                className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm"
                                                onClick={() => {
                                                    setFormData({ ...formData, audienceLanguage: lang });
                                                    setLanguageDropdownOpen(false);
                                                    setLanguageSearch("");
                                                }}
                                            >
                                                {lang}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <label className="block text-sm font-medium text-gray-300 mb-2 mt-6">Anchor Voice</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {VOICES.map(voice => (
                                    <div
                                        key={voice.id}
                                        onClick={() => setFormData({ ...formData, anchorVoice: voice.id })}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${formData.anchorVoice === voice.id
                                            ? "bg-purple-600/20 border-purple-500 shadow-md shadow-purple-500/10"
                                            : "bg-black border-white/10 hover:border-white/30"
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-white">{voice.id}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${voice.gender === "Male" ? "bg-blue-900/50 text-blue-300" : "bg-pink-900/50 text-pink-300"}`}>
                                                {voice.gender}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 text-xs mb-1">{voice.desc}</p>
                                        <p className="text-gray-500 text-[10px] italic">{voice.vibe}</p>
                                    </div>
                                ))}
                            </div>

                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Social Accounts</h2>
                            <p className="text-gray-400 text-sm">Select the platforms you want to publish to.</p>

                            <div className="grid grid-cols-2 gap-4">
                                {platforms.map((p) => {
                                    const isConnected = formData.connectedPlatforms[p.id as keyof typeof formData.connectedPlatforms];
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => togglePlatform(p.id as any)}
                                            className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${isConnected
                                                ? "bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/10"
                                                : "bg-black border-white/10 hover:border-white/30"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`${isConnected ? "text-purple-400" : "text-gray-400"}`}>
                                                    {p.icon}
                                                </div>
                                                <span className="font-medium">{p.label}</span>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${isConnected ? "bg-purple-500 text-white" : "bg-zinc-800 text-gray-400"
                                                }`}>
                                                {isConnected ? "Connected" : "Connect"}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Select Campaign Objective</h2>

                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { id: "WHATSAPP", label: "WhatsApp Chat", icon: "💬" },
                                    { id: "CALL_BOOKING", label: "Google Meet Booking", icon: "📅" },
                                    { id: "WEBSITE", label: "Website Traffic", icon: "🔗" }
                                ].map((option) => (
                                    <div
                                        key={option.id}
                                        onClick={() => setFormData({ ...formData, campaignObjective: option.id })}
                                        className={`p-4 rounded-xl border cursor-pointer flex items-center gap-4 transition-all ${formData.campaignObjective === option.id
                                            ? "bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/10"
                                            : "bg-black border-white/10 hover:bg-white/5"
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.campaignObjective === option.id ? "border-purple-500" : "border-gray-500"
                                            }`}>
                                            {formData.campaignObjective === option.id && <div className="w-3 h-3 bg-purple-500 rounded-full" />}
                                        </div>
                                        <span className="text-2xl">{option.icon}</span>
                                        <span className="font-medium text-lg">{option.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6">

                            {formData.campaignObjective === "WHATSAPP" && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                    <h3 className="text-lg font-medium mb-4">Automated Lead Allocation</h3>
                                    <div className="space-y-3">
                                        <label className="text-sm text-gray-400">Choose Sales Agents</label>

                                        {/* Selected Agents Pills */}
                                        {formData.selectedAgents.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {formData.selectedAgents.map((agent) => (
                                                    <div key={agent.uid} className="flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm">
                                                        <span className="text-white font-medium">{agent.display_name}</span>
                                                        <span className="text-purple-300 text-xs">{agent.phone_number}</span>
                                                        <button
                                                            onClick={() => removeAgent(agent.uid)}
                                                            className="text-purple-300 hover:text-white ml-1 text-lg leading-none"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Agent Selection Dropdown */}
                                        <div className="relative" ref={dropdownRef}>
                                            <button
                                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                                className="w-full bg-black border border-white/20 rounded-lg p-3 text-left text-gray-400 hover:border-purple-500 transition flex justify-between items-center"
                                            >
                                                <span>{formData.selectedAgents.length === 0 ? "Select sales agents..." : `${formData.selectedAgents.length} agent(s) selected`}</span>
                                                <span className="text-gray-500">{dropdownOpen ? "▲" : "▼"}</span>
                                            </button>

                                            {dropdownOpen && (
                                                <div className="absolute w-full mt-1 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                                                    {usersLoading ? (
                                                        <div className="p-4 text-center text-gray-500 text-sm">Loading users...</div>
                                                    ) : availableUsers.length === 0 ? (
                                                        <div className="p-4 text-center text-gray-500 text-sm">No users yet. Create one below.</div>
                                                    ) : (
                                                        availableUsers.map((u) => {
                                                            const isSelected = formData.selectedAgents.some(a => a.uid === u.uid);
                                                            return (
                                                                <div
                                                                    key={u.uid}
                                                                    onClick={() => toggleAgent(u)}
                                                                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition ${isSelected ? "bg-purple-600/15" : "hover:bg-white/5"}`}
                                                                >
                                                                    <div>
                                                                        <div className="text-white font-medium text-sm">{u.display_name || "Unnamed"}</div>
                                                                        <div className="text-gray-500 text-xs">{u.phone_number} · {u.role}</div>
                                                                    </div>
                                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${isSelected ? "bg-purple-500 border-purple-500 text-white" : "border-gray-600"}`}>
                                                                        {isSelected && "✓"}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}


                                                </div>
                                            )}
                                        </div>

                                        {/* Create New User Button */}
                                        <div
                                            onClick={() => setShowQuickCreate(true)}
                                            className="flex items-center gap-2 mt-2 cursor-pointer text-purple-400 hover:text-purple-300 transition w-fit"
                                        >
                                            <span className="text-lg">+</span>
                                            <span className="text-sm font-medium">Create Sales Agent</span>
                                        </div>
                                    </div>

                                </div>

                            )}

                            {formData.campaignObjective === "CALL_BOOKING" && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-5">
                                    <h3 className="text-lg font-medium">Call Booking Setup</h3>
                                    <p className="text-gray-400 text-sm -mt-3">Set up your built-in booking calendar. Leads will see available slots and book directly.</p>

                                    {/* Meeting Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Meeting Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Free Strategy Call"
                                            className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                            value={formData.meetingTitle || ""}
                                            onChange={(e) => setFormData({ ...formData, meetingTitle: e.target.value })}
                                        />
                                    </div>

                                    {/* Meeting Duration */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Meeting Duration</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {["15 min", "30 min", "45 min", "60 min"].map((dur) => (
                                                <div
                                                    key={dur}
                                                    onClick={() => setFormData({ ...formData, meetingDuration: dur })}
                                                    className={`p-2.5 rounded-lg border cursor-pointer text-center text-sm font-medium transition-all ${formData.meetingDuration === dur
                                                        ? "bg-purple-600/20 border-purple-500 text-white"
                                                        : "bg-black border-white/10 text-gray-400 hover:border-white/30"
                                                        }`}
                                                >
                                                    {dur}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Available Days */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Available Days</label>
                                        <div className="flex gap-2">
                                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                                                const selected = (formData.availableDays || []).includes(day);
                                                return (
                                                    <button
                                                        key={day}
                                                        type="button"
                                                        onClick={() => {
                                                            const days = formData.availableDays || [];
                                                            setFormData({
                                                                ...formData,
                                                                availableDays: selected ? days.filter((d: string) => d !== day) : [...days, day]
                                                            });
                                                        }}
                                                        className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${selected
                                                            ? "bg-purple-600/20 border-purple-500 text-white"
                                                            : "bg-black border-white/10 text-gray-500 hover:border-white/30"
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Time Window */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Available Hours</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="time"
                                                className="bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none flex-1"
                                                value={formData.availableTimeStart || "09:00"}
                                                onChange={(e) => setFormData({ ...formData, availableTimeStart: e.target.value })}
                                            />
                                            <span className="text-gray-500 text-sm">to</span>
                                            <input
                                                type="time"
                                                className="bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none flex-1"
                                                value={formData.availableTimeEnd || "17:00"}
                                                onChange={(e) => setFormData({ ...formData, availableTimeEnd: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Buffer & Max Bookings Row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Buffer Between Calls</label>
                                            <select
                                                className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none appearance-none"
                                                value={formData.bufferTime || "15"}
                                                onChange={(e) => setFormData({ ...formData, bufferTime: e.target.value })}
                                            >
                                                <option value="0">No buffer</option>
                                                <option value="5">5 minutes</option>
                                                <option value="10">10 minutes</option>
                                                <option value="15">15 minutes</option>
                                                <option value="30">30 minutes</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Max Bookings / Day</label>
                                            <select
                                                className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none appearance-none"
                                                value={formData.maxBookingsPerDay || "10"}
                                                onChange={(e) => setFormData({ ...formData, maxBookingsPerDay: e.target.value })}
                                            >
                                                <option value="5">5 calls</option>
                                                <option value="10">10 calls</option>
                                                <option value="15">15 calls</option>
                                                <option value="20">20 calls</option>
                                                <option value="0">Unlimited</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Allocate to Sales Agents */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Assign Sales Agents</label>
                                        <p className="text-xs text-gray-500 mb-3">Leads will be round-robin allocated to selected agents for call bookings.</p>

                                        {/* Selected Agents Pills */}
                                        {formData.selectedAgents.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {formData.selectedAgents.map((agent) => (
                                                    <div key={agent.uid} className="flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm">
                                                        <span className="text-white font-medium">{agent.display_name}</span>
                                                        <span className="text-purple-300 text-xs">{agent.phone_number}</span>
                                                        <button
                                                            onClick={() => removeAgent(agent.uid)}
                                                            className="text-purple-300 hover:text-white ml-1 text-lg leading-none"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Agent Selection Dropdown */}
                                        <div className="relative" ref={dropdownRef}>
                                            <button
                                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                                className="w-full bg-black border border-white/20 rounded-lg p-3 text-left text-gray-400 hover:border-purple-500 transition flex justify-between items-center"
                                            >
                                                <span>{formData.selectedAgents.length === 0 ? "Select sales agents..." : `${formData.selectedAgents.length} agent(s) selected`}</span>
                                                <span className="text-gray-500">{dropdownOpen ? "▲" : "▼"}</span>
                                            </button>

                                            {dropdownOpen && (
                                                <div className="absolute w-full mt-1 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                                                    {usersLoading ? (
                                                        <div className="p-4 text-center text-gray-500 text-sm">Loading users...</div>
                                                    ) : availableUsers.length === 0 ? (
                                                        <div className="p-4 text-center text-gray-500 text-sm">No users yet. Create one below.</div>
                                                    ) : (
                                                        availableUsers.map((u) => {
                                                            const isSelected = formData.selectedAgents.some(a => a.uid === u.uid);
                                                            return (
                                                                <div
                                                                    key={u.uid}
                                                                    onClick={() => toggleAgent(u)}
                                                                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition ${isSelected ? "bg-purple-600/15" : "hover:bg-white/5"}`}
                                                                >
                                                                    <div>
                                                                        <div className="text-white font-medium text-sm">{u.display_name || "Unnamed"}</div>
                                                                        <div className="text-gray-500 text-xs">{u.phone_number} · {u.role}</div>
                                                                    </div>
                                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${isSelected ? "bg-purple-500 border-purple-500 text-white" : "border-gray-600"}`}>
                                                                        {isSelected && "✓"}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Create New Agent */}
                                        <div
                                            onClick={() => setShowQuickCreate(true)}
                                            className="flex items-center gap-2 mt-2 cursor-pointer text-purple-400 hover:text-purple-300 transition w-fit"
                                        >
                                            <span className="text-lg">+</span>
                                            <span className="text-sm font-medium">Create Sales Agent</span>
                                        </div>
                                    </div>

                                    {/* Google Calendar Sync Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
                                        <div>
                                            <div className="text-sm font-medium text-white">Sync with Google Calendar</div>
                                            <div className="text-xs text-gray-400 mt-0.5">Auto-create Google Meet links & block busy slots</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, syncGoogleCalendar: !formData.syncGoogleCalendar })}
                                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${formData.syncGoogleCalendar ? "bg-green-500" : "bg-zinc-600"
                                                }`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${formData.syncGoogleCalendar ? "translate-x-5" : "translate-x-0"
                                                }`}></span>
                                        </button>
                                    </div>

                                </div>
                            )}

                            {formData.campaignObjective === "WEBSITE" && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
                                    <input
                                        type="url"
                                        placeholder="Website"
                                        className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                        value={formData.websiteUrl}
                                        onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                        {step > 1 ? (
                            <button onClick={handleBack} className="px-6 py-2 text-gray-300 hover:text-white">
                                Back
                            </button>
                        ) : <div></div>}

                        {step < 4 ? (
                            <button onClick={handleNext} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition">
                                Next Step
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isPublishing}
                                className={`px-8 py-3 bg-purple-600 text-white font-bold rounded-full hover:bg-purple-700 transition shadow-lg shadow-purple-500/25 ${isPublishing ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {isPublishing
                                    ? (formData.campaignObjective === 'CALL_BOOKING' ? 'Creating landing page...' : 'Publishing...')
                                    : 'Publish'
                                }
                            </button>
                        )}
                    </div>

                </div>
            </div>

            {/* Quick Create User Modal */}
            {
                showQuickCreate && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Quick Add Sales Agent</h2>
                                <button onClick={() => setShowQuickCreate(false)} className="text-gray-500 hover:text-white">✕</button>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black border border-white/20 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors"
                                        placeholder="Jane Doe"
                                        value={quickUser.name}
                                        onChange={(e) => setQuickUser({ ...quickUser, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">WhatsApp Number</label>
                                    <div className="flex gap-2">
                                        <div className="relative" ref={quickCountryRef}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setQuickCountryOpen(!quickCountryOpen);
                                                    setQuickCountrySearch("");
                                                }}
                                                className="flex items-center gap-1.5 bg-black border border-white/20 rounded-xl px-3 py-3 text-white hover:border-purple-500 transition-colors min-w-[110px]"
                                            >
                                                <span className="text-lg">{quickCountry.flag}</span>
                                                <span className="text-sm font-medium">{quickCountry.code}</span>
                                                <span className="text-gray-500 text-xs ml-auto">▼</span>
                                            </button>
                                            {quickCountryOpen && (
                                                <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl z-[60] overflow-hidden">
                                                    <div className="p-2 border-b border-white/10">
                                                        <input
                                                            type="text"
                                                            placeholder="Search country..."
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                                                            value={quickCountrySearch}
                                                            onChange={(e) => setQuickCountrySearch(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto">
                                                        {filteredQuickCountries.map((c, idx) => (
                                                            <div
                                                                key={`${c.code}-${c.name}-${idx}`}
                                                                onClick={() => {
                                                                    setQuickCountry(c);
                                                                    setQuickCountryOpen(false);
                                                                    setQuickCountrySearch("");
                                                                }}
                                                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition text-sm ${quickCountry.code === c.code && quickCountry.name === c.name
                                                                    ? "bg-purple-600/15 text-white" : "hover:bg-white/5 text-gray-300"
                                                                    }`}
                                                            >
                                                                <span className="text-base">{c.flag}</span>
                                                                <span className="flex-1">{c.name}</span>
                                                                <span className="text-gray-500 text-xs font-mono">{c.code}</span>
                                                            </div>
                                                        ))}
                                                        {filteredQuickCountries.length === 0 && (
                                                            <div className="p-4 text-center text-gray-500 text-sm">No match found</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            className="flex-1 bg-black border border-white/20 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors"
                                            placeholder="9876543210"
                                            value={quickUser.phone_number}
                                            onChange={(e) => setQuickUser({ ...quickUser, phone_number: e.target.value.replace(/[^0-9]/g, "") })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
                                    <input
                                        type="password"
                                        className="w-full bg-black border border-white/20 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors"
                                        placeholder="Set a password"
                                        value={quickUser.password}
                                        onChange={(e) => setQuickUser({ ...quickUser, password: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 mt-8 pt-2">
                                    <button
                                        onClick={() => setShowQuickCreate(false)}
                                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition font-medium text-gray-300"
                                        disabled={quickCreateLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleQuickCreate}
                                        disabled={quickCreateLoading}
                                        className={`flex-1 py-3 rounded-xl transition font-bold text-white shadow-lg shadow-purple-500/25 ${quickCreateLoading ? "bg-purple-600/50 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}
                                    >
                                        {quickCreateLoading ? "Creating..." : "Create & Select"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
