'use client';

import { useState, useEffect } from 'react';
import { Calendar, Database, Mail, CheckCircle2, XCircle, ExternalLink, RefreshCw, Clock } from 'lucide-react';
import { getWorkspace } from '@/lib/auth';

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState({
        calendar: { connected: false, email: null },
        zoho: { connected: false, account: null },
        gmail: { connected: false, email: null }
    });
    const [loading, setLoading] = useState(false);
    const workspace = getWorkspace();

    const availableIntegrations = [
        {
            id: 'calendar',
            name: 'Google Calendar',
            description: 'Sync your calendar for intelligent meeting scheduling',
            icon: Calendar,
            color: 'from-blue-500 to-cyan-500',
            features: ['Auto-schedule meetings', 'Check availability', 'Send calendar invites'],
            comingSoon: false
        },
        {
            id: 'zoho',
            name: 'Zoho CRM',
            description: 'Connect your CRM for lead management and automation',
            icon: Database,
            color: 'from-orange-500 to-red-500',
            features: ['Auto-update leads', 'Sync contacts', 'Track interactions'],
            comingSoon: true
        },
        {
            id: 'gmail',
            name: 'Gmail',
            description: 'Send emails and manage communication',
            icon: Mail,
            color: 'from-purple-500 to-pink-500',
            features: ['Send emails', 'Email templates', 'Track responses'],
            comingSoon: false
        }
    ];

    const loadIntegrationStatus = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token || !workspace?.id) return;

        const response = await fetch(
            `http://localhost:8000/integrations/status?workspace_id=${workspace.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.ok) {
            const data = await response.json();
            setIntegrations(data);
            return data;
        }
    } catch (error) {
        console.error('Failed to load status:', error);
        }
    };

    useEffect(() => {
    if (!workspace?.id) return;

    let interval;

    const startPolling = async () => {
        interval = setInterval(async () => {
            const data = await loadIntegrationStatus();

            if (data?.gmail?.connected) {
                clearInterval(interval); // stop polling
            }
        }, 2000);
    };

    startPolling();

    return () => {
        if (interval) clearInterval(interval);
        };
    }, [workspace?.id]);


    const handleConnect = async (integrationId) => {
        setLoading(true);
        try {
            if (integrationId === 'calendar' || integrationId === 'gmail') {
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `http://localhost:8000/integrations/google/auth/${integrationId}?workspace_id=${workspace.id}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                if (!response.ok) {
                    const error = await response.json();
                    alert(`Connection failed: ${error.detail || 'Unknown error'}`);
                    console.error('OAuth init failed:', error);
                    return;
                }

                const data = await response.json();

                if (data.authorization_url) {
                    window.location.href = data.authorization_url;
                } else {
                    alert('OAuth not configured - check backend .env');
                }
            }
        } catch (error) {
            console.error('Connection failed:', error);
            alert(`Connection failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (integrationId) => {
        if (confirm(`Disconnect ${integrationId}?`)) {
            try {
                const token = localStorage.getItem('token');
                await fetch(
                    `http://localhost:8000/integrations/disconnect/google_${integrationId}?workspace_id=${workspace.id}`,
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
        <div className="min-h-screen bg-[#050505] text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Integrations</h1>
                    <p className="text-gray-400">
                        Connect your business tools to unlock AI automation
                    </p>
                </div>

                {/* Integration Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableIntegrations.map((integration) => {
                        const Icon = integration.icon;
                        const status = integrations[integration.id];

                        return (
                            <div
                                key={integration.id}
                                className={`bg-[#111111] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all ${integration.comingSoon ? 'opacity-70' : ''}`}
                            >
                                {/* Icon & Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center`}>
                                        <Icon size={24} className="text-white" />
                                    </div>
                                    {integration.comingSoon ? (
                                        <div className="flex items-center gap-1 text-yellow-500 text-sm">
                                            <Clock size={16} />
                                            <span>Coming Soon</span>
                                        </div>
                                    ) : status?.connected ? (
                                        <div className="flex items-center gap-1 text-green-500 text-sm">
                                            <CheckCircle2 size={16} />
                                            <span>Connected</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                                            <XCircle size={16} />
                                            <span>Not connected</span>
                                        </div>
                                    )}
                                </div>

                                {/* Name & Description */}
                                <h3 className="text-xl font-semibold mb-2">{integration.name}</h3>
                                <p className="text-gray-400 text-sm mb-4">{integration.description}</p>

                                {/* Features */}
                                <ul className="space-y-2 mb-6">
                                    {integration.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {/* Connected Info */}
                                {status?.connected && status?.email && (
                                    <div className="mb-4 p-3 bg-white/5 rounded-lg">
                                        <p className="text-xs text-gray-400">Connected as</p>
                                        <p className="text-sm font-medium">{status.email}</p>
                                    </div>
                                )}

                                {/* Action Button */}
                                {integration.comingSoon ? (
                                    <button
                                        disabled
                                        className="w-full px-4 py-2 bg-yellow-500/10 text-yellow-500 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Clock size={16} />
                                        Coming Soon
                                    </button>
                                ) : status?.connected ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDisconnect(integration.id)}
                                            className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-medium transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                        <button
                                            onClick={loadIntegrationStatus}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleConnect(integration.id)}
                                        disabled={loading}
                                        className="w-full px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        Connect {integration.name}
                                        <ExternalLink size={16} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Help Section */}
                <div className="mt-8 p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                    <h3 className="text-lg font-semibold mb-2">Need help connecting?</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Google Calendar is ready to connect! Gmail and Zoho CRM integrations are coming soon.
                    </p>
                    <a
                        href="/OAUTH_SETUP.md"
                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1"
                    >
                        View setup guide
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </div>
    );
}
