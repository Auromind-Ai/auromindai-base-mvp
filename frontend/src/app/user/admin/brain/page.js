'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Upload, Link, FileText, CheckCircle2, Trash2, Search, Loader2, AlertCircle, X, Globe } from 'lucide-react';
import api from '@/lib/api';
import { getWorkspace } from '@/lib/auth';

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
    const [searchResults, setSearchResults] = useState(null);
    const [searching, setSearching] = useState(false);
    const fileInputRef = useRef(null);

    const workspace = getWorkspace();
    const workspaceId = workspace?.id;

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
            setStats(statsRes);
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
            setSuccess(`Uploaded "${result.title}" - ${result.chunks_created} chunks created`);
            await fetchData();
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
    const handleDelete = async (entryId) => {
        if (!workspaceId) return;

        try {
            await api.deleteBrainEntry(entryId, workspaceId);
            setSuccess('Entry deleted successfully');
            await fetchData();
        } catch (err) {
            setError(err.message || 'Delete failed');
        }
    };

    // Handle search
    const handleSearch = async () => {
        if (!searchQuery.trim() || !workspaceId) return;

        try {
            setSearching(true);
            setError(null);
            const result = await api.searchBrain(searchQuery.trim(), workspaceId);
            setSearchResults(result);
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

    if (!workspaceId) {
        return (
            <div className="max-w-5xl mx-auto p-8 text-center">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-[#D4D4D4] mb-2">No Workspace Selected</h2>
                <p className="text-[#9b9b9b]">Please log in to access the Brain.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
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

            <div className="mb-8 p-4">
                <h1 className="text-2xl font-bold text-[#D4D4D4] mb-1 font-display tracking-tight">Brain (Knowledge Base)</h1>
                <p className="text-[#9b9b9b] font-medium">Upload documents and sync websites to train your AI on your business knowledge.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 p-4">
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                            <Brain size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#D4D4D4]">
                                {loading ? '-' : stats.knowledge_entries || entries.length}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#565656]">Knowledge Items</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#D4D4D4]">
                                {loading ? '-' : stats.indexed_chunks || 0}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#565656]">Indexed Chunks</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            <FileText size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#D4D4D4]">
                                {loading ? '-' : stats.status === 'active' ? 'Active' : 'Empty'}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#565656]">Status</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8 p-4">
                {/* Document Upload */}
                <div className="bg-[var(--card)] rounded-xl p-6 border-2 border-dashed border-[var(--notion-border)] text-center hover:border-indigo-500/50 hover:bg-[#252525] transition-all cursor-pointer group">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.doc,.txt,.md"
                        className="hidden"
                        disabled={uploading}
                    />
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-3 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                        {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                    </div>
                    <h3 className="font-bold text-[#D4D4D4] mb-1 tracking-tight">Upload Documents</h3>
                    <p className="text-sm text-[#787878] font-medium mb-4">PDF, DOCX, or TXT files (max 10MB)</p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                    >
                        {uploading ? 'Uploading...' : 'Browse Files'}
                    </button>
                </div>

                {/* Website Sync */}
                <div className="bg-[var(--card)] rounded-xl p-6 border-2 border-dashed border-[var(--notion-border)] text-center group">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-3 border border-emerald-500/20 group-hover:scale-110 transition-transform">
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
                            className="w-full px-4 py-2.5 bg-[#191919] border border-[var(--notion-border)] rounded-xl text-sm text-[#D4D4D4] placeholder:text-[#565656] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                            disabled={syncing || crawling}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleUrlSync}
                                disabled={syncing || crawling || !urlInput.trim()}
                                className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-[#D4D4D4] text-xs font-bold rounded-xl transition-all border border-[#3f3f3f] active:scale-95 disabled:opacity-50"
                                title="Sync single page only"
                            >
                                {syncing ? 'Syncing...' : 'Single Page'}
                            </button>
                            <button
                                onClick={handleWebsiteCrawl}
                                disabled={syncing || crawling || !urlInput.trim()}
                                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
                        <p className="text-[10px] text-[#565656]">
                            "Entire Website" crawls all pages (blogs, products, FAQs, etc.)
                        </p>
                    </div>
                </div>
            </div>


            {/* Search Section */}
            <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--notion-border)] mx-4 mb-6 shadow-sm">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565656]" />
                        <input
                            type="text"
                            placeholder="Search your knowledge base..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2.5 bg-[#191919] border border-[var(--notion-border)] rounded-xl text-sm text-[#D4D4D4] placeholder:text-[#565656] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={searching || !searchQuery.trim()}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        Search
                    </button>
                </div>

                {/* Search Results */}
                {searchResults && (
                    <div className="mt-4 pt-4 border-t border-[var(--notion-border)]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-[#D4D4D4]">
                                {searchResults.results?.length || 0} results for "{searchResults.query}"
                            </h3>
                            <button
                                onClick={() => setSearchResults(null)}
                                className="text-[#787878] hover:text-[#D4D4D4] text-xs"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="space-y-3">
                            {searchResults.results?.map((result, i) => (
                                <div key={result.id || i} className="bg-[#191919] rounded-lg p-3 border border-[var(--notion-border)]">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-indigo-400">{result.title}</span>
                                        <span className="text-[10px] font-bold text-[#565656] bg-[#252525] px-2 py-0.5 rounded">
                                            {(result.score * 100).toFixed(0)}% match
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#9b9b9b] line-clamp-2">{result.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Knowledge List */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--notion-border)] overflow-hidden mx-4 shadow-xl mb-8">
                <div className="p-4 border-b border-[var(--notion-border)] bg-[#252525]/50 flex items-center justify-between">
                    <h2 className="font-bold text-[#D4D4D4] tracking-tight">Indexed Knowledge</h2>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#565656]">
                        {loading ? 'Loading...' : `${entries.length} items`}
                    </span>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-2" />
                        <p className="text-sm text-[#787878]">Loading knowledge base...</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="p-8 text-center">
                        <Brain className="w-12 h-12 text-[#3f3f3f] mx-auto mb-3" />
                        <p className="text-sm text-[#787878] font-medium">No knowledge indexed yet.</p>
                        <p className="text-xs text-[#565656] mt-1">Upload documents or sync URLs to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#2f2f2f]">
                        {entries.map((item) => (
                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-[#252525] transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#2c2c2c] border border-[#3f3f3f] flex items-center justify-center text-[#787878] group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all shadow-sm">
                                        {item.content_type === 'url' ? <Link size={18} /> : <FileText size={18} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[#D4D4D4] text-sm tracking-tight">{item.title}</div>
                                        <div className="text-[10px] font-bold text-[#565656] uppercase tracking-wider">
                                            {item.content_type?.toUpperCase()} • {item.word_count || 0} words • {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.15em] rounded-full border border-emerald-500/20">
                                        <CheckCircle2 size={12} />
                                        {item.status || 'indexed'}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(item.id)}
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
    );
}
