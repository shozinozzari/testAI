"use client";

import { useState, useEffect } from "react";
import PaymentForm from './PaymentForm';

export default function PaymentPage() {
    const [country, setCountry] = useState<string>("US");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const detectCountry = () => {
            const cookies = document.cookie.split('; ');
            const countryCookie = cookies.find(row => row.startsWith('user-country='));

            if (countryCookie) {
                setCountry(countryCookie.split('=')[1]);
            } else if (window.location.hostname === 'localhost') {
                setCountry("IN");
            }
            setLoading(false);
        };
        detectCountry();
    }, []);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
            <PaymentForm initialCountry={country} />
        </div>
    );
}
