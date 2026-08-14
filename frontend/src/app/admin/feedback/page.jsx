'use client';

import { useEffect, useState } from 'react';
import { getUserFeedback } from '@/lib/api/admin';

export default function FeedbackPage() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                const response = await getUserFeedback();

                console.log('FEEDBACK API RESPONSE:', response);

                setFeedbacks(
                    Array.isArray(response)
                        ? response
                        : []
                );
            } catch (error) {
                console.error(
                    'Failed to fetch feedback:',
                    error?.data?.detail || error.message || error
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
            <div className="p-6 text-white">
                Loading feedback...
            </div>
        );
    }

    return (
        <div className="p-6 text-white">
            <h1 className="text-2xl font-semibold mb-6">
                User Feedback
            </h1>

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
                            <div className="flex justify-between">
                                <h2 className="font-medium">
                                    {feedback.category}
                                </h2>

                                <span className="text-yellow-400">
                                    {'★'.repeat(feedback.rating || 0)}
                                </span>
                            </div>

                            <p className="mt-3 text-gray-300">
                                {feedback.message}
                            </p>

                            <div className="mt-4 text-xs text-gray-500 space-y-1">
                                <p>
                                    User: {feedback.user_id}
                                </p>

                                <p>
                                    Workspace: {feedback.workspace_id}
                                </p>

                                <p>
                                    {feedback.created_at
                                        ? new Date(
                                              feedback.created_at
                                          ).toLocaleString()
                                        : ''}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}