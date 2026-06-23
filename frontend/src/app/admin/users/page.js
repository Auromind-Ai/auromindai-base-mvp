"use client";

import { useState, useEffect } from "react";
import { getToken, setAdminBackup } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { Users, CheckCircle, Mail, ExternalLink, Loader2 } from "lucide-react";
import api from "@/lib/api";

const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "http://localhost:3000";

export default function UsersPage() {
  const router = useRouter();
  const params = useParams();
  const adminPath = params?.admin_path || "x7k2-admin-9pqm";
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [impersonating, setImpersonating] = useState(null);

  useEffect(() => {
    const decodeJwt = (token) => {
      try {
        return JSON.parse(atob(token.split(".")[1]));
      } catch {
        return null;
      }
    };

    const current = getToken();
    try {
      const payload = decodeJwt(current);
      if (current && !payload?.impersonated) {
        localStorage.setItem("admin_backup_token", current); // 🔥 ALWAYS overwrite
      }
    } catch (err) {
      console.error("Could not set admin backup:", err);
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);

        const data = await api.getPlatformUsers();
        setUsers(Array.isArray(data) ? data : data.users || []);
        setError(null);
      } catch (err) {
        if (err.status === 401 || err.status === 404) {
          router.push(`/${adminPath}`);
          return;
        }
        setError(err.message);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [router, adminPath]);

  const handleViewDashboard = async (userId) => {
    setImpersonating(userId);

    try {
      const data = await api.switchUser(userId);

      const { session_id } = data;
      if (!session_id) {
        throw new Error("No session ID returned from server");
      }

      const url = `${CLIENT_URL}/impersonate/${session_id}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Impersonation failed:", err);
      alert("Could not start impersonation: " + err.message);
    } finally {
      setImpersonating(null);
    }
  };
  const activeUsers = users.filter((u) => u.is_active)?.length || 0;
  const totalUsers = users.length;

  return (
    <div className="h-full w-full p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
          <p className="text-gray-400">Manage platform users and their permissions</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading users...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard icon={Users} label="Total Users" value={totalUsers} />
              <StatCard icon={CheckCircle} label="Active Users" value={activeUsers} />
              <StatCard icon={Mail} label="Verified Users" value={users.filter((u) => u.is_verified)?.length || 0} />
            </div>

            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">User List</h2>

              {users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Name</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Email</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Role</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Joined</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Action</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="py-4 px-4 text-white">{user.full_name || user.first_name || "N/A"}</td>
                          <td className="py-4 px-4 text-gray-300">{user.email}</td>
                          <td className="py-4 px-4 text-gray-300 text-sm">{user.role || "user"}</td>
                          <td className="py-4 px-4 text-gray-400 text-sm">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleViewDashboard(user.id)}
                              disabled={impersonating === user.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                                         bg-indigo-600/20 text-indigo-400 border border-indigo-500/30
                                         hover:bg-indigo-600/40 hover:border-indigo-500/60 hover:text-indigo-300
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         transition-all duration-150"
                            >
                              {impersonating === user.id ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" /> Opening…
                                </>
                              ) : (
                                <>
                                  <ExternalLink size={12} /> View Dashboard
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  user.is_active ? "bg-green-900/30 text-green-300" : "bg-gray-900/30 text-gray-300"
                                }`}
                              >
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No users found</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="text-indigo-400" size={24} />
      </div>
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  );
}
