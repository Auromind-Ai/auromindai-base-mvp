'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

// Format UTC / backend timestamps reliably into Local Indian Standard Time (IST)
const formatToIST = (dateVal) => {
    if (!dateVal) return '';

    let str = String(dateVal).trim().replace(' ', 'T');

    // Timezone offset illana explicitly 'Z' (UTC) append panrom
    if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
        str = `${str}Z`;
    }

    const date = new Date(str);

    if (isNaN(date.getTime())) {
        return String(dateVal);
    }

    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

export default function FeedbackPage() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                const response = await api.get('/admin/user-feedback');

                console.log('Feedback GET response:', response);

                const data = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.data)
                        ? response.data
                        : [];

                console.log('Feedback data:', data);

                setFeedbacks(data);
            } catch (error) {
                console.error(
                    'Failed to fetch feedback:',
                    error?.response?.data || error
                );

                setFeedbacks([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFeedbacks();
    }, []);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[var(--notion-bg)] text-white">
                Loading feedback...
            </div>
        );
    }

    return (
        <div className="h-screen min-h-0 flex flex-col text-white overflow-hidden">

            {/* Fixed Header */}
            <div className="shrink-0 px-6 pt-6 pb-5 border-b border-white/5">
                <h1 className="text-2xl font-semibold">
                    User Feedback
                </h1>
            </div>

            {/* Only Feedback Content Scrolls */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-6">

                {feedbacks.length === 0 ? (
                    <p className="text-gray-400">
                        No feedback found.
                    </p>
                ) : (
                    <div className="space-y-4">

                        {feedbacks.map((feedback) => (
                            <div
                                key={feedback.id}
                                className="rounded-lg border border-white/10 bg-[#191919] p-5"
                            >
                                {/* Category + Rating */}
                                <div className="flex justify-between items-center">
                                    <h2 className="font-medium">
                                        {feedback.category}
                                    </h2>

                                    <span className="text-yellow-400">
                                        {'★'.repeat(feedback.rating || 0)}
                                    </span>
                                </div>

                                {/* Message */}
                                <p className="mt-3 text-gray-300">
                                    {feedback.message}
                                </p>

                                {/* Feedback Details */}
                                <div className="mt-4 text-xs text-gray-500 space-y-1">

                                    <div>
                                        User:{' '}
                                        <span className="text-gray-400">
                                            {feedback.user_name ||
                                                feedback.user_id}
                                        </span>
                                    </div>

                                    <div>
                                        Workspace-Id:{' '}
                                        <span className="text-gray-400">
                                            {feedback.workspace_id}
                                        </span>
                                    </div>

                                    {/* IST Converted Time */}
                                    <div>
                                        {formatToIST(feedback.created_at)}
                                    </div>

                                </div>
                            </div>
                        ))}

                    </div>
                )}
            </div>

            {/* Scrollbar Styling */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.12);
                    border-radius: 10px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
                }
            `}</style>
        </div>
    );
}