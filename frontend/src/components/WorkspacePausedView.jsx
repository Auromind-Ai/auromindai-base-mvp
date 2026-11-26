'use client';

import { useState } from 'react';
import { Lock, RefreshCw, LogOut, Building2, Mail, Check, AlertCircle } from 'lucide-react';
import { poppins } from '@/lib/fonts';

export default function WorkspacePausedView({
  workspace,
  ownerName,
  ownerEmail,
  workspaces = [],
  currentWorkspaceId,
  onSwitchWorkspace,
  onRefresh,
  onLogout,
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isSwitchingOpen, setIsSwitchingOpen] = useState(false);

  const workspaceName = workspace?.name || 'Workspace';
  const displayOwnerName = ownerName || workspace?.owner_name || 'Workspace Owner';
  const displayOwnerEmail = ownerEmail || workspace?.owner_email || null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const handleCopyEmail = () => {
    if (!displayOwnerEmail || typeof navigator === 'undefined') return;
    navigator.clipboard?.writeText(displayOwnerEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const otherWorkspaces = (workspaces || []).filter(
    (w) => w.id !== currentWorkspaceId && !w.is_paused
  );

  return (
    <div
      className={`${poppins.className} relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#070b13] px-4 py-12 text-zinc-200 select-none`}
    >
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#814ac8]/15 blur-[140px]" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <div className="rounded-3xl border border-white/10 bg-[#0c121f]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          {/* Header Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <Lock size={28} className="animate-pulse" />
          </div>

          {/* Title & Description */}
          <div className="mt-5 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              Seat Access Paused
            </span>
            <h1 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Workspace Plan Expired
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
              Your team seat in{' '}
              <span className="font-semibold text-white">{workspaceName}</span> is
              temporarily paused because the workspace plan expired under the team seat limit.
            </p>
          </div>

          {/* Workspace Owner Contact Card */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#814ac8]/25 text-base font-bold text-[#d9c5f3]">
                {displayOwnerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  Workspace Owner
                </p>
                <p className="truncate text-sm font-semibold text-white">
                  {displayOwnerName}
                </p>
                {displayOwnerEmail && (
                  <p className="truncate text-xs text-zinc-400">{displayOwnerEmail}</p>
                )}
              </div>
              {displayOwnerEmail && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                  title="Copy owner email"
                >
                  {copiedEmail ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : (
                    <Mail size={14} />
                  )}
                </button>
              )}
            </div>

            <p className="mt-3 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-zinc-400">
              Please ask your workspace owner to renew or upgrade their plan to automatically
              restore your access.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw
                size={15}
                className={isRefreshing ? 'animate-spin' : ''}
              />
              <span>{isRefreshing ? 'Checking Access...' : 'Check Access Again'}</span>
            </button>

            {otherWorkspaces.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSwitchingOpen((prev) => !prev)}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-xs font-medium text-zinc-200 transition-all hover:bg-white/10 hover:text-white active:scale-98 cursor-pointer"
                >
                  <Building2 size={14} className="text-zinc-400" />
                  <span>Switch Workspace ({otherWorkspaces.length} available)</span>
                </button>

                {isSwitchingOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-full space-y-1 rounded-2xl border border-white/15 bg-[#0f172a] p-2 shadow-2xl z-50">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Available Workspaces
                    </p>
                    {otherWorkspaces.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setIsSwitchingOpen(false);
                          if (onSwitchWorkspace) {
                            onSwitchWorkspace(w.id);
                          } else if (typeof window !== 'undefined') {
                            localStorage.setItem('workspace_id', w.id);
                            window.location.reload();
                          }
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-zinc-200 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                      >
                        <Building2 size={13} className="text-violet-400 shrink-0" />
                        <span className="truncate flex-1">{w.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => onLogout?.()}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-medium text-zinc-400 transition-colors hover:text-red-400 cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Footnote */}
        <p className="mt-4 text-center text-[11px] text-zinc-500">
          All workspace data and chat history remain securely saved.
        </p>
      </div>
    </div>
  );
}
