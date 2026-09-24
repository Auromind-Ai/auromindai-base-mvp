'use client';

import { useState } from 'react';
import { X, Star, Check, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { submitUserFeedback } from '@/lib/api/admin';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = [
    'Bug',
    'AI Accuracy',
    'Feature Request',
    'General',
];

export default function UserFeedbackPanel({ isOpen, onClose, embedded = false }) {
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
        <div className={embedded ? "w-full" : "fixed inset-0 z-[9999] flex items-center justify-center p-4"}>

            {/* Backdrop */}
            {!embedded && <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />}

            {embedded && (
                <>
                    <div className="mb-6">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                            Feedback / Report Issue
                        </h1>
                        <p className="mt-1.5 text-sm text-white/65">
                            Help us improve Auromind
                        </p>
                    </div>
                    <div className="mb-6 h-px w-full bg-[rgba(124,58,237,0.15)]" />
                </>
            )}

            {/* Feedback Panel */}
            <div className={`relative w-full ${embedded ? "rounded-2xl" : "max-w-md max-h-[90dvh] rounded-xl shadow-2xl"} bg-[#0b111b] border border-white/10 flex flex-col overflow-hidden`}>

                {/* Header */}
                {!embedded && <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
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
                        aria-label="Close feedback"
                        className="p-2 rounded-lg text-[#888] hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>}

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                    {/* Category */}
                    <div>
                        <label htmlFor="feedback-category" className="block text-sm font-medium text-white mb-2">
                            Category
                        </label>

                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <button
                                    id="feedback-category"
                                    type="button"
                                    aria-label={`Category: ${category}`}
                                    className="flex w-full items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-left text-sm text-white outline-none focus:border-indigo-500"
                                >
                                    <span>{category}</span>
                                    <ChevronDown size={14} aria-hidden="true" />
                                </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                    align="start"
                                    sideOffset={0}
                                    collisionPadding={8}
                                    aria-label="Category"
                                    className="z-[10000] w-[var(--radix-dropdown-menu-trigger-width)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto border border-white/10 bg-[#0b111b] text-sm text-white shadow-lg outline-none"
                                >
                                    <DropdownMenu.RadioGroup
                                        value={category}
                                        onValueChange={(value) => {
                                            setCategory(value);
                                            setErrorMsg('');
                                        }}
                                    >
                                        {CATEGORIES.map((item) => (
                                            <DropdownMenu.RadioItem
                                                key={item}
                                                value={item}
                                                className="flex cursor-default select-none items-center justify-between gap-2 px-3 py-1 text-sm text-white outline-none hover:bg-[#1967d2] focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-white/30"
                                            >
                                                <span>{item}</span>
                                                <DropdownMenu.ItemIndicator>
                                                    <Check size={14} aria-hidden="true" />
                                                </DropdownMenu.ItemIndicator>
                                            </DropdownMenu.RadioItem>
                                        ))}
                                    </DropdownMenu.RadioGroup>
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>
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
                            className="w-full resize-none rounded-lg bg-white/5 border border-white/10 px-3 py-3 text-sm text-white placeholder:text-[#666] outline-none focus:border-indigo-500"
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
