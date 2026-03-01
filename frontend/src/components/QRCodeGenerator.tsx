"use client";

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
    campaignId: string;
}

export default function QRCodeGenerator({ campaignId }: QRCodeGeneratorProps) {
    const [qrUrl, setQrUrl] = useState<string>('');
    const [redirectUrl, setRedirectUrl] = useState<string>('');

    useEffect(() => {
        // Construct the redirection URL
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/wa/redirect/${campaignId}`;
        setRedirectUrl(url);

        // Generate QR Code
        QRCode.toDataURL(url)
            .then(url => {
                setQrUrl(url);
            })
            .catch(err => {
                console.error(err);
            });
    }, [campaignId]);

    return (
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Scan to Chat</h3>
            {qrUrl ? (
                <img src={qrUrl} alt="WhatsApp QR Code" className="w-48 h-48" />
            ) : (
                <div className="w-48 h-48 bg-gray-200 animate-pulse rounded"></div>
            )}
            <p className="text-xs text-center text-gray-500 mt-2 break-all">
                {redirectUrl}
            </p>
            <p className="text-xs text-green-600 font-semibold mt-1">
                Auto-rotates between Agents
            </p>
        </div>
    );
}
