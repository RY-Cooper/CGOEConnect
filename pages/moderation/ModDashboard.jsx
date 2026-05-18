import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { flagsAPI, usersAPI, messagesAPI, postsAPI, commentsAPI, reviewsAPI, feedbackAPI } from "../../api";
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
  const isModOrAdmin = isAdmin || currentUser?.role === "moderator";

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);

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

  useEffect(() => {
    if (activeTab === "feedback" && isModOrAdmin && feedbackItems.length === 0) {
      setFeedbackLoading(true);
      feedbackAPI.list()
        .then(({ feedback }) => setFeedbackItems(feedback))
        .catch(() => {})
        .finally(() => setFeedbackLoading(false));
    }
  }, [activeTab, isModOrAdmin]);

  async function handleFeedbackStatus(id, status) {
    setStatusUpdating(id);
    try {
      await feedbackAPI.updateStatus(id, status);
      setFeedbackItems((prev) => prev.map((f) => f.id === id ? { ...f, status } : f));
    } catch (err) {
      showToast(err.message || "Failed to update status");
    } finally {
      setStatusUpdating(null);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
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

  function isSuspended(u) {
    return u.suspended_until && new Date(u.suspended_until) > new Date();
  }

  function suspendedUntilStr(u) {
    return new Date(u.suspended_until).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  function patchUser(updated) {
    setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
  }

  async function handleSuspend(userId) {
    setActionLoading(userId);
    try {
      const { user } = await usersAPI.suspend(userId);
      patchUser(user);
      showToast("User suspended for 72 hours.");
    } catch (err) {
      showToast(err.message || "Failed to suspend user");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnsuspend(userId) {
    setActionLoading(userId);
    try {
      const { user } = await usersAPI.unsuspend(userId);
      patchUser(user);
      showToast("Suspension lifted.");
    } catch (err) {
      showToast(err.message || "Failed to lift suspension");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBan(userId, userName) {
    if (!window.confirm(`Permanently ban ${userName}? They will not be able to log in or register again with the same email.`)) return;
    setActionLoading(userId);
    try {
      const { user } = await usersAPI.ban(userId);
      patchUser(user);
      showToast("User permanently banned.");
    } catch (err) {
      showToast(err.message || "Failed to ban user");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnban(userId) {
    setActionLoading(userId);
    try {
      const { user } = await usersAPI.unban(userId);
      patchUser(user);
      showToast("Ban lifted.");
    } catch (err) {
      showToast(err.message || "Failed to unban user");
    } finally {
      setActionLoading(null);
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
        <div className="mx-auto max-w-5xl px-4 py-8">
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
              <button type="button" onClick={() => setActiveTab("users")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === "users" ? "bg-[#8C1515] text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                Manage Users
              </button>
            )}
            {isModOrAdmin && (
              <button type="button" onClick={() => setActiveTab("feedback")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === "feedback" ? "bg-[#8C1515] text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                Feedback
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">

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
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const suspended = isSuspended(u);
                  const busy = actionLoading === u.id || roleUpdating === u.id;
                  return (
                    <li key={u.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm ${u.banned ? "border-red-200 bg-red-50/30" : suspended ? "border-amber-200 bg-amber-50/30" : "border-stone-200"}`}>
                      <img
                        src={u.profile_pic || `https://i.pravatar.cc/150?u=${u.id}`}
                        alt={u.name}
                        className="h-9 w-9 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-900 truncate">{u.name}</p>
                        <p className="text-xs text-stone-400 truncate">{u.email}</p>
                        {suspended && (
                          <p className="text-xs text-amber-600 mt-0.5">Suspended until {suspendedUntilStr(u)}</p>
                        )}
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ROLE_COLORS[u.role] ?? "bg-stone-100 text-stone-600"}`}>
                        {u.role}
                      </span>
                      {u.banned && (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Banned</span>
                      )}
                      {!u.banned && suspended && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Suspended</span>
                      )}
                      <select
                        value={u.role}
                        disabled={busy || isSelf || u.banned}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-700 focus:border-[#8C1515] focus:outline-none disabled:opacity-50"
                      >
                        <option value="student">Student</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      {!isSelf && (
                        <div className="flex gap-1.5">
                          {u.banned ? (
                            <button type="button" disabled={busy} onClick={() => handleUnban(u.id)}
                              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50">
                              Unban
                            </button>
                          ) : suspended ? (
                            <button type="button" disabled={busy} onClick={() => handleUnsuspend(u.id)}
                              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50">
                              Lift suspension
                            </button>
                          ) : (
                            <button type="button" disabled={busy} onClick={() => handleSuspend(u.id)}
                              className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50">
                              Suspend 72h
                            </button>
                          )}
                          {!u.banned && (
                            <button type="button" disabled={busy} onClick={() => handleBan(u.id, u.name)}
                              className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50">
                              Ban
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── Feedback tab ── */}
        {activeTab === "feedback" && isModOrAdmin && (() => {
          const STATUS_META = {
            open:        { label: "Open",        classes: "bg-stone-100 text-stone-600" },
            in_progress: { label: "In progress", classes: "bg-sky-100 text-sky-700" },
            resolved:    { label: "Resolved",    classes: "bg-emerald-100 text-emerald-700" },
            rejected:    { label: "Rejected",    classes: "bg-red-100 text-red-700" },
          };
          return (
            <div>
              <p className="mb-4 text-sm text-stone-500">
                User-submitted feedback and feature requests.
              </p>
              {feedbackLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
                </div>
              ) : feedbackItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
                  <p className="text-sm font-medium text-stone-500">No feedback submitted yet.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {feedbackItems.map((item) => {
                    const busy = statusUpdating === item.id;
                    const currentStatus = item.status ?? "open";
                    return (
                      <li key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <img
                              src={item.author_pic || `https://i.pravatar.cc/150?u=${item.user_id}`}
                              alt={item.author_name}
                              className="h-7 w-7 rounded-full object-cover shrink-0"
                            />
                            <span className="text-sm font-semibold text-stone-800">{item.author_name ?? "Unknown"}</span>
                            <span className="text-xs text-stone-400">{item.author_email}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              item.category === "bug"     ? "bg-red-100 text-red-700" :
                              item.category === "feature" ? "bg-violet-100 text-violet-700" :
                                                            "bg-stone-100 text-stone-600"
                            }`}>
                              {item.category === "bug" ? "Bug" : item.category === "feature" ? "Feature request" : "General"}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400">{timeAgo(item.created_at)}</p>
                        </div>

                        <p className="mb-4 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{item.message}</p>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-xs font-medium text-stone-400">Status:</span>
                          {Object.entries(STATUS_META).map(([value, { label, classes }]) => (
                            <button
                              key={value}
                              type="button"
                              disabled={busy}
                              onClick={() => currentStatus !== value && handleFeedbackStatus(item.id, value)}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                currentStatus === value
                                  ? classes
                                  : "bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })()}

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

                    {flag.target_content && (
                      <div className="mb-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                        <p className="text-xs font-semibold text-stone-500 mb-1">Reported content:</p>
                        <p className="text-sm text-stone-700 line-clamp-3">{flag.target_content}</p>
                        {flag.target_chat_id && (
                          <Link
                            to={flag.target_class_id
                              ? `/class/${encodeURIComponent(flag.target_class_id)}/subchat/${flag.target_chat_id}`
                              : `/introductions`}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#8C1515] hover:underline"
                          >
                            View in chat
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
                            </svg>
                          </Link>
                        )}
                      </div>
                    )}
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
