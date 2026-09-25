/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    X,
    Camera,
    UploadCloud,
    Check,
    ExternalLink,
    Briefcase,
    Mail,
    Globe,
    MapPin,
    FileText,
    Info,
    Share2,
    ShieldCheck,
    Loader2,
    ChevronDown,
    AlertCircle,
    Phone,
    RefreshCw,
    Clock
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

const META_CATEGORIES = [
    { value: 'PROF_SERVICES', label: 'Professional services' },
    { value: 'AUTO', label: 'Automotive' },
    { value: 'BEAUTY', label: 'Beauty, spa and personal care' },
    { value: 'APPAREL', label: 'Clothing and apparel' },
    { value: 'EDU', label: 'Education' },
    { value: 'ENTERTAIN', label: 'Entertainment' },
    { value: 'EVENT_PLAN', label: 'Event planning and service' },
    { value: 'FINANCE', label: 'Finance and banking' },
    { value: 'GROCERY', label: 'Grocery store' },
    { value: 'GOVT', label: 'Public service' },
    { value: 'HOTEL', label: 'Hotel and lodging' },
    { value: 'HEALTH', label: 'Medical and health' },
    { value: 'NONPROFIT', label: 'Non-profit' },
    { value: 'RESTAURANT', label: 'Restaurant' },
    { value: 'RETAIL', label: 'Shopping and retail' },
    { value: 'TRAVEL', label: 'Travel and transportation' },
    { value: 'OTHER', label: 'Other' },
];

