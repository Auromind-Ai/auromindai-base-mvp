'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, UploadCloud, Link, FileText, CheckCircle2, Trash2, Search, Loader2, AlertCircle, X, Globe, MoreVertical, LayoutGrid, List as ListIcon, SlidersHorizontal } from 'lucide-react';
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

    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
    const [sortBy, setSortBy] = useState('newest');   // 'newest' | 'oldest' | 'name'
    const [showFilters, setShowFilters] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);

    // Fetch brain entries and stats
    const fetchData = async (silent = false) => {
        if (!workspaceId) return;

        try {
            if (!silent) setLoading(true);
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
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [workspaceId]);

    // Close open menus / dropdowns on outside click
    useEffect(() => {
        const closeMenus = () => { setOpenMenuId(null); setShowFilters(false); };
        document.addEventListener('click', closeMenus);
        return () => document.removeEventListener('click', closeMenus);
    }, []);

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
            // Silent refresh so the newly uploaded pending entry appears immediately
            await fetchData(true);
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
            await fetchData(true);
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
            await fetchData(true);
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
            await fetchData(true);
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

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';

    const getStatusMeta = (status) => {
        const s = (status || 'indexed').toLowerCase();
        let label = status || 'Indexed';
        if (s === 'completed' || s === 'indexed') label = 'completed';
        else if (s === 'failed') label = 'Failed';
        else if (s === 'syncing') label = 'Syncing';
        else if (s === 'processing') label = 'Processing';
        else if (s === 'unknown') label = 'Unknown';
        
        if (label && label.length > 0) {
            label = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
        }
        return { label };
    };

    const sortedEntries = [...filteredEntries].sort((a, b) => {
        if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return sortBy === 'oldest' ? da - db : db - da;
    });

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

            <div className="mb-10">
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
                className="relative rounded-xl p-4 md:p-6 border border-white/20
                bg-[#070012]
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

                    <div className="text-[10px] sm:text-xs text-white/60">
                    Knowledge Items
                    </div>
                </div>

                </div>
            </div>


            {/* Card 2 */}
            <div
                className="relative rounded-xl p-4 md:p-6 border border-white/20
                bg-[#070012]
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

                    <div className="text-xs text-white/60">
                    Indexed Chunks
                    </div>
                </div>

                </div>
            </div>


            {/* Card 3 */}
            <div
                className="relative rounded-xl p-4 md:p-6 border border-white/20
                bg-[#070012]
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

                    <div className="text-xs text-white/60">
                    Status
                    </div>
                </div>

                </div>
            </div>

            </div>

            {/* Upload Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

                {/*  Document Upload card — gradient changed to #814AC8  */}
                <div className="relative rounded-xl p-4 md:p-6 border-2 border-dashed border-[var(--notion-border)] text-center transition-all cursor-pointer group overflow-hidden bg-[#070012] hover:border-[#814AC8]/50">

                    

                    <div className="relative">
                        {currentEntryId && (
                        <div className="mb-4 flex justify-center">
                          <FileProgress 
                          entryId={currentEntryId} 
                          onDone={async () => {
                              setCurrentEntryId(null);
                              await fetchData(true);
                          }}
                          />
                         </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            disabled={uploading}
                        />
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white mx-auto mb-3 group-hover:scale-110 transition-transform">
                            {uploading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={46} strokeWidth={1.5} />}
                        </div>
                        <h3 className="font-bold text-[#D4D4D4] mb-1 tracking-tight">Upload Documents</h3>
                        <p className="text-sm text-[#787878] font-medium mb-4">PDF, Word, Excel, CSV, Images, or Text</p>

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
                <div className="relative rounded-xl p-4 md:p-6 border-2 border-dashed border-[var(--notion-border)] text-center group overflow-hidden bg-[#070012]">

                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white mx-auto mb-3 group-hover:scale-110 transition-transform">
                            {(syncing || crawling) ? <Loader2 size={24} className="animate-spin" /> : <Globe size={46} strokeWidth={1.5} />}
                        </div>
                        <h3 className="font-semibold text-[#D4D4D4] mb-1 tracking-tight">Sync Your Website</h3>
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

            {/* Indexed Knowledge */}
            <div className="rounded-xl border border-white/10 overflow-hidden shadow-xl mb-8 bg-[#070012] backdrop-blur-xl">

                {/* Header */}
                <div className="p-4 md:p-5 border-b border-white/10 flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="font-bold text-[#D4D4D4] tracking-tight text-base md:text-lg">Indexed Knowledge</h2>
                            <p className="text-xs text-white/40 mt-0.5 hidden sm:block">Manage and monitor all your knowledge sources.</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#814AC8] bg-[#814AC8]/10 border border-[#814AC8]/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                            {loading ? '...' : `${sortedEntries.length} items`}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565656]" />
                            <input
                                type="text"
                                placeholder="Search sources by name or type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-[#0d0d14] border border-white/10 rounded-xl text-sm text-[#D4D4D4] placeholder:text-[#565656] focus:outline-none transition-all font-medium"
                                onFocus={e => e.currentTarget.style.borderColor = 'rgba(129,74,200,0.5)'}
                                onBlur={e => e.currentTarget.style.borderColor = ''}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Filters */}
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowFilters(v => !v); }}
                                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#0d0d14] border border-white/10 rounded-xl text-xs font-medium text-[#D4D4D4] hover:border-[#814AC8]/40 transition-all"
                                >
                                    <SlidersHorizontal size={14} />
                                    Filters
                                </button>
                                {showFilters && (
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 mt-2 w-44 bg-[#111116] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden"
                                    >
                                        {[
                                            { key: 'newest', label: 'Newest first' },
                                            { key: 'oldest', label: 'Oldest first' },
                                            { key: 'name', label: 'Name (A–Z)' },
                                        ].map(opt => (
                                            <button
                                                key={opt.key}
                                                onClick={() => { setSortBy(opt.key); setShowFilters(false); }}
                                                className={`w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors ${sortBy === opt.key ? 'text-[#814AC8] bg-[#814AC8]/10' : 'text-[#D4D4D4] hover:bg-white/5'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* View toggle */}
                            <div className="flex items-center bg-[#0d0d14] border border-white/10 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#814AC8] text-white' : 'text-[#565656] hover:text-white'}`}
                                    title="Grid view"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#814AC8] text-white' : 'text-[#565656] hover:text-white'}`}
                                    title="List view"
                                >
                                    <ListIcon size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                {loading ? (
                    <div className="p-10 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#814AC8] mx-auto mb-2" />
                        <p className="text-sm text-[#787878]">Loading knowledge base...</p>
                    </div>
                ) : sortedEntries.length === 0 ? (
                    <div className="p-10 text-center">
                        <Brain className="w-12 h-12 text-[#3f3f3f] mx-auto mb-3" />
                        <p className="text-sm text-[#787878] font-medium">No knowledge found.</p>
                        <p className="text-xs text-white/40 mt-1">Try a different search term or upload documents.</p>
                    </div>
                ) : viewMode === 'list' ? (
                    <>
                        {/* Desktop column headers */}
                        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_130px_130px_130px_44px] gap-3 px-4 pt-3 pb-2 text-[12px] font-medium text-white/80">
                            <span>Source</span>
                            <span>File Type</span>
                            <span>Status</span>
                            <span>Last Updated</span>
                            <span></span>
                        </div>

                        <div className="divide-y divide-white/5">
                            {sortedEntries.map((item) => {
                                const status = getStatusMeta(item.status);
                                return (
                                    <div key={item.id} className="px-4 py-3.5 hover:bg-white/[0.03] transition-all group">
                                        {/* Desktop row */}
                                        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_130px_130px_130px_44px] gap-3 items-center">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 shrink-0 rounded-lg bg-[#2c2c2c] border border-white/10 flex items-center justify-center text-[#787878] group-hover:text-[#814AC8] group-hover:border-[#814AC8]/30 transition-all">
                                                    {item.content_type === 'url' ? <Link size={16} /> : <FileText size={16} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-[#D4D4D4] text-sm truncate">{item.title}</div>
                                                    <div className="text-[10px] text-white/40">{item.word_count || 0} words</div>
                                                </div>
                                            </div>
                                            <span className="text-xs font-medium text-white/60 uppercase truncate">{item.content_type || 'File'}</span>
                                            <span className="text-xs font-medium text-white/60">
                                                {status.label}
                                            </span>
                                            <span className="text-xs text-white/50">{formatDate(item.created_at)}</span>
                                            <div className="relative flex justify-end">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                                                    className="p-1.5 text-[#565656] hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {openMenuId === item.id && (
                                                    <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 w-36 bg-[#111116] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
                                                        <button
                                                            onClick={() => { setDeleteConfirmation({ isOpen: true, entryId: item.id }); setOpenMenuId(null); }}
                                                            className="w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                        >
                                                            <Trash2 size={13} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mobile / tablet card */}
                                        <div className="flex md:hidden flex-col gap-2.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 shrink-0 rounded-lg bg-[#2c2c2c] border border-white/10 flex items-center justify-center text-[#787878]">
                                                        {item.content_type === 'url' ? <Link size={16} /> : <FileText size={16} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-[#D4D4D4] text-sm truncate">{item.title}</div>
                                                        <div className="text-[10px] text-white/40">{item.word_count || 0} words</div>
                                                    </div>
                                                </div>
                                                <div className="relative shrink-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                                                        className="p-1.5 text-[#565656] hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {openMenuId === item.id && (
                                                        <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 w-36 bg-[#111116] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
                                                            <button
                                                                onClick={() => { setDeleteConfirmation({ isOpen: true, entryId: item.id }); setOpenMenuId(null); }}
                                                                className="w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                            >
                                                                <Trash2 size={13} /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 pl-12">
                                                <span className="text-[10px] font-medium text-white/50 bg-white/5 px-2 py-1 rounded-md uppercase">{item.content_type || 'File'}</span>
                                                <span className="text-[10px] font-medium text-white/60">
                                                    {status.label}
                                                </span>
                                                <span className="text-[10px] text-white/40">{formatDate(item.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    /* Grid view */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                        {sortedEntries.map((item) => {
                            const status = getStatusMeta(item.status);
                            return (
                                <div key={item.id} className="relative rounded-xl border border-white/10 bg-[#0d0d14] p-4 hover:border-[#814AC8]/30 transition-all group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#2c2c2c] border border-white/10 flex items-center justify-center text-[#787878] group-hover:text-[#814AC8] transition-all">
                                            {item.content_type === 'url' ? <Link size={18} /> : <FileText size={18} />}
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                                                className="p-1.5 text-[#565656] hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                            {openMenuId === item.id && (
                                                <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 w-36 bg-[#111116] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
                                                    <button
                                                        onClick={() => { setDeleteConfirmation({ isOpen: true, entryId: item.id }); setOpenMenuId(null); }}
                                                        className="w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                    >
                                                        <Trash2 size={13} /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="font-medium text-[#D4D4D4] text-sm truncate mb-1">{item.title}</div>
                                    <div className="text-[10px] text-white/40 mb-3">{item.word_count || 0} words</div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-white/60">
                                            {status.label}
                                        </span>
                                        <span className="text-[10px] text-white/40">{formatDate(item.created_at)}</span>
                                    </div>
                                </div>
                            );
                        })}
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