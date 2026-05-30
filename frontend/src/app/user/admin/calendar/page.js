'use client';

const API = '/api';

import { useState, useEffect } from 'react';
import { Calendar, ExternalLink, Settings, Plus } from 'lucide-react';
import { getWorkspace } from '@/lib/auth';

export default function CalendarPage() {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [calendarEmail, setCalendarEmail] = useState('');
    const workspace = getWorkspace();

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${API}/integrations/status?workspace_id=${workspace?.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setConnected(data.calendar?.connected || false);
                setCalendarEmail(data.calendar?.email || '');
            }
        } catch (error) {
            console.error('Failed to check calendar status:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (!connected) {
        return (
            <div className="min-h-screen bg-[#050505] text-white p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center py-20">
                        <Calendar size={64} className="mx-auto mb-4 text-gray-600" />
                        <h1 className="text-2xl font-bold mb-2">Google Calendar Not Connected</h1>
                        <p className="text-gray-400 mb-6">
                            Connect your Google Calendar to view and manage your schedule
                        </p>
                        <a
                            href="/user/admin/channels"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                        >
                            <Settings size={20} />
                            Connect Google Calendar
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Calendar</h1>
                        <p className="text-gray-400">
                            {calendarEmail ? `Connected as ${calendarEmail}` : 'Manage your schedule'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all">
                            <Plus size={20} />
                            New Event
                        </button>
                        <a
                            href="https://calendar.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ExternalLink size={16} />
                            Open in Google
                        </a>
                    </div>
                </div>

                {/* Embedded Calendar */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden" style={{ height: '800px' }}>
                    <iframe
                        src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarEmail)}&ctz=Asia/Kolkata&mode=WEEK&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&bgcolor=%23050505`}
                        className="w-full h-full"
                        frameBorder="0"
                        scrolling="no"
                        style={{ background: '#050505' }}
                    ></iframe>
                </div>

                {/* Info Card */}
                <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                    <p className="text-sm text-gray-300">
                        💡 <strong>Tip:</strong> Events created here sync with your Google Calendar automatically.
                        You can also use the "New Event" button to create meetings directly.
                    </p>
                </div>
            </div>
        </div>
    );
}
