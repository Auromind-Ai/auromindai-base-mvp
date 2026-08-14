'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { submitUserFeedback } from '@/lib/api/admin';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = [
    'Bug',
    'AI Accuracy',
    'Feature Request',
    'General',
];

export default function UserFeedbackPanel({ isOpen, onClose }) {
    const { workspaceId, user, loading: authLoading } = useAuth();

    const [category, setCategory] = useState('General');
    const [rating, setRating] = useState(0);
    const [message, setMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setErrorMsg('');

        if (authLoading) {
            setErrorMsg(
                'Still loading your session — please try again in a moment.'
            );
            return;
        }

        const userId = user?.id;

        if (typeof workspaceId !== 'string' || !workspaceId.trim()) {
            setErrorMsg(
                'Missing workspace session. Please refresh and try again.'
            );
            return;
        }

        if (typeof userId !== 'string' || !userId.trim()) {
            setErrorMsg(
                'Missing user session. Please refresh and try again.'
            );
            return;
        }

        if (rating < 1) {
            setErrorMsg('Please select a rating.');
            return;
        }

        if (!message.trim()) {
            setErrorMsg('Please enter your feedback message.');
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                workspace_id: workspaceId,
                user_id: userId,
                category,
                rating,
                message: message.trim(),
            };

            const response = await submitUserFeedback(payload);

            console.log('Feedback saved:', response);

            setShowSuccess(true);

            setTimeout(() => {
                setShowSuccess(false);
                setCategory('General');
                setRating(0);
                setMessage('');
                setErrorMsg('');
                onClose();
            }, 2000);

        } catch (error) {
            const detail = error?.data?.detail;

            console.error(
                'Feedback submission failed:',
                detail || error?.message || error
            );

            if (Array.isArray(detail)) {
                setErrorMsg(
                    detail
                        .map((d) => `${d.loc?.at(-1)}: ${d.msg}`)
                        .join(', ')
                );
            } else if (typeof detail === 'string') {
                setErrorMsg(detail);
            } else {
                setErrorMsg(
                    'Failed to submit feedback. Please try again.'
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">

            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Feedback Panel */}
            <div className="relative w-full max-w-md max-h-[90vh] bg-[#191919] rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Feedback / Report Issue
                        </h2>

                        <p className="text-xs text-[#888] mt-1">
                            Help us improve Auromind
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-[#888] hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Category
                        </label>

                        <select
                            value={category}
                            onChange={(e) => {
                                setCategory(e.target.value);
                                setErrorMsg('');
                            }}
                            className="w-full rounded-lg bg-[#242424] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                        >
                            {CATEGORIES.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Rating
                        </label>

                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => {
                                        setRating(star);
                                        setErrorMsg('');
                                    }}
                                    className="p-1 hover:scale-110 transition-transform"
                                >
                                    <Star
                                        size={26}
                                        className={
                                            star <= rating
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-[#555]'
                                        }
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Your feedback
                        </label>

                        <textarea
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                setErrorMsg('');
                            }}
                            placeholder="Tell us what happened or how we can improve..."
                            rows={7}
                            className="w-full resize-none rounded-lg bg-[#242424] border border-white/10 px-3 py-3 text-sm text-white placeholder:text-[#666] outline-none focus:border-indigo-500"
                        />
                    </div>

                </div>

                {/* Error */}
                {errorMsg && (
                    <div className="px-6 pb-3">
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
                            {errorMsg}
                        </div>
                    </div>
                )}

                {/* Success */}
                {showSuccess && (
                    <div className="px-6 pb-3">
                        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400 text-center">
                            Thanks for your feedback
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={authLoading || submitting}
                        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 transition-colors"
                    >
                        {authLoading
                            ? 'Loading session...'
                            : submitting
                                ? 'Submitting...'
                                : 'Submit Feedback'}
                    </button>
                </div>

            </div>
        </div>
    );
}