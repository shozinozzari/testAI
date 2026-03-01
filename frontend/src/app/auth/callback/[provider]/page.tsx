"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("Verifying...");

    useEffect(() => {
        const provider = params?.provider;
        const code = searchParams.get("code");

        if (!provider || !code) {
            setStatus("Invalid callback parameters.");
            return;
        }

        const completeAuth = async () => {
            try {
                // Call backend to exchange code
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/${provider}/callback?code=${code}`);

                if (res.ok) {
                    setStatus("Success! You can close this window.");
                    // Notify parent window
                    if (window.opener) {
                        window.opener.postMessage({ type: "OAUTH_SUCCESS", provider }, "*");
                        window.close();
                    }
                } else {
                    const err = await res.text();
                    setStatus(`Authentication failed: ${err}`);
                }
            } catch (error) {
                console.error("Auth error", error);
                setStatus("An error occurred during authentication.");
            }
        };

        completeAuth();
    }, [params, searchParams]);

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-xl font-bold mb-2">Connecting...</h1>
                <p className="text-gray-400">{status}</p>
            </div>
        </div>
    );
}
