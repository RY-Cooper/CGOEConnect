import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { classesAPI, chatsAPI, postsAPI, usersAPI } from "../../api";
import { useAuth } from "../../context/AuthContext";

function PrivateAccessGate({ chat, currentUserId, onRequestSent }) {
  const [status, setStatus] = useState(chat.request_status ?? null);
  const [loading, setLoading] = useState(false);

  async function handleRequest() {
    setLoading(true);
    try {
      await chatsAPI.joinRequest(chat.id);
      setStatus("pending");
      onRequestSent?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
        <svg className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-stone-900">Private subchat</h2>
      <p className="mt-2 max-w-xs text-sm text-stone-500">
        This subchat is private. The creator must approve your request before you can read or post.
      </p>
      <div className="mt-6">
        {status === "pending" ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-5 py-3 text-sm font-medium text-stone-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Request pending — waiting for approval
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRequest}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8C1515] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6f1010] disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 4v16m8-8H4"/>
            </svg>
            {loading ? "Sending request…" : "Request to join"}
          </button>
        )}
      </div>
    </div>
  );
}
import ChatThread from "../chat/ChatThread";
import TopNav from "../../components/TopNav";

function tagStyle(tag) {
  switch ((tag ?? "").toUpperCase()) {
    case "HW":       return "bg-sky-100 text-sky-800 border-sky-200";
    case "TEST":     return "bg-amber-100 text-amber-900 border-amber-200";
    case "YAP":      return "bg-violet-100 text-violet-900 border-violet-200";
    case "PROJECT":  return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "STUDY":    return "bg-teal-100 text-teal-800 border-teal-200";
    case "QUESTION": return "bg-orange-100 text-orange-800 border-orange-200";
    case "RESOURCE": return "bg-indigo-100 text-indigo-800 border-indigo-200";
    default:         return "bg-stone-100 text-stone-700 border-stone-200";
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SubchatPostCard({ post, currentUser, initialOpen }) {
  const [showComments, setShowComments] = useState(initialOpen);
  const [comments, setComments] = useState(null);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (showComments && comments === null) {
      postsAPI.comments(post.id)
        .then(({ comments: cs }) => setComments(cs))
        .catch(() => setComments([]));
    }
  }, [showComments, post.id, comments]);

  async function submitComment(e) {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    try {
      const { comment } = await postsAPI.comment(post.id, newComment.trim());
      setComments((prev) => [...(prev ?? []), comment]);
      setNewComment("");
    } catch { /* ignore */ }
  }

  const commentCount = comments?.length ?? Number(post.comment_count ?? 0);

  return (
    <article id={`post-${post.id}`} className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden scroll-mt-24">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={post.author_pic || `https://i.pravatar.cc/150?u=${post.author_id}`}
            alt={post.author_name}
            className="h-8 w-8 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900">{post.author_name ?? "Unknown"}</p>
            <p className="text-xs text-stone-400">{timeAgo(post.created_at)}</p>
          </div>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">Post</span>
        </div>

        <p className="text-sm text-stone-700 leading-relaxed">{post.content}</p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowComments((p) => !p)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
              showComments ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
            </svg>
            {commentCount} {commentCount === 1 ? "reply" : "replies"}
          </button>
        </div>
      </div>

      {showComments && (
        <div className="border-t border-stone-100 bg-stone-50/60 px-5 py-4">
          {comments === null ? (
            <div className="flex justify-center py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-stone-400 mb-3">No replies yet.</p>
          ) : (
            <ul className="flex flex-col gap-3 mb-3">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2.5">
                  <img
                    src={c.author_pic || `https://i.pravatar.cc/150?u=${c.author_id}`}
                    alt={c.author_name}
                    className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold text-stone-700">
                      {c.author_name ?? "Unknown"}{" "}
                      <span className="font-normal text-stone-400">{timeAgo(c.created_at)}</span>
                    </p>
                    <p className="text-sm text-stone-600 mt-0.5">{c.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={submitComment} className="flex gap-2">
            <img
              src={currentUser?.profilePic}
              alt={currentUser?.name}
              className="h-6 w-6 rounded-full object-cover shrink-0 mt-1"
            />
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a reply…"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-900 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="shrink-0 rounded-lg bg-[#8C1515] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6f1010] transition-colors disabled:opacity-50"
            >
              Reply
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

function MemberPanel({ chatId, isPrivate }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState(null);
  const [requests, setRequests] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [adding, setAdding] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  const load = useCallback(async () => {
    try {
      const [{ members: m }, { requests: r }] = await Promise.all([
        chatsAPI.members(chatId),
        chatsAPI.joinRequests(chatId),
      ]);
      setMembers(m);
      setRequests(r);
    } catch { setMembers([]); setRequests([]); }
  }, [chatId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function handleSearch(e) {
    const q = e.target.value;
    setSearchQ(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    try {
      const { users } = await usersAPI.search(q.trim());
      setSearchResults(users ?? []);
    } catch { setSearchResults([]); }
  }

  async function handleAdd(userId) {
    setAdding(userId);
    try {
      await chatsAPI.addMember(chatId, userId);
      showToast("Member added.");
      setSearchQ(""); setSearchResults([]);
      await load();
    } catch (err) { showToast(err.message || "Failed to add member"); }
    finally { setAdding(null); }
  }

  async function handleRemove(userId) {
    try {
      await chatsAPI.removeMember(chatId, userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      showToast("Member removed.");
    } catch (err) { showToast(err.message || "Failed to remove member"); }
  }

  async function handleRespond(requestId, action) {
    try {
      await chatsAPI.respondRequest(chatId, requestId, action);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (action === "accept") { await load(); }
      showToast(action === "accept" ? "Request approved." : "Request denied.");
    } catch (err) { showToast(err.message || "Failed to respond"); }
  }

  const pendingCount = requests?.length ?? 0;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 transition-colors"
      >
        <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
        Manage members
        {pendingCount > 0 && (
          <span className="rounded-full bg-[#8C1515] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
            {pendingCount}
          </span>
        )}
        <svg className={`h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      {open && (
        <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-5">

          {/* Pending requests */}
          {pendingCount > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Join requests ({pendingCount})
              </p>
              <ul className="flex flex-col gap-2">
                {requests.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
                    <img src={r.user_pic || `https://i.pravatar.cc/150?u=${r.user_id}`} alt={r.user_name} className="h-7 w-7 rounded-full object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-800 truncate">{r.user_name}</p>
                      <p className="text-xs text-stone-400">{r.user_program}</p>
                    </div>
                    <button type="button" onClick={() => handleRespond(r.id, "accept")}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                      Approve
                    </button>
                    <button type="button" onClick={() => handleRespond(r.id, "deny")}
                      className="rounded-lg border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100">
                      Deny
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Add member search */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Add member</p>
            <input
              type="search"
              value={searchQ}
              onChange={handleSearch}
              placeholder="Search by name…"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
            />
            {searchResults.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {searchResults.slice(0, 5).map((u) => (
                  <li key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50">
                    <img src={u.profile_pic || `https://i.pravatar.cc/150?u=${u.id}`} alt={u.name} className="h-6 w-6 rounded-full object-cover shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{u.name}</span>
                    <button type="button" onClick={() => handleAdd(u.id)} disabled={adding === u.id}
                      className="shrink-0 rounded-lg bg-[#8C1515] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#6f1010] disabled:opacity-50">
                      {adding === u.id ? "…" : "Add"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Current members / participants */}
          {members !== null && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {isPrivate ? `Members (${members.length})` : `Recent participants (${members.length})`}
                </p>
                {!isPrivate && (
                  <span className="text-xs text-stone-400">· Remove blocks future posting</span>
                )}
              </div>
              {members.length === 0 && (
                <p className="text-xs text-stone-400">No one has posted here yet.</p>
              )}
              <ul className="flex flex-col gap-2">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
                    <img src={m.profile_pic || `https://i.pravatar.cc/150?u=${m.id}`} alt={m.name} className="h-7 w-7 rounded-full object-cover shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">{m.name}</span>
                    <button type="button" onClick={() => handleRemove(m.id)}
                      className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Subchat() {
  const { classId, chatId } = useParams();
  const { currentUser } = useAuth();
  const { hash } = useLocation();

  const [hubClass, setHubClass] = useState(null);
  const [chat, setChat] = useState(null);
  const [subchatPosts, setSubchatPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      classesAPI.get(classId),
      chatsAPI.get(chatId),
      postsAPI.feed(),
    ])
      .then(([{ class: cls }, { chat: chatData }, { posts }]) => {
        setHubClass(cls);
        setChat(chatData);
        setSubchatPosts(posts.filter((p) => p.chat_id === chatId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId, chatId]);

  useEffect(() => {
    if (!hash) return;
    const targetId = hash.replace("#", "");
    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [hash, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <TopNav />
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
        </div>
      </div>
    );
  }

  const base = `/class/${classId}`;

  if (!hubClass || !chat) {
    return (
      <div className="min-h-screen bg-stone-50 px-4 py-10">
        <TopNav />
        <p className="text-stone-600">Subchat not found.</p>
        <Link to={base} className="mt-4 inline-block text-[#8C1515] font-medium">Back to class hub</Link>
      </div>
    );
  }

  const tag = chat.tags?.[0] ?? "";
  const created = chat.created_at
    ? new Date(chat.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <TopNav />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Link to={base} className="text-sm font-medium text-[#8C1515] hover:underline">
            ← {hubClass.name}
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-stone-900">{chat.title}</h1>
                {tag && (
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tagStyle(tag)}`}>
                    {tag}
                  </span>
                )}
                {chat.pinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#8C1515]/10 px-2.5 py-0.5 text-xs font-semibold text-[#8C1515]">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                    </svg>
                    Pinned
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                {chat.created_by_name && (
                  <span className="flex items-center gap-1.5">
                    {chat.created_by_pic && (
                      <img src={chat.created_by_pic} alt={chat.created_by_name} className="h-4 w-4 rounded-full object-cover" />
                    )}
                    Started by {chat.created_by_name}
                  </span>
                )}
                {created && <span>{created}</span>}
                {chat.is_private && (
                  <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                    Private
                  </span>
                )}
              </div>
              {chat.created_by === currentUser?.id && (
                <MemberPanel chatId={chatId} isPrivate={chat.is_private} />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 flex flex-col gap-6">
        {chat.is_private && !chat.is_member && chat.created_by !== currentUser?.id ? (
          <PrivateAccessGate chat={chat} currentUserId={currentUser?.id} />
        ) : (
          <>
            {subchatPosts.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                  </svg>
                  Posts &amp; replies
                </h2>
                <div className="flex flex-col gap-4">
                  {subchatPosts.map((post) => (
                    <SubchatPostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      initialOpen={hash === `#post-${post.id}`}
                    />
                  ))}
                </div>
                <div className="mt-6 border-t border-stone-200" />
              </section>
            )}
            <ChatThread chatId={chatId} chatObj={chat} />
          </>
        )}
      </main>
    </div>
  );
}
