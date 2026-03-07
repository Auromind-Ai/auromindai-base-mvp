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

  useEffect(() => {
    checkConnection();
  }, []);

  /* ---------------------------
     CHECK GMAIL CONNECTION
  ---------------------------- */

  const checkConnection = async () => {

    const token = localStorage.getItem("token");

    const res = await fetch(
      `http://localhost:8000/integrations/status?workspace_id=${workspace?.id}`,
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

  /* ---------------------------
     LOAD EMAILS
  ---------------------------- */

  const loadMessages = async () => {

    const token = localStorage.getItem("token");

    const res = await fetch(
      `http://localhost:8000/email/inbox?workspace_id=${workspace?.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();

    setMessages(data.emails || []);
  };

  /* ---------------------------
     OPEN EMAIL
  ---------------------------- */

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
  };


  /* ---------------------------
     APPROVE AUTOMATION
  ---------------------------- */

  const approveAction = async () => {

    const token = localStorage.getItem("token");

    await fetch(
      `http://localhost:8000/automation/approve?decision_id=${aiData.id}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    alert("Automation executed");
  };

  /* ---------------------------
     REJECT AUTOMATION
  ---------------------------- */

  const rejectAction = async () => {

    const token = localStorage.getItem("token");

    await fetch(
      `http://localhost:8000/automation/reject?decision_id=${aiData.id}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    alert("Automation rejected");
  };

  /* ---------------------------
     SEND REPLY
  ---------------------------- */

  const sendReply = async () => {

    if (!aiData?.suggested_reply) {
      alert("No suggested reply available");
      return;
    }

    setSendingReply(true);

    const token = localStorage.getItem("token");

    await fetch(
      `http://localhost:8000/email/send-reply`,
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

  /* ---------------------------
     LOADING
  ---------------------------- */

  if (loading) {
    return <div className="text-white p-10">Loading...</div>;
  }

  /* ---------------------------
     NOT CONNECTED
  ---------------------------- */

  if (!connected) {
    return (
      <div className="text-white p-10">
        <h1>Gmail not connected</h1>
      </div>
    );
  }

  /* ===========================================================
     UI
  ============================================================ */

  return (

    <div className="min-h-screen bg-[#050505] text-white p-6">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">

        <div>
          <h1 className="text-3xl font-bold">Email</h1>
          <p className="text-gray-400">Manage your Gmail inbox</p>
        </div>

        <div className="flex gap-3">

          <button
            onClick={loadMessages}
            className="px-4 py-2 bg-white/10 rounded-lg flex items-center gap-2 hover:bg-white/20"
          >
            <RefreshCw size={16} /> Refresh
          </button>

          <a
            href="https://mail.google.com"
            target="_blank"
            className="px-4 py-2 bg-white/10 rounded-lg flex items-center gap-2 hover:bg-white/20"
          >
            <ExternalLink size={16} /> Open Gmail
          </a>

        </div>

      </div>

      {/* MAIN GRID */}

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT PANEL */}

        <div className="col-span-3 bg-[#111] rounded-xl border border-white/10">

          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <Inbox size={18} /> Inbox ({messages.length})
          </div>

          <div className="divide-y divide-white/10 max-h-[700px] overflow-y-auto">

            {messages.map((msg) => (

              <div
                key={msg.id}
                onClick={() => openEmail(msg)}
                className="p-4 cursor-pointer hover:bg-white/5"
              >

                <div className="text-sm font-medium">
                  {msg.from}
                </div>

                <div className="text-xs text-gray-400 truncate">
                  {msg.subject}
                </div>

                <div className="flex gap-2 mt-2 text-xs">

                  <span className={`px-2 py-0.5 rounded
                    ${msg.priority === "high"
                      ? "bg-red-600"
                      : msg.priority === "medium"
                        ? "bg-yellow-600"
                        : "bg-gray-600"}`}>
                    {msg.priority}
                  </span>

                  <span className="px-2 py-0.5 bg-indigo-600 rounded">
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

        <div className="col-span-6 bg-[#111] rounded-xl border border-white/10 p-6">

          {!selectedEmail && (
            <div className="text-gray-400">
              Select email to view
            </div>
          )}

          {selectedEmail && (

            <div>

              <h2 className="text-xl font-semibold mb-2">
                {selectedEmail.subject}
              </h2>

              <div className="text-sm text-gray-400 mb-6">
                From: {selectedEmail.from}
              </div>

              {/* CATEGORY */}

              <div className="bg-black/40 p-4 rounded-lg mb-4">
                <div className="text-sm text-gray-400">Category</div>
                <div>{aiData.category}</div>
              </div>

              {/* PRIORITY */}

              <div className="bg-black/40 p-4 rounded-lg mb-4">
                <div className="text-sm text-gray-400">Priority</div>
                <div>{aiData.priority}</div>
              </div>

              {/* CONFIDENCE */}

              <div className="bg-black/40 p-4 rounded-lg mb-4">
                <div className="text-sm text-gray-400">Confidence</div>
                <div>{Math.round(aiData.confidence * 100)}%</div>
              </div>

              {/* SUMMARY */}

              <div className="bg-black/40 p-4 rounded-lg mb-4">

                <div className="text-sm text-gray-400 mb-2">
                  Summary
                </div>

                <div>
                  {aiData.summary}
                </div>

              </div>

              {/* SUGGESTED REPLY */}

              {aiData?.suggested_reply && (

                <div className="bg-black/40 p-4 rounded-lg">

                  <div className="text-sm text-gray-400 mb-2">
                    Suggested Reply
                  </div>

                  {editingReply ? (

                    <textarea
                      value={editedReply}
                      onChange={(e) => setEditedReply(e.target.value)}
                      className="w-full bg-black border border-white/20 rounded-lg p-3 text-sm"
                      rows={6}
                    />

                  ) : (

                    <p className="text-sm whitespace-pre-line">
                      {editedReply}
                    </p>

                  )}

                  <div className="flex gap-3 mt-4">

                    <button
                      onClick={() => setEditingReply(!editingReply)}
                      className="bg-yellow-500 px-4 py-2 rounded-lg hover:bg-yellow-600"
                    >
                      {editingReply ? "Cancel" : "Edit"}
                    </button>

                    <button
                      onClick={sendReply}
                      disabled={sendingReply}
                      className="bg-green-500 px-4 py-2 rounded-lg hover:bg-green-600"
                    >
                      {sendingReply ? "Sending..." : "Send Reply"}
                    </button>

                  </div>

                </div>

              )}

            </div>

          )}

        </div>

        {/* RIGHT PANEL */}

        <div className="col-span-3 bg-[#111] rounded-xl border border-white/10 p-6">

          <h2 className="font-semibold mb-4">
            AI Automation
          </h2>

          {aiData && (

            <div className="space-y-4">

              {/* ACTION PLAN */}

              {aiData.actions?.length > 0 && (

                <div className="bg-black/40 p-4 rounded-lg">

                  <div className="text-sm text-gray-400 mb-2">
                    Planned Actions
                  </div>

                  {aiData.actions.map((action, index) => (

                    <div
                      key={index}
                      className="text-sm text-green-400"
                    >
                      • {action.type.replaceAll("_", " ")}
                    </div>

                  ))}

                </div>

              )}

              {/* ACTION BUTTONS */}

              <div className="flex gap-3">

                <button
                  onClick={approveAction}
                  className="flex-1 bg-indigo-500 py-2 rounded-lg hover:bg-indigo-600"
                >
                  Approve
                </button>

                <button
                  onClick={rejectAction}
                  className="flex-1 bg-red-500 py-2 rounded-lg hover:bg-red-600"
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