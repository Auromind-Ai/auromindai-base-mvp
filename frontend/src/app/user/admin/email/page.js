'use client';

import { useState, useEffect } from "react";
import { Inbox, RefreshCw, ExternalLink } from "lucide-react";
import { getWorkspace } from "@/lib/auth";

export default function EmailPage() {

  const workspace = getWorkspace();

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [aiData, setAiData] = useState(null);

  const [sendingReply, setSendingReply] = useState(false);
  const [editedReply, setEditedReply] = useState("");
  const [editingReply, setEditingReply] = useState(false);
  const [mobileView, setMobileView] = useState("inbox"); 

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `http://localhost:8002/integrations/status?workspace_id=${workspace?.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const isConnected = data.gmail?.connected || false;
    setConnected(isConnected);

    if (isConnected) {
      await loadMessages();
    }

    setLoading(false);
  };

  const loadMessages = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `http://localhost:8002/email/inbox?workspace_id=${workspace?.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();
    setMessages(data.emails || []);
  };

  const openEmail = (msg) => {

    setSelectedEmail(msg);

    setAiData({
      id: msg.id,
      category: msg.category,
      priority: msg.priority,
      confidence: msg.confidence,
      summary: msg.summary,
      suggested_reply: msg.suggested_reply,
      actions: msg.actions
    });

    setEditedReply(msg.suggested_reply || "");

    if (window.innerWidth < 1024) {
    setMobileView("chat");
    }
  };

  const approveAction = async () => {
    const token = localStorage.getItem("token");

    await fetch(
      `http://localhost:8002/automation/approve?decision_id=${aiData.id}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    alert("Automation executed");
  };

  const rejectAction = async () => {
    const token = localStorage.getItem("token");

    await fetch(
      `http://localhost:8002/automation/reject?decision_id=${aiData.id}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    alert("Automation rejected");
  };

  const sendReply = async () => {

    if (!aiData?.suggested_reply) {
      alert("No suggested reply available");
      return;
    }

    setSendingReply(true);

    const token = localStorage.getItem("token");

    await fetch(
      `http://localhost:8002/email/send-reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          workspace_id: workspace?.id,
          message_id: selectedEmail.id,
          thread_id: selectedEmail.thread_id,
          to_email: selectedEmail.from,
          subject: selectedEmail.subject,
          reply_text: editedReply
        })
      }
    );

    setSendingReply(false);
    alert("Reply sent successfully");
  };

  if (loading) {
    return <div className="text-white p-10">Loading...</div>;
  }

  if (!connected) {
    return (
      <div className="text-white p-10">
        <h1>Gmail not connected</h1>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden text-white p-4 md:p-6
    bg-gradient-to-br from-[#0f172a] via-[#020617] to-black">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-3xl font-bold
          bg-gradient-to-r from-indigo-400 to-cyan-400
          bg-clip-text text-transparent">
            Email AI Inbox
          </h1>
          <p className="text-gray-400 text-xs md:text-sm">
            AI powered email automation
          </p>
        </div>

        <div className="flex gap-2 md:gap-3">

        <button
          onClick={loadMessages}
          className="flex items-center gap-1 md:gap-2
          px-2.5 md:px-4 py-1.5 md:py-2
          text-xs md:text-sm
          rounded-lg
          bg-white/5 border border-white/10
          hover:bg-white/10 transition">

          <RefreshCw size={14} className="md:w-4 md:h-4" />
          <span className="hidden sm:inline">Refresh</span>

        </button>

        <a
          href="https://mail.google.com"
          target="_blank"
          className="flex items-center gap-1 md:gap-2
          px-2.5 md:px-4 py-1.5 md:py-2
          text-xs md:text-sm
          rounded-lg
          bg-indigo-500 hover:bg-indigo-600 transition">

          <ExternalLink size={14} className="md:w-4 md:h-4" />
          <span className="hidden sm:inline">Gmail</span>

        </a>

      </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-12 gap-4 md:gap-6 flex-1 min-h-0 overflow-hidden">

        {/* LEFT PANEL */}
        <div className={`col-span-12 lg:col-span-3 flex flex-col h-full min-h-0
          bg-white/[0.03] backdrop-blur-xl
          border border-white/10 rounded-2xl overflow-hidden
          ${mobileView === "chat" ? "hidden lg:flex" : "flex"}`}
          >

          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <Inbox size={18} /> Inbox ({messages.length})
          </div>

          <div className="flex-1 overflow-y-auto email-scroll">

            {messages.map((msg) => (

              <div
                key={msg.id}
                onClick={() => openEmail(msg)}
                className="p-4 border-b border-white/5
                hover:bg-white/[0.04]
                transition cursor-pointer">

                <div className="text-xs md:text-sm font-medium">
                  {msg.from}
                </div>

                <div className="text-xs text-gray-400 truncate">
                  {msg.subject}
                </div>

                <div className="flex gap-2 mt-2 text-xs">

                  <span className={`px-2 py-1 rounded-md border
                  ${msg.priority === "high"
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : msg.priority === "medium"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    }`}>

                    {msg.priority}

                  </span>

                  <span className="px-2 py-1 rounded-md
                  bg-indigo-500/20 text-indigo-400
                  border border-indigo-500/30">

                    {msg.category}
                  </span>

                  <span className="text-gray-400">
                    {Math.round(msg.confidence * 100)}%
                  </span>

                </div>

                <div className="text-xs text-gray-500 truncate mt-2">
                  {msg.summary || "AI summary loading..."}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL */}
        <div className={`col-span-12 lg:col-span-7 flex flex-col h-full relative min-h-0
          bg-white/[0.03] backdrop-blur-xl
          border border-white/10
          rounded-2xl overflow-hidden
          ${mobileView === "inbox" ? "hidden lg:flex" : "flex"}`}
          >

          {!selectedEmail && (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select email to view
            </div>
          )}

          {selectedEmail && (
          <div className="flex flex-col h-full">
            {/* MOBILE HEADER */}
            <div className="flex items-center justify-between mb-4 px-6 pt-6 lg:hidden">

              <button
                onClick={() => setMobileView("inbox")}
                className="text-sm bg-white/10 px-3 py-1 rounded-md">
                ← Inbox
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5 pb-28 email-scroll">
              <h2 className="text-lg md:text-base lg:text-xl font-semibold mb-2">
                {selectedEmail.subject}
              </h2>
              <div className="text-xs md:text-xs lg:text-sm text-gray-400 mb-6">
                From: {selectedEmail.from}
              </div>

              <div className="space-y-4">

                <div className="bg-black/30 p-4 rounded-xl">
                  <div className="text-xs md:text-sm text-gray-400">Category</div>
                  <div>{aiData.category}</div>
                </div>

                <div className="bg-black/30 p-4 rounded-xl">
                  <div className="text-xs md:text-sm text-gray-400">Priority</div>
                  <div>{aiData.priority}</div>
                </div>

                <div className="bg-black/30 p-4 rounded-xl">
                  <div className="text-xs md:text-sm text-gray-400">Confidence</div>
                  <div>{Math.round(aiData.confidence * 100)}%</div>
                </div>

                <div className="bg-black/30 p-4 rounded-xl">
                  <div className="text-xs md:text-sm text-gray-400 mb-2">Summary</div>
                  <div>{aiData.summary}</div>
                </div>

                {aiData?.suggested_reply && (
                  <div className="bg-black/30 p-4 rounded-xl">
                    <div className="text-xs md:text-sm text-gray-400 mb-2">
                      Suggested Reply
                    </div>
                    {editingReply ? (
                      <textarea
                        value={editedReply}
                        onChange={(e) => setEditedReply(e.target.value)}
                        className="w-full bg-black/50 border border-white/20
                        rounded-lg p-3 text-xs md:text-sm"
                        rows={6}
                      />
                    ) : (
                      <p className="text-xs md:text-sm whitespace-pre-line">
                        {editedReply}
                      </p>
                    )}

                    <div className="absolute bottom-0 left-0 right-0
                    bg-[#020617]/90 backdrop-blur-md
                    border-t border-white/10
                    px-8 py-4 flex justify-between items-center">

                      <button
                        onClick={() => setEditingReply(!editingReply)}
                        className="w-[140px] py-2 text-xs md:text-sm font-medium rounded-md
                        bg-gradient-to-r from-[#3a0f16] via-[#1a060a] to-[#060203]
                        hover:from-[#4a131b] hover:via-[#22080d] hover:to-[#080304]
                        border border-[#7a2a34]/30
                        text-white transition-all duration-200">
                        {editingReply ? "Cancel" : "Edit"}
                      </button>

                      <button
                        onClick={sendReply}
                        disabled={sendingReply}
                        className="w-[140px] py-2 text-xs md:text-sm font-medium rounded-md
                        bg-gradient-to-r from-[#24464a] via-[#142c2f] to-[#0a1718]
                        hover:from-[#2d5a5f] hover:via-[#193a3d] hover:to-[#0e2022]
                        border border-[#3f7b80]/30
                        text-white transition-all duration-200">
                        {sendingReply ? "Sending..." : "Send Reply"}
                      </button>

                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className={`col-span-12 lg:col-span-2
          bg-gradient-to-b from-indigo-500/10 to-transparent
          border border-indigo-500/20
          rounded-2xl p-4 md:p-6
          ${mobileView === "inbox" ? "hidden lg:block" : "block"}`}
          >

          <h2 className="font-semibold mb-4">
            AI Automation
          </h2>

          {aiData && (
            <div className="space-y-4">
              {aiData.actions?.length > 0 && (
                <div className="bg-black/30 p-4 rounded-xl">
                  <div className="text-xs md:text-sm text-gray-400 mb-2">
                    Planned Actions
                  </div>
                  {aiData.actions.map((action, index) => (
                    <div
                      key={index}
                      className="text-xs md:text-sm text-green-400">
                      • {action.type.replaceAll("_", " ")}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
              <button
                onClick={approveAction}
                className="flex-1 py-1.5 text-xs md:text-sm font-medium rounded-md
                bg-gradient-to-r from-[#1f3f44] to-[#0b1f23]
                hover:from-[#25545a] hover:to-[#0e2c30]
                border border-[#2b5d63]/40
                text-white transition-all duration-200"
              >
                Approve
              </button>

              <button
                onClick={rejectAction}
                className="flex-1 py-1.5 text-xs md:text-sm font-medium rounded-md
                bg-gradient-to-r from-[#3b230c] to-[#140b04]
                hover:from-[#4a2d12] hover:to-[#1b0e05]
                border border-[#7c4a1f]/30
                text-white transition-all duration-200"
              >
                Reject
              </button>

            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
