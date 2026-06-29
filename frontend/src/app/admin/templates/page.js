"use client";

import { useState, useEffect } from "react";
import { getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const SYSTEM_TAGS = [
  "trending", "general", "top_rated",
  "ecommerce", "education", "banking", 
  "healthcare", "real_estate", "travel"
];

export default function AdminTemplatesPage() {
  const router = useRouter();
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "TEXT",
    category: "UTILITY",
    language: "en_US",
    content: "",
    system_tag: "trending",
    header: "",
    footer: "",
    cta: "",
    cta_btn_title: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/templates/system`, {
        headers: {
          "Authorization": `Bearer ${getToken()}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch system templates");
      const data = await res.json();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/admin/templates/system`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error("Failed to create template");
      
      // Reset form
      setFormData({
        name: "", type: "TEXT", category: "UTILITY", language: "en_US",
        content: "", system_tag: "trending", header: "", footer: "", cta: "", cta_btn_title: ""
      });
      
      fetchTemplates();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this system template?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/templates/system/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${getToken()}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete template");
      fetchTemplates();
    } catch (err) {
      alert("Error deleting template: " + err.message);
    }
  };

  return (
    <div className="h-full w-full p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">PR / System Templates</h1>
          <p className="text-gray-400">Manage sample templates available to all users</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Form */}
          <div className="lg:col-span-1 bg-[#0f0f0f] border border-white/10 rounded-xl p-6 h-fit">
            <h2 className="text-xl font-semibold text-white mb-6">Add New Template</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name (snake_case)</label>
                <input
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-[#161616] border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="e.g. order_update"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 rounded-lg px-4 py-2 text-white">
                    <option value="TEXT">TEXT</option>
                    <option value="IMAGE">IMAGE</option>
                    <option value="VIDEO">VIDEO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 rounded-lg px-4 py-2 text-white">
                    <option value="UTILITY">UTILITY</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tag (Industry)</label>
                  <select name="system_tag" value={formData.system_tag} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 rounded-lg px-4 py-2 text-white">
                    {SYSTEM_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Language</label>
                  <input name="language" value={formData.language} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 rounded-lg px-4 py-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Header (Optional)</label>
                <input name="header" value={formData.header} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 rounded-lg px-4 py-2 text-white" />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Body Content</label>
                <textarea
                  required
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full bg-[#161616] border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Hi {{1}}, your order {{2}}..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Footer (Optional)</label>
                <input name="footer" value={formData.footer} onChange={handleInputChange} className="w-full bg-[#161616] border border-white/10 rounded-lg px-4 py-2 text-white" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus size={16} /> {isSubmitting ? "Adding..." : "Add System Template"}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Existing Templates</h2>
            
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : templates.length === 0 ? (
              <p className="text-gray-400 text-sm">No system templates found.</p>
            ) : (
              <div className="grid gap-4">
                {templates.map(tpl => (
                  <div key={tpl.id} className="bg-[#161616] border border-white/5 rounded-lg p-4 flex gap-4 items-start">
                    <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-medium">{tpl.name}</h3>
                        <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-gray-300">
                          {tpl.system_tag}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{tpl.category} • {tpl.language}</p>
                      <div className="text-sm text-gray-300 bg-white/5 p-3 rounded border border-white/5 whitespace-pre-wrap">
                        {tpl.content}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(tpl.id)} className="text-red-400 hover:text-red-300 p-2">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
