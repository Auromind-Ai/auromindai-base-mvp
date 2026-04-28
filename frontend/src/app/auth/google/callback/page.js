'use client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function GoogleCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Processing...');
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const error = searchParams.get('error');

                if (error) {
                    setError(`Authorization failed: ${error}`);
                    setTimeout(() => router.push('/user/admin/integrations'), 3000);
                    return;
                }

                if (!code || !state) {
                    setError('Missing authorization code or state');
                    setTimeout(() => router.push('/user/admin/integrations'), 3000);
                    return;
                }

                setStatus('Completing connection...');

                const response = await fetch(
                    `${API}/integrations/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
                    { method: 'GET' }
                );
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Failed to complete connection');
                }

                const data = await response.json();

                setStatus('Success! Redirecting...');
                setTimeout(() => {
                    router.push('/user/admin/integrations');
                }, 1500);

            } catch (err) {
                console.error('Callback error:', err);
                setError(err.message || 'Connection failed');
                setTimeout(() => router.push('/user/admin/integrations'), 3000);
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <div className="text-center">
                {error ? (
                    <>
                        <div className="text-red-500 text-xl mb-4">❌ {error}</div>
                        <p className="text-gray-400">Redirecting back...</p>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white text-xl">{status}</p>
                    </>
                )}
            </div>
        </div>
    );
}
