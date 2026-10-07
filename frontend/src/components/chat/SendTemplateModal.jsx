'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { X, Send, Image as ImageIcon, Video, FileText, Upload, AlertCircle, CheckCircle2, Phone } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatVariableLabel, getSampleValue } from '@/lib/variableUtils';

export default function SendTemplateModal({ isOpen, onClose, workspace, lead, onSuccess }) {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [variables, setVariables] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const modalFileInputRef = useRef(null);

    const workspaceId = workspace?.id || (typeof workspace === 'string' ? workspace : null);
    const recipientPhone = lead?.phone || lead?.contact_phone || lead?.external_id || '';
    const recipientName = lead?.name || lead?.contact_name || 'Lead';

    const extractVariables = (template) => {
        if (!template || !template.content) return {};
        const matches = template.content.match(/\{\{\[?(\d+)\]?\}\}/g) || [];
        const uniqueVars = {};

        let varMap = {};
        if (template.variable_mapping) {
            try {
                varMap = typeof template.variable_mapping === 'string'
                    ? JSON.parse(template.variable_mapping)
                    : (template.variable_mapping || {});
            } catch (e) {
                varMap = {};
            }
        }

        const isAuthTemplate = 
            (template?.category || '').toUpperCase() === 'AUTHENTICATION' ||
            (template?.name || '').toLowerCase().includes('otp') ||
            (template?.name || '').toLowerCase().includes('verification');

        matches.forEach(m => {
            const num = m.replace(/[{}[\]]/g, '');
            const mappedName = (varMap[num] || '').toLowerCase().trim();

            const isOtp = 
                isAuthTemplate ||
                mappedName.includes('otp') ||
                mappedName.includes('verification') ||
                mappedName.includes('passcode') ||
                mappedName.includes('code');

            const isContactName = 
                !isOtp &&
                (mappedName === 'customer_name' ||
                 mappedName === 'first_name' ||
                 mappedName === 'name' ||
                 mappedName === 'client_name' ||
                 (!mappedName && num === '1'));

            if (isContactName && recipientName && recipientName !== 'Lead') {
                uniqueVars[num] = recipientName;
            } else {
                uniqueVars[num] = '';
            }
        });
        return uniqueVars;
    };

    const handleSelectTemplate = useCallback((template) => {
        setSelectedTemplate(template);
        setVariables(extractVariables(template));
    }, []);

    useEffect(() => {
        if (!isOpen || !workspaceId) return;
        const fetchTemplates = async () => {
            setFetching(true);
            try {
                const data = await api.get('/api/templates');
                const list = data.templates || [];
                const approved = list.filter(t => t.status === 'approved');
                setTemplates(approved);
                if (approved.length > 0) {
                    handleSelectTemplate(approved[0]);
                }
            } catch (e) {
                console.error('Failed to fetch templates:', e);
            } finally {
                setFetching(false);
            }
        };
        fetchTemplates();
    }, [isOpen, workspaceId, handleSelectTemplate]);

    if (!isOpen) return null;

    const isMediaType = selectedTemplate?.type === 'IMAGE' || selectedTemplate?.type === 'VIDEO' || selectedTemplate?.type === 'DOCUMENT';
    const resolvedMedia = selectedTemplate?.media_url || (selectedTemplate?.header?.startsWith('http') ? selectedTemplate?.header : null);

    const getPreviewContent = () => {
        if (!selectedTemplate) return '';
        let text = selectedTemplate.content;
        let varMap = {};
        if (selectedTemplate?.variable_mapping) {
            try {
                varMap = typeof selectedTemplate.variable_mapping === 'string'
                    ? JSON.parse(selectedTemplate.variable_mapping)
                    : (selectedTemplate.variable_mapping || {});
            } catch (e) {
                varMap = {};
            }
        }
        Object.keys(variables).forEach(k => {
            const mappedName = varMap[k];
            const fallback = mappedName ? `{{${mappedName}}}` : `{{${k}}}`;
            const val = variables[k] || fallback;
            text = text.replaceAll(`{{${k}}}`, val);
            text = text.replaceAll(`{{[${k}]}}`, val);
        });
        return text;
    };

    const handleSend = async () => {
        if (!selectedTemplate) {
            showToast('Please select a template to send.', 'warning');
            return;
        }
        if (!workspaceId) {
            showToast('Missing workspace context. Please refresh and try again.', 'error');
            return;
        }
        if (!recipientPhone) {
            showToast('This lead does not have a valid phone number to receive WhatsApp messages.', 'warning');
            return;
        }
        if (isMediaType && !resolvedMedia) {
            showToast(`Please upload a ${selectedTemplate.type.toLowerCase()} header first!`, 'warning');
            modalFileInputRef.current?.click();
            return;
        }

        setLoading(true);
        try {
            const varArray = Object.keys(variables)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(k => variables[k]);

            const res = await api.post('/api/messages/send', {
                workspace_id: workspaceId,
                phone: recipientPhone,
                template_name: selectedTemplate.name,
                variables: varArray,
                media_url: resolvedMedia
            });

            // Dispatch global event so wallet balance badges & indicators update immediately
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('wcc-balance-updated'));
            }

            const preview = getPreviewContent();
            if (onSuccess) {
                onSuccess(preview, res);
            }
            showToast('Template message sent successfully!', 'success');
            onClose();
        } catch (e) {
            console.error('Send template error:', e);
            const detailMsg = e?.data?.detail || e?.message || 'Failed to send template message';
            if (e?.status === 402 || detailMsg.toLowerCase().includes('insufficient')) {
                showToast(detailMsg, 'error');
            } else {
                showToast(`Error sending template message: ${detailMsg}`, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const varKeys = Object.keys(variables).sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#15161C] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#191a24]">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-white uppercase tracking-wider">Send WhatsApp Template</span>
                            {selectedTemplate?.category && (
                                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {selectedTemplate.category}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                            <Phone size={12} className="text-emerald-400" />
                            <span>Sending to: <strong className="text-white">{recipientName}</strong> ({recipientPhone || 'No phone'})</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    {fetching ? (
                        <div className="text-center py-10 space-y-2">
                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-zinc-500 text-[13px]">Fetching approved templates...</p>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-8 space-y-3">
                            <AlertCircle size={32} className="text-amber-400 mx-auto opacity-70" />
                            <p className="text-zinc-400 text-[13px] font-medium">No approved WhatsApp templates found.</p>
                            <p className="text-zinc-500 text-[12px] max-w-xs mx-auto">Create and submit templates to Meta in the Templates section.</p>
                            <Link
                                href="/user/admin/templates"
                                className="inline-block text-[12px] font-bold text-emerald-400 hover:underline pt-2"
                            >
                                Go to Templates Page →
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Template selector */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Select Approved Template</label>
                                <select
                                    value={selectedTemplate?.id || ''}
                                    onChange={e => {
                                        const found = templates.find(t => t.id === e.target.value);
                                        if (found) handleSelectTemplate(found);
                                    }}
                                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-emerald-500/50 transition-colors"
                                >
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.category || 'MARKETING'} • {t.language || 'en_US'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Header Media Upload/Preview if IMAGE or VIDEO template */}
                            {isMediaType && (
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                                        Header {selectedTemplate?.type === 'VIDEO' ? 'Video' : selectedTemplate?.type === 'DOCUMENT' ? 'Document' : 'Image'}
                                    </label>
                                    <input
                                        ref={modalFileInputRef}
                                        type="file"
                                        accept={selectedTemplate?.type === 'VIDEO' ? 'video/*' : selectedTemplate?.type === 'DOCUMENT' ? 'application/pdf' : 'image/*'}
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file || !selectedTemplate) return;
                                            setUploadingMedia(true);
                                            try {
                                                const fd = new FormData();
                                                fd.append('file', file);
                                                const res = await api.post(`/api/templates/${selectedTemplate.id}/media`, fd);
                                                setSelectedTemplate(prev => ({ ...prev, media_url: res.media_url }));
                                                setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? { ...t, media_url: res.media_url } : t));
                                                showToast('Media attached successfully!', 'success');
                                            } catch (err) {
                                                showToast(err?.message || 'Failed to upload media', 'error');
                                            } finally {
                                                setUploadingMedia(false);
                                                if (modalFileInputRef.current) modalFileInputRef.current.value = '';
                                            }
                                        }}
                                    />
                                    {resolvedMedia ? (
                                        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                            {selectedTemplate?.type === 'VIDEO' ? (
                                                <video src={resolvedMedia} className="w-full h-28 object-cover" controls />
                                            ) : (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={resolvedMedia} alt="Header Preview" className="w-full h-28 object-cover" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => modalFileInputRef.current?.click()}
                                                disabled={uploadingMedia}
                                                className="absolute top-2 right-2 px-2.5 py-1 rounded bg-black/80 hover:bg-emerald-600 text-white text-[11px] font-medium transition-colors cursor-pointer"
                                            >
                                                {uploadingMedia ? 'Uploading...' : 'Change'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => modalFileInputRef.current?.click()}
                                            disabled={uploadingMedia}
                                            className="w-full py-3 px-3 rounded-xl border border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-300 text-[12px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                        >
                                            <Upload size={14} />
                                            <span>{uploadingMedia ? 'Uploading media...' : `Click to upload ${selectedTemplate?.type?.toLowerCase() || 'media'} header`}</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Variable inputs */}
                            {varKeys.length > 0 && (
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Template Variables</label>
                                    {varKeys.map(k => {
                                        let varMap = {};
                                        if (selectedTemplate?.variable_mapping) {
                                            try {
                                                varMap = typeof selectedTemplate.variable_mapping === 'string'
                                                    ? JSON.parse(selectedTemplate.variable_mapping)
                                                    : (selectedTemplate.variable_mapping || {});
                                            } catch (e) {
                                                varMap = {};
                                            }
                                        }
                                        const mappedName = varMap[k];
                                        const displayLabel = mappedName ? formatVariableLabel(mappedName) : `Variable {{${k}}}`;
                                        const placeholder = mappedName ? `e.g. ${getSampleValue(mappedName)}` : `Enter value for {{${k}}}`;

                                        return (
                                            <div key={k} className="flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[12px] text-zinc-300 font-medium flex items-center gap-1.5">
                                                        <span>{displayLabel}</span>
                                                        {mappedName && (
                                                            <span className="text-[11px] text-emerald-400">
                                                                {`{{${mappedName}}}`}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={variables[k]}
                                                    onChange={e => setVariables(prev => ({ ...prev, [k]: e.target.value }))}
                                                    placeholder={placeholder}
                                                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-emerald-500/50 transition-colors"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Live Preview */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Preview</label>
                                <div className="bg-[#1f2029] border border-white/5 rounded-2xl p-4 text-[13px] text-[#eee] leading-relaxed whitespace-pre-wrap">
                                    {selectedTemplate?.header && !selectedTemplate.header.startsWith('http') && (
                                        <div className="font-bold text-white text-sm mb-1">{selectedTemplate.header}</div>
                                    )}
                                    {getPreviewContent() || 'No preview available.'}
                                    {selectedTemplate?.footer && (
                                        <div className="text-[11px] text-zinc-400 mt-2">{selectedTemplate.footer}</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-[#181820] flex items-center justify-between gap-2 shrink-0">
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Deducts WCC from wallet upon delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-[12px] font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        {templates.length > 0 && (
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={loading || !recipientPhone}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-emerald-900/20 cursor-pointer"
                            >
                                <Send size={13} />
                                <span>{loading ? 'Sending...' : 'Send Template'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
