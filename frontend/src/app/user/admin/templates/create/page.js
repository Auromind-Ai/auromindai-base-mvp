'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { getWorkspaceIdFromToken } from '@/lib/auth';

export default function CreateTemplatePage() {
  const [form, setForm] = useState({
    category: 'MARKETING',
    language: 'en_US',
    name: '',
    type: 'TEXT',
    header: '',
    message: '',
    footer: '',
    cta: '',
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [tone, setTone] = useState("normal");
  const [generatedTemplates, setGeneratedTemplates] = useState([]);
  const isAuth = form.category === "AUTHENTICATION";

  const handleGenerate = async () => {
  if (!aiPrompt || aiPrompt.trim() === "") {
    alert("Please enter a prompt to generate message");
    return;
  }

  try {
    const res = await api.post("/templates/generate", {
      prompt: aiPrompt,
      tone: tone,
      language: form.language 
    });

    console.log("AI RESPONSE:", res);

    let templates = [];

    if (res?.message) {
      try {
        let cleanMessage = res.message
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        const parsed = JSON.parse(cleanMessage);
        templates = parsed.templates || [];
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    } else {
      templates = res?.templates || res?.data?.templates || [];
    }

    setGeneratedTemplates(templates);

  } catch (err) {
    console.error(err);
  }
};
const handleSubmit = async () => {
  try {
    await api.post('/templates/create', {
      name: form.name,
      type: form.type,
      message: form.message,
      header: form.header,
      footer: form.footer,
      cta: form.cta,
      category: form.category,
      language: form.language,
      workspace_id: getWorkspaceIdFromToken() // 🔥 ADD THIS
    });

    window.location.href = "/user/admin/templates";

  } catch (err) {
    console.error(err);
    alert(err.message || 'Failed to create template');
  }
};

  return (
    <div className="p-6 text-white max-w-7xl mx-auto">

      {/* HEADER */}
      <h1 className="text-xl font-semibold mb-6">New Template Message</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* LEFT SIDE */}
        <div className="md:col-span-2 space-y-6">

          {/* CATEGORY + LANGUAGE */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400">Template Category</label>
              <select
                className="w-full bg-[#1f1f1f] p-2 rounded mt-1"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option>MARKETING</option>
                <option>UTILITY</option>
                <option>AUTHENTICATION</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400">Template Language</label>
              <select
                className="w-full bg-[#1f1f1f] p-2 rounded mt-1"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                <option value="en_US">English (US)</option>
                <option value="en_GB">English (UK)</option>
                <option value="ta">Tamil</option>
              </select>
            </div>
            <div>
            <label className="text-sm text-gray-400">Template Type</label>
            <select
              className="w-full bg-[#1f1f1f] p-2 rounded mt-1"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="TEXT">Text</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>
          </div>

          {/* AI GENERATOR */}
          {!isAuth && (
          <div className="bg-[#1f1f1f] p-4 rounded border border-[#2a2a2a]">
            <h3 className="font-semibold mb-2">✨ Generate with AI</h3>
            <div className="grid grid-cols-3 gap-4 mt-4">


            <textarea
              placeholder="Write your prompt..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full bg-black p-2 rounded text-sm mb-3"
            />

            {/* STYLE BUTTONS */}
            <div className="flex gap-2 mb-3">

  <button
    onClick={() => setTone("normal")}
    className={`px-3 py-1 rounded ${
      tone === "normal"
        ? "bg-green-600 text-white"
        : "bg-gray-700 text-gray-300"
    }`}
  >
    Normal
  </button>

  <button
    onClick={() => setTone("exciting")}
    className={`px-3 py-1 rounded ${
      tone === "exciting"
        ? "bg-green-600 text-white"
        : "bg-gray-700 text-gray-300"
    }`}
  >
    🔥 Exciting
  </button>

  <button
    onClick={() => setTone("funny")}
    className={`px-3 py-1 rounded ${
      tone === "funny"
        ? "bg-green-600 text-white"
        : "bg-gray-700 text-gray-300"
    }`}
  >
    😂 Funny
  </button>

</div>

            <button
  onClick={handleGenerate}
  disabled={!aiPrompt || aiPrompt.trim() === ""}
  className={`px-4 py-2 rounded w-full ${
    !aiPrompt ? "bg-gray-500 cursor-not-allowed" : "bg-green-600"
  }`}
>
  Generate Message
</button>
                      {generatedTemplates.map((tpl, i) => (
            <div key={i} className="bg-[#1f1f1f] p-4 rounded border">

              <p className="text-sm whitespace-pre-line mb-3">
                {tpl.text}
              </p>

              <button
                onClick={() =>
                  setForm({ ...form, message: tpl.text })
                }
                className="bg-green-600 px-3 py-1 rounded w-full"
              >
                Use this
              </button>

            </div>
          ))}
        </div>
          </div>
          )}

          {/* TEMPLATE NAME */}
          <div>
            <label className="text-sm text-gray-400">Template Name</label>
            <input
              className="w-full bg-[#1f1f1f] p-2 rounded mt-1"
              placeholder="order_confirmation"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Only lowercase, no spaces (e.g. order_update)
            </p>
          </div>

          {/* HEADER */}
          {form.type === "TEXT" && (
            <div>
              <label className="text-sm text-gray-400">Header (Optional)</label>
              <input
                className="w-full bg-[#1f1f1f] p-2 rounded mt-1"
                placeholder="Header text"
                value={form.header}
                onChange={(e) => setForm({ ...form, header: e.target.value })}
              />
            </div>
          )}

          {/* BODY */}
          <div>
            <label className="text-sm text-gray-400">Message Body</label>
            <textarea
              className="w-full bg-[#1f1f1f] p-2 rounded mt-1 h-32"
              placeholder="Hi {{1}}..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use variables like {'{{1}}'}, {'{{2}}'}
            </p>
          </div>

          {/* FOOTER */}
          <div>
            <label className="text-sm text-gray-400">Footer (Optional)</label>
            <input
              className="w-full bg-[#1f1f1f] p-2 rounded mt-1"
              placeholder="Footer text"
              value={form.footer}
              onChange={(e) => setForm({ ...form, footer: e.target.value })}
            />
          </div>

          {/* CTA */}
          {!isAuth && (
          <div>
            <label className="text-sm text-gray-400">Call To Action (Optional)</label>
            <input
              className="w-full bg-[#1f1f1f] p-2 rounded mt-1"
              placeholder="https://yourlink.com"
              value={form.cta}
              onChange={(e) => setForm({ ...form, cta: e.target.value })}
            />
          </div>
          )}

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            className="bg-green-600 px-4 py-2 rounded w-full"
            >
            Submit for Approval
            </button>

        </div>

        {/* RIGHT SIDE PREVIEW */}
        <div className="bg-[#1f1f1f] p-4 rounded border border-[#2a2a2a]">
          <h3 className="mb-3 font-semibold">Preview</h3>

          <div className="bg-white text-black p-3 rounded w-[300px]">
            {form.header && <p className="font-semibold">{form.header}</p>}

            <p className="text-sm whitespace-pre-line mt-1">
              {form.message || "Message preview..."}
            </p>

            {form.footer && (
              <p className="text-xs text-gray-500 mt-2">{form.footer}</p>
            )}

            {form.cta && (
              <button className="text-blue-600 mt-2 text-sm">
                Visit Link
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}