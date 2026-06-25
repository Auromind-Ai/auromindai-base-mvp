'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Upload, Link, FileText, CheckCircle2, Trash2, Search, Loader2, AlertCircle, X, Globe } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import FileProgress from "./FileProgress";
import AnimatedCounter from "../AnimatedCounter";

export default function BrainPage() {
    const [entries, setEntries] = useState([]);
    const [stats, setStats] = useState({ indexed_chunks: 0, knowledge_entries: 0 });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [crawling, setCrawling] = useState(false);

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [urlInput, setUrlInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentEntryId, setCurrentEntryId] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, entryId: null });
    const fileInputRef = useRef(null);

    const { workspaceId } = useAuth();

    // Fetch brain entries and stats
    const fetchData = async () => {
        if (!workspaceId) return;

        try {
            setLoading(true);
            const [entriesRes, statsRes] = await Promise.all([
                api.getBrainEntries(workspaceId),
                api.getBrainStats(workspaceId)
            ]);
            setEntries(entriesRes.entries || []);
            setStats({
                knowledge_entries: statsRes.knowledge_entries,
                indexed_chunks: entriesRes.indexed_chunks,
                status: entriesRes.status
            });
        } catch (err) {
            console.error('Failed to fetch brain data:', err);
            setError('Failed to load knowledge base');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [workspaceId]);

    // Handle file upload
    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !workspaceId) return;

        try {
            setUploading(true);
            setError(null);
            const result = await api.uploadDocument(file, workspaceId);
            setCurrentEntryId(result.entry_id);
            setSuccess("File uploaded. Processing started.");
        } catch (err) {
            setError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Handle URL sync (single page)
    const handleUrlSync = async () => {
        if (!urlInput.trim() || !workspaceId) return;

        try {
            setSyncing(true);
            setError(null);
            const result = await api.syncURL(urlInput.trim(), workspaceId);
            setSuccess(`Synced "${result.title}" - ${result.chunks_created} chunks created`);
            setUrlInput('');
            await fetchData();
        } catch (err) {
            setError(err.message || 'URL sync failed');
        } finally {
            setSyncing(false);
        }
    };

    // Handle full website crawl
    const handleWebsiteCrawl = async () => {
        if (!urlInput.trim() || !workspaceId) return;

        try {
            setCrawling(true);
            setError(null);
            setSuccess('Crawling website... This may take a few minutes.');
            const result = await api.crawlWebsite(urlInput.trim(), workspaceId, 50);
            setSuccess(`🎉 Indexed ${result.pages_crawled} pages (${result.chunks_created} chunks) from your website!`);
            setUrlInput('');
            await fetchData();
        } catch (err) {
            setError(err.message || 'Website crawl failed');
        } finally {
            setCrawling(false);
        }
    };


    // Handle delete
    const handleDelete = async () => {
        const entryId = deleteConfirmation.entryId;
        if (!workspaceId || !entryId) return;

        try {
            await api.deleteBrainEntry(entryId, workspaceId);
            setSuccess('Entry deleted successfully');
            await fetchData();
        } catch (err) {
            setError(err.message || 'Delete failed');
        } finally {
            setDeleteConfirmation({ isOpen: false, entryId: null });
        }
    };

    // Handle search
    const handleSearch = async () => {
        if (!searchQuery.trim() || !workspaceId) return;

        try {
            setSearching(true);
            setError(null);
            const result = await api.searchBrain(searchQuery.trim(), workspaceId);

            const normalized = {
                query: searchQuery.trim(),
                results: result?.results 
                    || result?.data 
                    || result?.matches 
                    || result?.chunks 
                    || []
            };
            setSearchResults(normalized);

        } catch (err) {
            setError(err.message || 'Search failed');
        } finally {
            setSearching(false);
        }
    };



    // Clear notifications after 5 seconds
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const filteredEntries = entries.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.content_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!workspaceId) {
        return (
            <div className="max-w-5xl mx-auto p-8 text-center" style={{ fontFamily: "'Poppins', sans-serif" }}>
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-[#D4D4D4] mb-2">No Workspace Selected</h2>
                <p className="text-[#9b9b9b]">Please log in to access the Brain.</p>
            </div>
        );
    }

    return (
        <>
            {/*  1. Poppins font import  */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
            `}</style>

        <div className="w-full bg-[#07070a] min-h-screen pt-6 md:pt-10 lg:pt-12 pb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 space-y-6">
            {/* Notifications */}
            {success && (
                <div className="fixed top-4 right-4 z-50 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-medium">{success}</span>
                    <button onClick={() => setSuccess(null)} className="ml-2 hover:text-emerald-300">
                        <X size={16} />
                    </button>
                </div>
            )}
            {error && (
                <div className="fixed top-4 right-4 z-50 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} />
                    <span className="text-sm font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-2 hover:text-rose-300">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="mb-10 text-center">
                <h1 className="text-xl lg:text-3xl font-semibold text-white tracking-tight">
                    Brain (Knowledge Base)
                </h1>

                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    Upload documents and sync websites to train your AI on your business knowledge.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

            {/* Card 1 */}
            <div
                className="relative rounded-xl p-4 md:p-6 border border-white/10
                bg-[#07070a]
                backdrop-blur-xl hover:-translate-y-1 hover:shadow-xl transition-all"
            >
                <div className="flex items-center gap-4">

                <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400">
                    <Brain size={20} />
                </div>

                <div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                    {loading ? '-' : <AnimatedCounter value={stats.knowledge_entries || entries.length} />}
                    </div>

                    <div className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-500">
                    Knowledge Items
                    </div>
                </div>

                </div>
            </div>


            {/* Card 2 */}
            <div
                className="relative rounded-xl p-4 md:p-6 border border-white/10
                bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent
                backdrop-blur-xl hover:-translate-y-1 hover:shadow-xl transition-all"
            >
                <div className="flex items-center gap-4">

                <div className="w-11 h-11 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={20} />
                </div>

                <div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                    {loading ? '-' : <AnimatedCounter value={stats.indexed_chunks || 0} />}
                    </div>

                    <div className="text-xs uppercase tracking-widest text-zinc-500">
                    Indexed Chunks
                    </div>
                </div>

                </div>
            </div>


            {/* Card 3 */}
            <div
                className="relative rounded-xl p-4 md:p-6 border border-white/10
                bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent
                backdrop-blur-xl hover:-translate-y-1 hover:shadow-xl transition-all"
            >
                <div className="flex items-center gap-4">

                <div className="w-11 h-11 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                    <FileText size={20} />
                </div>

                <div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-white capitalize">
                    {loading ? '-' : stats.status || 'Empty'}
                    </div>

                    <div className="text-xs uppercase tracking-widest text-zinc-500">
                    Status
                    </div>
                </div>

                </div>
            </div>

            </div>

            {/* Upload Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

                {/*  Document Upload card — gradient changed to #814AC8  */}
                <div className="relative rounded-xl p-4 md:p-6 border-2 border-dashed border-[var(--notion-border)] text-center transition-all cursor-pointer group overflow-hidden bg-[#0b0b0b] hover:border-[#814AC8]/50">

                    {/*  3. Purple corner glow  */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: "radial-gradient(400px circle at 100% 0%, rgba(129,74,200,0.30), transparent 60%)"
                        }}
                    />

                    <div className="relative">
                        {currentEntryId && (
                        <div className="mb-4 flex justify-center">
                          <FileProgress 
                          entryId={currentEntryId} 
                          onDone={() => setCurrentEntryId(null)}
                          />
                         </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.xls,.csv"
                            className="hidden"
                            disabled={uploading}
                        />
                        <div className="w-12 h-12 rounded-full bg-[#814AC8]/10 flex items-center justify-center text-[#814AC8] mx-auto mb-3 border border-[#814AC8]/20 group-hover:scale-110 transition-transform">
                            {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                        </div>
                        <h3 className="font-bold text-[#D4D4D4] mb-1 tracking-tight">Upload Documents</h3>
                        <p className="text-sm text-[#787878] font-medium mb-4">PDF, Excel, CSV, DOCX, or TXT (max 10MB)</p>

                        {/*  2. Button bg → #814AC8  */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="px-6 py-2 text-white text-xs font-regular rounded-xl transition-all active:scale-95 disabled:opacity-50"
                            style={{
                                backgroundColor: '#814AC8',
                                boxShadow: '0 4px 14px rgba(129,74,200,0.30)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#9B6ED8'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#814AC8'}
                        >
                            {uploading ? 'Uploading...' : 'Browse Files'}
                        </button>
                    </div>
                </div>

                {/*  Website Sync card — gradient changed to #814AC8  */}
                <div className="relative rounded-xl p-4 md:p-6 border-2 border-dashed border-[var(--notion-border)] text-center group overflow-hidden bg-[#0b0b0b]">

                    {/*  3. Purple corner glow  */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: "radial-gradient(400px circle at 100% 0%, rgba(129,74,200,0.30), transparent 60%)"
                        }}
                    />

                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-[#814AC8]/10 flex items-center justify-center text-[#814AC8] mx-auto mb-3 border border-[#814AC8]/20 group-hover:scale-110 transition-transform">
                            {(syncing || crawling) ? <Loader2 size={24} className="animate-spin" /> : <Globe size={24} />}
                        </div>
                        <h3 className="font-bold text-[#D4D4D4] mb-1 tracking-tight">Sync Your Website</h3>
                        <p className="text-sm text-[#787878] font-medium mb-4">Index your entire website into the AI Brain</p>
                        <div className="flex flex-col gap-3 max-w-sm mx-auto">
                            <input
                                type="text"
                                placeholder="https://yourcompany.com"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[#191919] border border-[var(--notion-border)] rounded-xl text-sm text-[#D4D4D4] placeholder:text-[#565656] focus:outline-none transition-all font-medium"
                                style={{ '--tw-ring-color': 'rgba(129,74,200,0.5)' }}
                                onFocus={e => e.currentTarget.style.borderColor = 'rgba(129,74,200,0.5)'}
                                onBlur={e => e.currentTarget.style.borderColor = ''}
                                disabled={syncing || crawling}
                            />
                            <div className="flex flex-col lg:flex-row gap-2">
                                {/* Single Page — kept as subtle dark button */}
                                <button
                                    onClick={handleUrlSync}
                                    disabled={syncing || crawling || !urlInput.trim()}
                                    className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-[#D4D4D4] text-xs font-regular rounded-xl transition-all border border-[#3f3f3f] active:scale-95 disabled:opacity-50"
                                    title="Sync single page only"
                                >
                                    {syncing ? 'Syncing...' : 'Single Page'}
                                </button>

                                {/*  2. Entire Website button → #814AC8  */}
                                <button
                                    onClick={handleWebsiteCrawl}
                                    disabled={syncing || crawling || !urlInput.trim()}
                                    className="flex-1 px-4 py-2 text-white text-xs font-regular rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    style={{
                                        backgroundColor: '#814AC8',
                                        boxShadow: '0 4px 14px rgba(129,74,200,0.30)',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#9B6ED8'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#814AC8'}
                                >
                                    {crawling ? (
                                        <>
                                            <Loader2 size={12} className="animate-spin" />
                                            Crawling...
                                        </>
                                    ) : (
                                        <>
                                            <Globe size={12} />
                                            Entire Website
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-[10px] text-white/60">
                                &quot;Entire Website&quot; crawls all pages (blogs, products, FAQs, etc.)
                            </p>
                        </div>
                    </div>
                </div>
            </div>


            {/* Search Section */}
            <div className="rounded-xl p-4 mb-6 border border-white/10
            bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent
            backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565656]" />
                        <input
                            type="text"
                            placeholder="Filter knowledge base by document name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[#191919] border border-[var(--notion-border)] rounded-xl text-sm text-[#D4D4D4] placeholder:text-[#565656] focus:outline-none transition-all font-medium"
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(129,74,200,0.5)'}
                            onBlur={e => e.currentTarget.style.borderColor = ''}
                        />
                    </div>
                </div>
            </div>

            {/* Knowledge List */}
            <div className="rounded-xl border border-white/10 overflow-hidden shadow-xl mb-8
            bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent
            backdrop-blur-xl">
                <div className="p-4 border-b border-[var(--notion-border)] bg-[#252525]/50 flex items-center justify-between">
                    <h2 className="font-bold text-[#D4D4D4] tracking-tight">Indexed Knowledge</h2>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#565656]">
                        {loading ? 'Loading...' : `${filteredEntries.length} items`}
                    </span>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#814AC8] mx-auto mb-2" />
                        <p className="text-sm text-[#787878]">Loading knowledge base...</p>
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="p-8 text-center">
                        <Brain className="w-12 h-12 text-[#3f3f3f] mx-auto mb-3" />
                        <p className="text-sm text-[#787878] font-medium">No knowledge found.</p>
                        <p className="text-xs text-white/60 mt-1">Try a different search term or upload documents.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#2f2f2f]">
                        {filteredEntries.map((item) => (
                            <div key={item.id} className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 hover:bg-[#252525] transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#2c2c2c] border border-[#3f3f3f] flex items-center justify-center text-[#787878] group-hover:text-[#814AC8] group-hover:border-[#814AC8]/30 transition-all shadow-sm">
                                        {item.content_type === 'url' ? <Link size={18} /> : <FileText size={18} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[#D4D4D4] text-sm tracking-tight">{item.title}</div>
                                        <div className="text-[10px] font-bold text-[#565656] uppercase tracking-wider">
                                            {item.content_type?.toUpperCase()} • {item.word_count || 0} words • {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:self-center">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.15em] rounded-full border border-emerald-500/20">
                                        <CheckCircle2 size={12} />
                                        {item.status || 'indexed'}
                                    </span>
                                    <button
                                        onClick={() => setDeleteConfirmation({ isOpen: true, entryId: item.id })}
                                        className="p-2 text-[#565656] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Delete entry"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 mx-auto">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white text-center mb-2">Delete Knowledge Entry?</h3>
                        <p className="text-sm text-[#787878] text-center mb-6">
                            This action cannot be undone. The indexed chunks will be removed from your AI's brain.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmation({ isOpen: false, entryId: null })}
                                className="flex-1 px-4 py-2.5 bg-[#252525] hover:bg-[#2f2f2f] text-white text-sm font-medium rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition-all shadow-[0_4px_14px_rgba(244,63,94,0.3)]"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}