'use client';

import { useState, useEffect } from 'react';
import { 
    Calendar, 
    Mail, 
    Search, 
    ChevronDown, 
    Plus, 
    Check,
    Filter,
    ArrowUpDown,
    Grid
} from 'lucide-react';
import { getWorkspace } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState({
        calendar: { connected: false, email: null, enabled: true },
        gmail: { connected: false, email: null, enabled: true }
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(""); // ✅ NEW
    const workspace = getWorkspace();

    const availableIntegrations = [
        {
            id: 'gmail',
            name: 'Gmail',
            subHeader: 'Most popular',
            description: 'Draft replies, summarize threads, & search your inbox',
            icon: Mail,
            iconColor: '#EA4335',
        },
        {
            id: 'calendar',
            name: 'Google Calendar',
            subHeader: '#2 popular',
            description: 'Manage your schedule and coordinate meetings effortlessly',
            icon: Calendar,
            iconColor: '#4285F4',
        }
    ];

    useEffect(() => {
        if (workspace?.id) {
            loadIntegrationStatus();
        }
    }, [workspace?.id]);

    const loadIntegrationStatus = async () => {
        try {
            const token = sessionStorage.getItem('token');
            if (!token) return;

            const response = await fetch(
                `${API}/integrations/status?workspace_id=${workspace.id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setIntegrations(data);
            }
        } catch (error) {
            console.error('Failed to load status:', error);
        }
    };

    const handleConnect = async (integrationId) => {
        setLoading(true);
        setErrorMessage(""); // reset

        try {
            const token = sessionStorage.getItem('token');

            const response = await fetch(
                `${API}/integrations/google/auth/${integrationId}?workspace_id=${workspace.id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!response.ok) {
                const error = await response.json();
                setErrorMessage(error.detail || "Something went wrong"); // ✅ NO ALERT
                return;
            }

            const data = await response.json();

            if (data.authorization_url) {
                window.location.href = data.authorization_url;
            } else {
                setErrorMessage("OAuth not configured properly");
            }

        } catch (error) {
            console.error('Connection failed:', error);
            setErrorMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (integrationId) => {
        if (confirm(`Disconnect ${integrationId}?`)) {
            try {
                const token = sessionStorage.getItem('token');
                await fetch(
                    `${API}/integrations/disconnect/google_${integrationId}?workspace_id=${workspace.id}`,
                    {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }
                );
                loadIntegrationStatus();
            } catch (error) {
                console.error('Disconnect failed:', error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-[#E5E5E5] p-6 lg:p-12 font-sans overflow-y-auto">
            <div className="max-w-6xl mx-auto relative">
                
                {/* Header */}
                <div className="mb-6 pt-4">
                    <h1 className="text-4xl font-semibold text-white mb-3">Connectors</h1>
                    <p className="text-[#888] text-[15px] max-w-2xl leading-relaxed">
                        Connect Auromind to your apps, files, and services.
                    </p>
                </div>

                {/* ✅ ERROR MESSAGE UI */}
                {errorMessage && (
                    <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        ❌ {errorMessage}
                    </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {availableIntegrations.map((item) => {
                        const isConnected = integrations[item.id]?.connected;
                        const isDisabled = integrations[item.id]?.enabled === false;
                        const Icon = item.icon;

                        return (
                            <div 
                                key={item.id}
                                className="group bg-[#262626] border border-white/5 rounded-2xl p-5 flex items-start gap-5"
                            >
                                <div className="w-14 h-14 rounded-xl bg-[#1c1c1c] flex items-center justify-center">
                                    <Icon size={28} style={{ color: item.iconColor }} />
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-white text-[17px]">{item.name}</h3>
                                    <p className="text-[#888] text-[14px]">{item.description}</p>

                                    {/* ✅ DISABLED LABEL */}
                                    {isDisabled && (
                                        <p className="text-red-400 text-xs mt-1">
                                            Disabled by admin
                                        </p>
                                    )}
                                </div>

                                <div>
                                    {isConnected ? (
                                        <button 
                                            onClick={() => handleDisconnect(item.id)}
                                            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
                                        >
                                            <Check size={20} />
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleConnect(item.id)}
                                            disabled={loading || isDisabled}
                                            title={isDisabled ? "Disabled by admin" : ""}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center 
                                                ${isDisabled 
                                                    ? 'bg-[#222] text-[#555] cursor-not-allowed' 
                                                    : 'bg-[#333] hover:bg-[#3d3d3d]'
                                                }`}
                                        >
                                            <Plus size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
