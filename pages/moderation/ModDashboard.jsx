import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { flagsAPI, classesAPI, usersAPI, messagesAPI, postsAPI, commentsAPI, reviewsAPI } from "../../api";
import TopNav from "../../components/TopNav";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_COLORS = {
  message: "bg-sky-100 text-sky-800",
  post:    "bg-violet-100 text-violet-800",
  comment: "bg-amber-100 text-amber-800",
  review:  "bg-emerald-100 text-emerald-800",
};

const ROLE_COLORS = {
  admin:     "bg-red-100 text-red-700",
  moderator: "bg-emerald-100 text-emerald-700",
  student:   "bg-stone-100 text-stone-600",
};

export default function ModDashboard() {
  const { currentUser } = useAuth();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");

  const isAdmin = currentUser?.role === "admin";

  const [newClass, setNewClass] = useState({ id: "", name: "", programs: "" });
  const [classMsg, setClassMsg] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(null);

  useEffect(() => {
    flagsAPI.list()
      .then(({ flags: all }) => setFlags(all))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "users" && isAdmin && users.length === 0) {
      setUsersLoading(true);
      usersAPI.list()
        .then(({ users: all }) => setUsers(all))
        .catch(() => {})
        .finally(() => setUsersLoading(false));
    }
  }, [activeTab, isAdmin]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCreateClass(e) {
    e.preventDefault();
    try {
      const programs = newClass.programs
        ? newClass.programs.split(",").map((p) => p.trim()).filter(Boolean)
        : [];
      await classesAPI.create({ id: newClass.id, name: newClass.name, programs });
      setClassMsg({ ok: true, text: `Class "${newClass.name}" created!` });
      setNewClass({ id: "", name: "", programs: "" });
    } catch (err) {
      setClassMsg({ ok: false, text: err.message || "Failed to create class" });
    }
    setTimeout(() => setClassMsg(null), 4000);
  }

  async function handleRoleChange(userId, newRole) {
    setRoleUpdating(userId);
    try {
      const { user } = await usersAPI.updateRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: user.role } : u));
      showToast(`Role updated to ${newRole}.`);
    } catch (err) {
      showToast(err.message || "Failed to update role");
    } finally {
      setRoleUpdating(null);
    }
  }

  async function handleRemoveContent(flag) {
    try {
      const { target_type, target_id } = flag;
      if (target_type === "message")  await messagesAPI.remove(target_id);
      if (target_type === "post")     await postsAPI.remove(target_id);
      if (target_type === "comment")  await commentsAPI.remove(target_id);
      if (target_type === "review")   await reviewsAPI.remove(target_id);
      await flagsAPI.resolve(flag.id);
      setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, resolved: true, action: "removed" } : f));
      showToast("Content removed.");
    } catch (err) {
      showToast(err.message || "Failed to remove content");
    }
  }

  async function handleResolve(flagId, action) {
    if (action === "removed") {
      const flag = flags.find((f) => f.id === flagId);
      if (flag) return handleRemoveContent(flag);
    }
    try {
      await flagsAPI.resolve(flagId);
      setFlags((prev) => prev.map((f) => f.id === flagId ? { ...f, resolved: true, action } : f));
      showToast(action === "dismissed" ? "Flag dismissed." : "Warning noted.");
    } catch (err) {
      showToast(err.message || "Failed to resolve flag");
    }
  }

  const pending  = flags.filter((f) => !f.resolved);
  const resolved = flags.filter((f) => f.resolved);
  const displayed = activeTab === "pending" ? pending : resolved;

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Link to="/" className="text-sm font-medium text-[#8C1515] hover:underline">← Home</Link>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <svg className="h-5 w-5 text-[#8C1515]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-stone-900">Moderation dashboard</h1>
              {!loading && (
                <p className="mt-1 text-sm text-stone-500">
                  {pending.length} pending report{pending.length !== 1 ? "s" : ""} · {resolved.length} resolved
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-5">
            <button type="button" onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === "pending" ? "bg-[#8C1515] text-white" : "text-stone-600 hover:bg-stone-100"}`}>
              Pending
              {!loading && pending.length > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${activeTab === "pending" ? "bg-white/20 text-white" : "bg-red-100 text-red-700"}`}>
                  {pending.length}
                </span>
              )}
            </button>
            <button type="button" onClick={() => setActiveTab("resolved")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === "resolved" ? "bg-[#8C1515] text-white" : "text-stone-600 hover:bg-stone-100"}`}>
              Resolved {!loading && `(${resolved.length})`}
            </button>
            {isAdmin && (
              <>
                <button type="button" onClick={() => setActiveTab("users")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === "users" ? "bg-[#8C1515] text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                  Manage Users
                </button>
                <button type="button" onClick={() => setActiveTab("classes")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === "classes" ? "bg-[#8C1515] text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                  Manage Classes
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">

        {/* ── Users tab ── */}
        {activeTab === "users" && isAdmin && (
          <div>
            <p className="mb-4 text-sm text-stone-500">
              Change a user's role to promote them to moderator or admin.
            </p>
            {usersLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {users.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                    <img
                      src={u.profile_pic || `https://i.pravatar.cc/150?u=${u.id}`}
                      alt={u.name}
                      className="h-9 w-9 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-900 truncate">{u.name}</p>
                      <p className="text-xs text-stone-400 truncate">{u.email}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ROLE_COLORS[u.role] ?? "bg-stone-100 text-stone-600"}`}>
                      {u.role}
                    </span>
                    <select
                      value={u.role}
                      disabled={roleUpdating === u.id || u.id === currentUser?.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-700 focus:border-[#8C1515] focus:outline-none disabled:opacity-50"
                    >
                      <option value="student">Student</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Classes tab ── */}
        {activeTab === "classes" && isAdmin && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900 mb-1">Create a class</h2>
            <p className="text-sm text-stone-500 mb-5">
              Add a class to the catalog so students can enroll and create subchats.
            </p>
            {classMsg && (
              <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${classMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                {classMsg.text}
              </div>
            )}
            <form onSubmit={handleCreateClass} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Class ID</label>
                <input type="text" value={newClass.id} onChange={(e) => setNewClass((p) => ({ ...p, id: e.target.value }))}
                  placeholder="e.g. EDUC101" required
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Class name</label>
                <input type="text" value={newClass.name} onChange={(e) => setNewClass((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Introduction to Education" required
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Programs (comma-separated)</label>
                <input type="text" value={newClass.programs} onChange={(e) => setNewClass((p) => ({ ...p, programs: e.target.value }))}
                  placeholder="e.g. CGOE, HCP, MS"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25" />
              </div>
              <button type="submit"
                className="self-start rounded-lg bg-[#8C1515] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6f1010] transition-colors">
                Create class
              </button>
            </form>
          </div>
        )}

        {/* ── Flags tabs ── */}
        {(activeTab === "pending" || activeTab === "resolved") && loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
          </div>
        ) : (activeTab === "pending" || activeTab === "resolved") && (
          <>
            {activeTab === "pending" && (
              <div className="mb-6 grid grid-cols-3 gap-4">
                {[
                  { label: "Pending",  value: pending.length,  color: "text-red-600" },
                  { label: "Resolved", value: resolved.length, color: "text-green-600" },
                  { label: "Total",    value: flags.length,    color: "text-stone-700" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="mt-0.5 text-xs font-medium text-stone-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {displayed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
                <svg className="mx-auto mb-3 h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-sm font-medium text-stone-600">
                  {activeTab === "pending" ? "All clear — no pending reports." : "No resolved reports yet."}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {displayed.map((flag) => (
                  <li key={flag.id}
                    className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ${flag.resolved ? "opacity-60" : ""}`}>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TYPE_COLORS[flag.target_type] ?? "bg-stone-100 text-stone-700"}`}>
                          {flag.target_type}
                        </span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                          {flag.reason}
                        </span>
                        {flag.resolved && (
                          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 capitalize">
                            {flag.action ?? "Resolved"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400">
                        Reported by{" "}
                        <span className="font-medium text-stone-600">{flag.reported_by_name ?? "Unknown"}</span>
                        {" "}· {timeAgo(flag.created_at)}
                      </p>
                    </div>

                    <div className="mb-4 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                      <p className="text-xs font-semibold text-stone-500 mb-1">
                        {flag.target_type.charAt(0).toUpperCase() + flag.target_type.slice(1)} ID:
                      </p>
                      <p className="text-xs font-mono text-stone-600 break-all">{flag.target_id}</p>
                    </div>

                    {!flag.resolved && (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleResolve(flag.id, "dismissed")}
                          className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50">
                          Dismiss
                        </button>
                        <button type="button" onClick={() => handleResolve(flag.id, "removed")}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                          Remove content
                        </button>
                        <button type="button" onClick={() => handleResolve(flag.id, "warned")}
                          className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50">
                          Warn user
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