export default function WhatsAppProfileModal({
    isOpen,
    onClose,
    workspaceId,
    phoneId: initialPhoneId,
    displayPhone: initialDisplayPhone,
    wabaId: initialWabaId
}) {
    const { showToast } = useToast();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [initialVerifiedName, setInitialVerifiedName] = useState('');

    const [form, setForm] = useState({
        phone_number_id: initialPhoneId || '',
        waba_id: initialWabaId || '',
        display_phone_number: initialDisplayPhone || '',
        verified_name: '',
        name_status: 'APPROVED',
        quality_rating: 'UNKNOWN',
        new_display_name: '',
        new_name_status: '',
        profile_picture_url: '',
        vertical: 'PROF_SERVICES',
        description: '',
        address: '',
        email: '',
        websites: ['', ''],
        about: '',
    });

    const [photoPreview, setPhotoPreview] = useState('');
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);

    const fetchProfile = useCallback(async (isRefresh = false) => {
        if (!workspaceId) return;
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await api.getWhatsAppProfile(workspaceId);
            if (data) {
                const websitesList = Array.isArray(data.websites) ? data.websites : [];
                const currentName = data.verified_name || '';
                setInitialVerifiedName(currentName);
                setForm({
                    phone_number_id: data.phone_number_id || initialPhoneId || '',
                    waba_id: data.waba_id || initialWabaId || '',
                    display_phone_number: data.display_phone_number || initialDisplayPhone || '',
                    verified_name: currentName,
                    name_status: data.name_status || 'APPROVED',
                    quality_rating: data.quality_rating || 'UNKNOWN',
                    new_display_name: data.new_display_name || '',
                    new_name_status: data.new_name_status || '',
                    profile_picture_url: data.profile_picture_url || '',
                    vertical: data.vertical && data.vertical !== 'UNDEFINED' ? data.vertical : 'PROF_SERVICES',
                    description: data.description || '',
                    address: data.address || '',
                    email: data.email || '',
                    websites: [websitesList[0] || '', websitesList[1] || ''],
                    about: data.about || '',
                });
                setPhotoPreview(data.profile_picture_url || '');
                if (isRefresh) {
                    showToast('WhatsApp profile refreshed from Meta Cloud API.', 'success');
                }
            }
        } catch (err) {
            console.error('Failed to load WhatsApp profile:', err);
            const msg = err?.data?.detail || err?.detail || err?.message || 'Could not fetch live WhatsApp profile from Meta.';
            showToast(msg, 'warning');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [workspaceId, initialPhoneId, initialDisplayPhone, initialWabaId, showToast]);

    useEffect(() => {
        if (isOpen && workspaceId) {
            fetchProfile();
        }
    }, [isOpen, workspaceId, fetchProfile]);

    if (!isOpen) return null;

    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
            showToast('Please choose a JPEG or PNG image.', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size exceeds 5MB limit.', 'error');
            return;
        }

        setSelectedPhotoFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPhotoPreview(objectUrl);
    };

    const handleUploadPhotoNow = async () => {
        if (!selectedPhotoFile || !workspaceId) return;

        setUploadingPhoto(true);
        try {
            const formData = new FormData();
            formData.append('workspace_id', workspaceId);
            formData.append('file', selectedPhotoFile);

            const res = await api.uploadWhatsAppProfilePhoto(formData);
            if (res?.status === 'success') {
                if (res.profile_picture_url) {
                    setForm(prev => ({ ...prev, profile_picture_url: res.profile_picture_url }));
                    setPhotoPreview(res.profile_picture_url);
                }
                setSelectedPhotoFile(null);
                showToast('Profile picture updated successfully on Meta Business Suite!', 'success');
            } else {
                throw new Error(res?.message || 'Failed to upload photo');
            }
        } catch (err) {
            console.error('Photo upload error:', err);
            const msg = err?.data?.detail || err?.detail || err?.message || 'Failed to upload profile picture to Meta.';
            showToast(msg, 'error');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!workspaceId) return;

        // Validation for email
        if (form.email && form.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(form.email.trim())) {
                showToast('Please enter a valid email address (e.g., info@business.com).', 'error');
                return;
            }
        }

        setSaving(true);
        try {
            // Step 1: If user has a pending photo selected, upload it first
            if (selectedPhotoFile) {
                const formData = new FormData();
                formData.append('workspace_id', workspaceId);
                formData.append('file', selectedPhotoFile);
                const photoRes = await api.uploadWhatsAppProfilePhoto(formData);
                if (photoRes?.profile_picture_url) {
                    setForm(prev => ({ ...prev, profile_picture_url: photoRes.profile_picture_url }));
                    setPhotoPreview(photoRes.profile_picture_url);
                }
                setSelectedPhotoFile(null);
            }

            // Step 2: Format clean websites with https://
            const cleanWebsites = form.websites
                .map(w => w.trim())
                .filter(w => w.length > 0)
                .map(w => /^https?:\/\//i.test(w) ? w : `https://${w}`);

            const payload = {
                workspace_id: workspaceId,
                vertical: form.vertical,
                description: form.description.trim(),
                address: form.address.trim(),
                email: form.email.trim(),
                websites: cleanWebsites,
                about: form.about.trim(),
            };

            // Only submit display name if user actually altered it
            if (form.verified_name && form.verified_name.trim() !== initialVerifiedName.trim()) {
                payload.new_display_name = form.verified_name.trim();
                payload.current_verified_name = initialVerifiedName.trim();
            }

            const res = await api.updateWhatsAppProfile(payload);
            if (res?.status === 'success') {
                showToast(res.message || 'WhatsApp profile updated successfully and synced with Meta!', 'success');
                if (res.profile) {
                    const websitesList = Array.isArray(res.profile.websites) ? res.profile.websites : [];
                    setInitialVerifiedName(res.profile.verified_name || '');
                    setForm(prev => ({
                        ...prev,
                        ...res.profile,
                        websites: [websitesList[0] || '', websitesList[1] || ''],
                    }));
                }
                onClose();
            } else {
                throw new Error(res?.message || 'Failed to save profile on Meta');
            }
        } catch (err) {
            console.error('Save profile error:', err);
            const msg = err?.data?.detail || err?.detail || err?.message || 'Failed to update WhatsApp profile on Meta.';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const selectedCategoryObj = META_CATEGORIES.find(c => c.value === form.vertical) || META_CATEGORIES[0];
    const previewWebsites = form.websites
        .map(w => w.trim())
        .filter(w => w.length > 0)
        .map(w => /^https?:\/\//i.test(w) ? w : `https://${w}`);

    const getQualityBadge = () => {
        const rating = (form.quality_rating || '').toUpperCase();
        if (rating === 'GREEN') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    High Quality
                </span>
            );
        }
        if (rating === 'YELLOW') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Medium Quality
                </span>
            );
        }
        if (rating === 'RED') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Low Quality
                </span>
            );
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto custom-scrollbar">
            <div className="relative w-full max-w-5xl my-auto max-h-[92vh] flex flex-col rounded-2xl overflow-hidden bg-gradient-to-br from-[#0c1410] via-[#0d0d0d] to-[#070e0a] border border-[#4EED6E]/30 shadow-[0_0_80px_rgba(78,237,110,0.14),0_24px_60px_rgba(0,0,0,0.8)]">
                
                {/* Top Green Accent Bar */}
                <div className="h-1 w-full shrink-0 bg-gradient-to-r from-transparent via-[#4EED6E] to-transparent" />

                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/[0.08] bg-black/40 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(78,237,110,0.4)]">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                                <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                                    Phone profile
                                </h2>
                                {form.phone_number_id && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.1] text-[#4EED6E]/90">
                                        ID: {form.phone_number_id}
                                    </span>
                                )}
                                {getQualityBadge()}
                            </div>
                            <p className="text-xs text-white/50 truncate">
                                Choose the photo, name and information that customers see on WhatsApp.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fetchProfile(true)}
                            disabled={loading || refreshing}
                            title="Refresh from Meta Cloud API"
                            className="p-2 rounded-lg flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-[#4EED6E] transition-all cursor-pointer disabled:opacity-40"
                        >
                            <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#4EED6E]' : ''} />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all cursor-pointer text-white/60 hover:text-white"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* Modal Body: Two Columns */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-7">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 text-[#4EED6E] animate-spin" />
                            <p className="text-xs text-white/60">Fetching live WhatsApp Business profile from Meta...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                            
                            {/* Left Column: Form Settings (7 cols) */}
                            <div className="lg:col-span-7 space-y-6">
                                
                                {/* Profile Picture Section */}
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">Profile picture</h3>
                                        <p className="text-xs text-white/50">This will be visible on your WhatsApp Business profile</p>
                                    </div>

                                    <div className="flex items-center gap-4 pt-1">
                                        <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden bg-black/60 border-2 border-[#4EED6E]/40 flex items-center justify-center shrink-0 shadow-inner">
                                            {photoPreview ? (
                                                <img
                                                    src={photoPreview}
                                                    alt="WhatsApp Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#4EED6E]/20 to-green-900/40 flex items-center justify-center text-xl font-bold text-[#4EED6E]">
                                                    {form.verified_name?.charAt(0)?.toUpperCase() || 'W'}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handlePhotoSelect}
                                                accept="image/png, image/jpeg, image/jpg"
                                                className="hidden"
                                            />
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Camera size={13} className="text-[#4EED6E]" />
                                                    {photoPreview ? 'Change photo' : 'Choose file'}
                                                </button>

                                                {selectedPhotoFile && (
                                                    <button
                                                        type="button"
                                                        onClick={handleUploadPhotoNow}
                                                        disabled={uploadingPhoto}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#4EED6E]/20 hover:bg-[#4EED6E]/30 border border-[#4EED6E]/40 text-[#4EED6E] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                    >
                                                        {uploadingPhoto ? (
                                                            <>
                                                                <Loader2 size={12} className="animate-spin" />
                                                                Uploading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UploadCloud size={13} />
                                                                Upload to Meta now
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            {selectedPhotoFile && (
                                                <p className="text-[11px] text-[#4EED6E]/80">
                                                    Selected: {selectedPhotoFile.name} ({(selectedPhotoFile.size / 1024).toFixed(0)} KB) — Ready to upload.
                                                </p>
                                            )}
                                            <p className="text-[11px] text-white/40">
                                                Square JPG or PNG image recommended (minimum 192x192, up to 5MB). Images are automatically centered and optimized for WhatsApp.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Display Name Section */}
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-semibold text-white">Display name</h3>
                                            <p className="text-xs text-white/50">The business name customers see on WhatsApp</p>
                                        </div>

                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-500/15 border border-green-500/30 text-green-400">
                                            <Check size={11} />
                                            {form.name_status === 'APPROVED' ? 'Approved' : form.name_status}
                                        </span>
                                    </div>

                                    <div>
                                        <input
                                            type="text"
                                            value={form.verified_name}
                                            maxLength={100}
                                            placeholder="Enter business display name"
                                            onChange={e => setForm(prev => ({ ...prev, verified_name: e.target.value }))}
                                            className="w-full bg-[#070012] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4EED6E]/60 transition-colors"
                                        />
                                        {form.new_display_name && form.new_name_status && (
                                            <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-300">
                                                <Clock size={13} className="shrink-0" />
                                                <span>
                                                    Pending Meta review: <strong>{form.new_display_name}</strong> ({form.new_name_status})
                                                </span>
                                            </div>
                                        )}
                                        <p className="text-[11px] text-white/40 mt-1.5">
                                            Display name changes require Meta verification and review (up to 10 changes per 30 days).
                                        </p>
                                    </div>
                                </div>

                                {/* Business Information Form Fields */}
                                <div className="space-y-4">
                                    <div className="border-b border-white/[0.06] pb-2">
                                        <h3 className="text-sm font-semibold text-white">Business information</h3>
                                        <p className="text-xs text-white/50">Add details about your business to show customers</p>
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/70 mb-1.5">
                                            Category
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={form.vertical}
                                                onChange={e => setForm(prev => ({ ...prev, vertical: e.target.value }))}
                                                className="w-full bg-[#070012] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-[#4EED6E]/60 transition-colors appearance-none cursor-pointer"
                                            >
                                                {META_CATEGORIES.map(cat => (
                                                    <option key={cat.value} value={cat.value} className="bg-[#120C24] text-white">
                                                        {cat.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-medium text-white/70">
                                                Description <span className="text-white/40 font-normal">· Optional</span>
                                            </label>
                                            <span className="text-[11px] text-white/40">
                                                {form.description.length}/512
                                            </span>
                                        </div>
                                        <textarea
                                            value={form.description}
                                            maxLength={512}
                                            rows={3}
                                            placeholder="Tell customers what your business does..."
                                            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full bg-[#070012] border border-white/15 rounded-xl p-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4EED6E]/60 transition-colors resize-none"
                                        />
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-medium text-white/70">
                                                Address <span className="text-white/40 font-normal">· Optional</span>
                                            </label>
                                            <span className="text-[11px] text-white/40">
                                                {form.address.length}/256
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={form.address}
                                            maxLength={256}
                                            placeholder="Enter business address"
                                            onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                                            className="w-full bg-[#070012] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4EED6E]/60 transition-colors"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-medium text-white/70">
                                                Email <span className="text-white/40 font-normal">· Optional</span>
                                            </label>
                                            <span className="text-[11px] text-white/40">
                                                {form.email.length}/128
                                            </span>
                                        </div>
                                        <input
                                            type="email"
                                            value={form.email}
                                            maxLength={128}
                                            placeholder="info@yourcompany.com"
                                            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full bg-[#070012] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4EED6E]/60 transition-colors"
                                        />
                                    </div>

                                    {/* Websites */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-white/70">
                                            Websites <span className="text-white/40 font-normal">· Optional (up to 2)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.websites[0] || ''}
                                            maxLength={256}
                                            placeholder="https://yourwebsite.com"
                                            onChange={e => {
                                                const newWebs = [...form.websites];
                                                newWebs[0] = e.target.value;
                                                setForm(prev => ({ ...prev, websites: newWebs }));
                                            }}
                                            className="w-full bg-[#070012] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4EED6E]/60 transition-colors"
                                        />
                                        <input
                                            type="text"
                                            value={form.websites[1] || ''}
                                            maxLength={256}
                                            placeholder="https://blog.yourwebsite.com (Optional)"
                                            onChange={e => {
                                                const newWebs = [...form.websites];
                                                newWebs[1] = e.target.value;
                                                setForm(prev => ({ ...prev, websites: newWebs }));
                                            }}
                                            className="w-full bg-[#070012] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4EED6E]/60 transition-colors"
                                        />
                                    </div>

                                    {/* About (WhatsApp status text) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-medium text-white/70">
                                                About status <span className="text-white/40 font-normal">· Optional</span>
                                            </label>
                                            <span className="text-[11px] text-white/40">
                                                {form.about.length}/139
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={form.about}
                                            maxLength={139}
                                            placeholder="Available on WhatsApp"
                                            onChange={e => setForm(prev => ({ ...prev, about: e.target.value }))}
                                            className="w-full bg-[#070012] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4EED6E]/60 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="pt-1">
                                    <a
                                        href="https://business.facebook.com/latest/settings/whatsapp_account"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-[#4EED6E] hover:underline"
                                    >
                                        <span>See more settings in WhatsApp Manager</span>
                                        <ExternalLink size={12} />
                                    </a>
                                </div>
                            </div>

                            {/* Right Column: Live WhatsApp Mobile Profile Card Preview (5 cols) */}
                            <div className="lg:col-span-5 flex flex-col items-center sticky top-2">
                                <div className="w-full max-w-[340px] rounded-3xl overflow-hidden bg-[#11161d] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col">
                                    
                                    {/* Smartphone contact header bar */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-[#0d1117] border-b border-white/[0.06]">
                                        <div className="w-4 h-4 text-white/60">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                                <polyline points="15 18 9 12 15 6" />
                                            </svg>
                                        </div>
                                        <span className="text-[11px] font-medium text-white/60">Contact info</span>
                                        <div className="text-white/60 text-base leading-none font-bold">⋮</div>
                                    </div>

                                    {/* Profile Avatar & Top Details */}
                                    <div className="p-5 flex flex-col items-center text-center bg-[#11161d]">
                                        <div className="w-20 h-20 rounded-full overflow-hidden bg-black/60 border-2 border-[#4EED6E]/50 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(78,237,110,0.2)]">
                                            {photoPreview ? (
                                                <img
                                                    src={photoPreview}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#4EED6E]/30 to-green-950 flex items-center justify-center text-2xl font-bold text-[#4EED6E]">
                                                    {form.verified_name?.charAt(0)?.toUpperCase() || 'W'}
                                                </div>
                                            )}
                                        </div>

                                        <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                                            {form.verified_name || 'WhatsApp Business'}
                                        </h4>

                                        <p className="text-xs text-white/60 mt-0.5">
                                            {form.display_phone_number || initialDisplayPhone || 'Connected WhatsApp Number'}
                                        </p>

                                        {/* Action buttons */}
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className="px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs font-medium text-white/80 flex items-center gap-1.5">
                                                <Share2 size={13} className="text-[#4EED6E]" />
                                                Share
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info items list */}
                                    <div className="p-4 space-y-3 bg-[#0d1117] border-t border-white/[0.06] flex-1 text-xs">
                                        
                                        {/* Category */}
                                        <div className="flex items-start gap-3 text-white/80">
                                            <Briefcase size={15} className="text-white/40 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Category</p>
                                                <p className="text-white/90 font-medium">{selectedCategoryObj.label}</p>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {form.description && (
                                            <div className="flex items-start gap-3 text-white/80">
                                                <FileText size={15} className="text-white/40 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Description</p>
                                                    <p className="text-white/90 leading-relaxed break-words">{form.description}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Address */}
                                        {form.address && (
                                            <div className="flex items-start gap-3 text-white/80">
                                                <MapPin size={15} className="text-white/40 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Address</p>
                                                    <p className="text-white/90 leading-relaxed break-words">{form.address}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Email */}
                                        {form.email && (
                                            <div className="flex items-start gap-3 text-white/80">
                                                <Mail size={15} className="text-white/40 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Email</p>
                                                    <p className="text-[#4EED6E] font-medium break-all">{form.email}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Websites */}
                                        {previewWebsites.length > 0 && (
                                            <div className="flex items-start gap-3 text-white/80">
                                                <Globe size={15} className="text-white/40 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Website</p>
                                                    <div className="space-y-0.5">
                                                        {previewWebsites.map((web, idx) => (
                                                            <p key={idx} className="text-[#4EED6E] font-medium break-all">{web}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* About */}
                                        {form.about && (
                                            <div className="flex items-start gap-3 text-white/80">
                                                <Info size={15} className="text-white/40 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">About</p>
                                                    <p className="text-white/90 italic break-words">&ldquo;{form.about}&rdquo;</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Device notice footer */}
                                    <div className="px-4 py-2 bg-[#090c10] border-t border-white/[0.04] text-center">
                                        <p className="text-[10px] text-white/35 italic">
                                            Preview updates in real-time as you edit.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer Actions */}
                <div className="px-5 sm:px-7 py-4 border-t border-white/[0.08] bg-black/60 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                        <span className="w-2 h-2 rounded-full bg-[#4EED6E] shadow-[0_0_8px_rgba(78,237,110,0.8)]" />
                        <span className="hidden sm:inline">Syncs directly with Meta Cloud API & Business Suite</span>
                        <span className="sm:hidden">Meta Sync</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving || uploadingPhoto}
                            className="px-4 py-2 rounded-xl text-xs sm:text-[13px] font-medium text-white/60 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-all cursor-pointer disabled:opacity-40"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={saving || uploadingPhoto}
                            className="px-6 py-2 rounded-xl text-xs sm:text-[13px] font-semibold text-black bg-[#4EED6E] hover:bg-[#43da61] shadow-[0_0_20px_rgba(78,237,110,0.35)] hover:shadow-[0_0_28px_rgba(78,237,110,0.5)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={14} className="animate-spin text-black" />
                                    <span>Saving to Meta...</span>
                                </>
                            ) : (
                                <>
                                    <Check size={14} strokeWidth={2.5} />
                                    <span>Save changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
