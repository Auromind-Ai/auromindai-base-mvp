'use client';

import { useState, useEffect } from 'react';
import { Mail, ExternalLink, Settings, Send, Inbox, RefreshCw } from 'lucide-react';
import { getWorkspace } from '@/lib/auth';

export default function EmailPage() {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState([]);
    const [showComposer, setShowComposer] = useState(false);
    const [formData, setFormData] = useState({ to: '', subject: '', body: '' });
    const workspace = getWorkspace();

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:8000/integrations/status?workspace_id=${workspace?.id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                const isConnected = data.gmail?.connected || false;
                setConnected(isConnected);

                if (isConnected) {
                    loadMessages();
                }
            }
        } catch (error) {
            console.error('Failed to check email status:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:8000/gmail/messages?workspace_id=${workspace?.id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:8000/gmail/send?workspace_id=${workspace?.id}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                }
            );

            if (response.ok) {
                alert('Email sent successfully!');
                setFormData({ to: '', subject: '', body: '' });
                setShowComposer(false);
                loadMessages();
            } else {
                alert('Failed to send email');
            }
        } catch (error) {
            console.error('Failed to send email:', error);
            alert('Failed to send email');
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
                        <Mail size={64} className="mx-auto mb-4 text-gray-600" />
                        <h1 className="text-2xl font-bold mb-2">Gmail Not Connected</h1>
                        <p className="text-gray-400 mb-6">
                            Connect your Gmail to send and receive emails
                        </p>
                        <a
                            href="/user/admin/integrations"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                        >
                            <Settings size={20} />
                            Connect Gmail
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
                        <h1 className="text-3xl font-bold mb-2">Email</h1>
                        <p className="text-gray-400">Manage your Gmail inbox</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={loadMessages}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowComposer(!showComposer)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                        >
                            <Send size={20} />
                            Compose
                        </button>
                        <a
                            href="https://mail.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ExternalLink size={16} />
                            Open Gmail
                        </a>
                    </div>
                </div>

                {/* Email Composer */}
                {showComposer && (
                    <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">Compose Email</h2>
                        <form onSubmit={handleSend} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">To</label>
                                <input
                                    type="email"
                                    value={formData.to}
                                    onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#050505] border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500"
                                    placeholder="recipient@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Subject</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#050505] border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500"
                                    placeholder="Email subject"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Message</label>
                                <textarea
                                    rows={8}
                                    value={formData.body}
                                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#050505] border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500"
                                    placeholder="Write your message..."
                                    required
                                ></textarea>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                                >
                                    <Send size={20} />
                                    Send Email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowComposer(false)}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Inbox */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center gap-2">
                        <Inbox size={20} />
                        <h2 className="text-lg font-semibold">Inbox</h2>
                        <span className="text-sm text-gray-400">({messages.length} messages)</span>
                    </div>
                    <div className="divide-y divide-white/10">
                        {messages.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                No messages found
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <span className="font-medium">{msg.from}</span>
                                        <span className="text-xs text-gray-400">{new Date(msg.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-sm font-medium mb-1">{msg.subject}</div>
                                    <div className="text-sm text-gray-400 truncate">{msg.snippet}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
