import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationsAPI } from "../api";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notifLink(n) {
  const meta = n.meta ?? {};
  switch (n.type) {
    case "post_upvote":
    case "comment":
      if (meta.chat_id && meta.class_id) return `/class/${meta.class_id}/subchat/${meta.chat_id}`;
      return "/";
    case "review_helpful":
      return meta.class_id ? `/reviews/${encodeURIComponent(meta.class_id)}` : "/";
    case "message_helpful":
      if (meta.class_id && meta.chat_id) return `/class/${meta.class_id}/subchat/${meta.chat_id}`;
      return "/chat/general";
    case "join_request":
      return "/my-subchats";
    case "join_accepted":
    case "join_denied":
      if (meta.class_id && meta.chat_id) return `/class/${meta.class_id}/subchat/${meta.chat_id}`;
      return "/my-subchats";
    default:
      return "/";
  }
}

function notifText(n) {
  const actor = n.actor_name ?? "Someone";
  const meta = n.meta ?? {};
  switch (n.type) {
    case "post_upvote":     return `${actor} found your post helpful`;
    case "comment":         return `${actor} replied to your post`;
    case "review_helpful":  return `${actor} found your review helpful`;
    case "message_helpful": return `${actor} found your message helpful`;
    case "join_request":    return `${actor} requested to join "${meta.chat_title ?? "your subchat"}"`;
    case "join_accepted":   return `Your request to join "${meta.chat_title}" was accepted`;
    case "join_denied":     return `Your request to join "${meta.chat_title}" was declined`;
    default:                return "New notification";
  }
}

function notifIcon(type) {
  switch (type) {
    case "post_upvote":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
        </svg>
      );
    case "comment":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
        </svg>
      );
    case "review_helpful":
    case "message_helpful":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
        </svg>
      );
    case "join_request":
    case "join_accepted":
    case "join_denied":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
      );
  }
}

export default function TopNav() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  // Fetch unread count on mount
  useEffect(() => {
    if (!currentUser) return;
    notificationsAPI.list()
      .then(({ unread: u }) => setUnread(u))
      .catch(() => {});
  }, [currentUser]);

  const openNotifPanel = useCallback(async () => {
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const { notifications: ns, unread: u } = await notificationsAPI.list();
      setNotifications(ns);
      setUnread(u);
    } catch { /* ignore */ } finally {
      setNotifLoading(false);
    }
  }, []);

  async function markAllRead() {
    try {
      await notificationsAPI.readAll();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  }

  async function handleNotifClick(n) {
    if (!n.read) {
      notificationsAPI.read(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      setUnread((u) => Math.max(0, u - 1));
    }
    setNotifOpen(false);
    navigate(notifLink(n));
  }

  // Close menus on outside click
  useEffect(() => {
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
      <div className="flex w-full items-center justify-between px-4 md:px-6 lg:px-10 py-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-semibold text-stone-900 hover:text-[#8C1515] transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C1515]">
            <span className="text-sm font-black text-white tracking-tight">C</span>
          </div>
          <span className="hidden sm:block">CGOEConnect</span>
        </Link>

        {/* Center links */}
        <nav className="flex items-center gap-1">
          <Link
            to="/chat/general"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
            </svg>
            #introductions
          </Link>
          <Link
            to="/saved"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            Saved
          </Link>
          {(currentUser?.role === "moderator" || currentUser?.role === "admin") && (
            <Link
              to="/mod"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              Mod
            </Link>
          )}
          <Link
            to="/my-subchats"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
            </svg>
            My Subchats
          </Link>
          <Link
            to="/chat/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#8C1515] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6f1010] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 4v16m8-8H4"/>
            </svg>
            <span className="hidden sm:block">New subchat</span>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {/* Notifications bell */}
          {currentUser && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => notifOpen ? setNotifOpen(false) : openNotifPanel()}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 shadow-sm hover:bg-stone-50 transition-colors"
                aria-label="Notifications"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8C1515] px-1 text-[10px] font-bold text-white leading-none">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-80 rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-stone-900">Notifications</h3>
                    {unread > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-xs font-medium text-[#8C1515] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {notifLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <svg className="mx-auto mb-2 h-8 w-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                        </svg>
                        <p className="text-sm text-stone-400">No notifications yet</p>
                      </div>
                    ) : (
                      <ul>
                        {notifications.map((n) => (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={() => handleNotifClick(n)}
                              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 ${
                                !n.read ? "bg-[#8C1515]/5" : ""
                              }`}
                            >
                              {/* Actor avatar or icon */}
                              <div className="relative shrink-0 mt-0.5">
                                {n.actor_pic ? (
                                  <img
                                    src={n.actor_pic}
                                    alt={n.actor_name}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center">
                                    <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                                    </svg>
                                  </div>
                                )}
                                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 text-stone-500">
                                  {notifIcon(n.type)}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className={`text-sm leading-snug ${!n.read ? "font-medium text-stone-900" : "text-stone-700"}`}>
                                  {notifText(n)}
                                </p>
                                <p className="mt-0.5 text-xs text-stone-400">{timeAgo(n.created_at)}</p>
                              </div>

                              {!n.read && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#8C1515]" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((p) => !p)}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-medium text-stone-700 shadow-sm hover:border-stone-300 hover:bg-stone-50 transition-colors"
            >
              <img
                src={currentUser?.profilePic}
                alt={currentUser?.name}
                className="h-7 w-7 rounded-full object-cover"
              />
              <span className="hidden sm:block max-w-[120px] truncate">
                {currentUser?.name?.split(" ")[0]}
              </span>
              <svg
                className={`h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl border border-stone-200 bg-white py-2 shadow-xl">
                {/* User info */}
                <div className="flex items-center gap-3 border-b border-stone-100 px-4 pb-3 pt-1">
                  <img
                    src={currentUser?.profilePic}
                    alt={currentUser?.name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900">{currentUser?.name}</p>
                    <p className="truncate text-xs text-stone-500">{currentUser?.program}</p>
                    {currentUser?.timezone && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-stone-400">
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10"/>
                          <path strokeLinecap="round" d="M12 6v6l4 2"/>
                        </svg>
                        {currentUser.timezone.replace(/_/g, " ").split("/").pop()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile-setup"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    Profile
                  </Link>
                  <Link
                    to="/chat/general"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors sm:hidden"
                  >
                    <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                    </svg>
                    #introductions
                  </Link>
                  <Link
                    to="/saved"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors sm:hidden"
                  >
                    <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                    </svg>
                    Saved posts
                  </Link>
                  <Link
                    to="/my-subchats"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
                    </svg>
                    My Subchats
                  </Link>
                </div>

                {(currentUser?.role === "moderator" || currentUser?.role === "admin") && (
                  <Link
                    to="/mod"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    Moderation
                  </Link>
                )}
                <div className="border-t border-stone-100 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
