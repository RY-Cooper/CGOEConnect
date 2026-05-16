import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { classesAPI, postsAPI, chatsAPI } from "../../api";
import TopNav from "../../components/TopNav";

function AdminClassItem({ cls, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${cls.name}" and all its chats, reviews, and resources? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await classesAPI.remove(cls.id);
      onDelete(cls.id);
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  }

  return (
    <li className="flex items-center gap-2 rounded-lg px-2.5 py-2 group hover:bg-stone-50 transition-colors">
      <Link
        to={`/class/${encodeURIComponent(cls.id)}`}
        className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-stone-700 hover:text-[#8C1515]"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#8C1515]" />
        <span className="truncate">{cls.name.split("–")[0].trim()}</span>
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-stone-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-all"
        title="Delete class"
      >
        {deleting ? "…" : "✕"}
      </button>
    </li>
  );
}

function PostComposer({ currentUser, onPost }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { post } = await postsAPI.create({ content: text.trim() });
      onPost(post);
      setText("");
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm mb-6">
      <div className="flex gap-3">
        <img
          src={currentUser?.profilePic || `https://i.pravatar.cc/150?u=${currentUser?.id}`}
          alt={currentUser?.name}
          className="h-8 w-8 rounded-full object-cover shrink-0"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share something with the community…"
          rows={2}
          className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-[#8C1515] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8C1515]/20 transition"
        />
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="rounded-xl bg-[#8C1515] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6f1010] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PostCard({ post, currentUser, onUpvote, onSave, onFlag, onDelete, savedIds, upvotedIds, reportedIds, showComments, onToggleComments }) {
  const [comments, setComments] = useState(null);
  const [newComment, setNewComment] = useState("");

  const isUpvoted = upvotedIds.has(post.id);
  const isSaved = savedIds.has(post.id);
  const isReported = reportedIds.has(post.id);
  const upvoteCount = Number(post.upvotes) + (isUpvoted !== post.upvoted ? (isUpvoted ? 1 : -1) : 0);

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
    <article id={`post-${post.id}`} className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={post.author_pic || `https://i.pravatar.cc/150?u=${post.author_id}`}
            alt={post.author_name}
            className="h-8 w-8 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900">{post.author_name ?? "Unknown"}</p>
            <p className="text-xs text-stone-400">
              {timeAgo(post.created_at)}
              {(() => {
                const tz = post.author_timezone || (post.author_id === currentUser?.id ? currentUser?.timezone : null);
                return tz ? <span className="ml-1.5 text-stone-300">· {tz}</span> : null;
              })()}
            </p>
          </div>
          {post.class_id && (
            <Link
              to={`/class/${post.class_id}`}
              className="shrink-0 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 hover:bg-sky-200 transition-colors"
            >
              {post.class_id.toUpperCase()}
            </Link>
          )}
        </div>

        <p className="text-sm text-stone-700 leading-relaxed">{post.content}</p>

        <div className="mt-4 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => onUpvote(post.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
              isUpvoted ? "bg-[#8C1515]/10 text-[#8C1515]" : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            <svg className="h-4 w-4" fill={isUpvoted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/>
            </svg>
            {upvoteCount}
          </button>

          <button
            type="button"
            onClick={onToggleComments}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
              showComments ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
            </svg>
            {commentCount}
          </button>

          <button
            type="button"
            onClick={() => onSave(post.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
              isSaved ? "bg-amber-100 text-amber-700" : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            <svg className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            {isSaved ? "Saved" : "Save"}
          </button>

          {post.author_id === currentUser?.id ? (
            <button
              type="button"
              onClick={() => onDelete(post.id)}
              className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete
            </button>
          ) : isReported ? (
            <span className="ml-auto px-2.5 py-1.5 text-xs text-stone-400">Reported</span>
          ) : (
            <button
              type="button"
              onClick={() => onFlag(post.id)}
              className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
              </svg>
              Report
            </button>
          )}
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

export default function Feed() {
  const { selectedClassIds, setSelectedClassIds, currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [feedPosts, setFeedPosts] = useState([]);
  const [catalogClasses, setCatalogClasses] = useState([]);
  const [mySubchats, setMySubchats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upvotedIds, setUpvotedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [reportedPostIds, setReportedPostIds] = useState(new Set());
  const [openCommentIds, setOpenCommentIds] = useState(new Set());
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [toast, setToast] = useState(null);
  const CLASS_LIMIT = 5;

  function getVisitedKey(chatId) { return `cgoe-visited-${chatId}`; }
  function markVisited(chatId) {
    try { localStorage.setItem(getVisitedKey(chatId), new Date().toISOString()); } catch { /* quota */ }
  }
  function hasNewActivity(chat) {
    if (!chat.last_message_at) return false;
    try {
      const visited = localStorage.getItem(getVisitedKey(chat.id));
      if (!visited) return true;
      return new Date(chat.last_message_at) > new Date(visited);
    } catch { return false; }
  }

  useEffect(() => {
    Promise.all([postsAPI.feed(), classesAPI.list(), chatsAPI.mine().catch(() => ({ chats: [] }))])
      .then(([{ posts }, { classes }, { chats }]) => {
        setFeedPosts(posts);
        setUpvotedIds(new Set(posts.filter((p) => p.upvoted).map((p) => p.id)));
        setSavedIds(new Set(posts.filter((p) => p.saved).map((p) => p.id)));
        setCatalogClasses(classes);
        setMySubchats(chats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hubs = useMemo(() => {
    const rows = [];
    const seen = new Set();
    for (const id of selectedClassIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const cat = catalogClasses.find((c) => c.id === id);
      if (cat) rows.push({ id, name: cat.name });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedClassIds, catalogClasses]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleUpvote(postId) {
    setUpvotedIds((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
    try { await postsAPI.upvote(postId); } catch { /* ignore */ }
  }

  async function handleSave(postId) {
    const wasSaved = savedIds.has(postId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
    showToast(wasSaved ? "Post removed from saved." : "Post saved!");
    try { await postsAPI.save(postId); } catch { /* ignore */ }
  }

  async function handleDelete(postId) {
    try {
      await postsAPI.remove(postId);
      setFeedPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch { /* ignore */ }
  }

  function toggleClass(id) {
    const next = selectedClassIds.includes(id)
      ? selectedClassIds.filter((x) => x !== id)
      : [...selectedClassIds, id];
    setSelectedClassIds(next).catch(() => {});
  }

  async function handleFlag(postId) {
    setReportedPostIds((prev) => new Set([...prev, postId]));
    showToast("Post reported — moderators will review it.");
    try { await postsAPI.flag(postId, "Reported by user"); } catch { /* ignore */ }
  }

  function toggleComments(postId) {
    setOpenCommentIds((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

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

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      <main className="w-full px-4 md:px-6 lg:px-10 py-8 lg:grid lg:grid-cols-[300px_1fr_360px] lg:gap-8">

        {/* ── Col 1: Active subchats ── */}
        <aside className="mb-6 lg:mb-0">
          <div className="lg:sticky lg:top-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-700">My subchats</h2>
              <Link to="/subchats" className="text-xs font-medium text-[#8C1515] hover:underline">See all</Link>
            </div>
            {mySubchats.length === 0 ? (
              <p className="py-2 text-center text-xs text-stone-400">No subchats yet — join or create one from a class hub.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {mySubchats.slice(0, 10).map((chat) => {
                  const isNew = hasNewActivity(chat);
                  return (
                    <li key={chat.id}>
                      <Link
                        to={`/class/${encodeURIComponent(chat.class_id)}/subchat/${chat.id}`}
                        onClick={() => markVisited(chat.id)}
                        className="group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-stone-50"
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${isNew ? "bg-emerald-500" : "bg-stone-300"}`} />
                        <span className="min-w-0 flex-1 truncate font-medium text-stone-700 group-hover:text-[#8C1515]">
                          {chat.title}
                        </span>
                        {chat.is_private && (
                          <svg className="h-3 w-3 shrink-0 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                          </svg>
                        )}
                        {Boolean(chat.pending_requests) && (
                          <span className="shrink-0 rounded-full bg-[#8C1515] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                            {chat.pending_requests}
                          </span>
                        )}
                      </Link>
                      {chat.class_name && (
                        <p className="ml-7 truncate text-xs text-stone-400">{chat.class_name}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ── Col 2: Posts feed ── */}
        <div className="min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-stone-900">Home feed</h1>
            <p className="mt-1 text-sm text-stone-500">Latest posts from your community.</p>
          </div>

          <PostComposer currentUser={currentUser} onPost={(post) => setFeedPosts((prev) => [post, ...prev])} />

          {feedPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white py-14 text-center">
              <svg className="mx-auto mb-3 h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
              </svg>
              <p className="text-sm font-medium text-stone-500">No posts yet — be the first!</p>
              <p className="mt-1 text-xs text-stone-400">
                Use the box above to post, or{" "}
                <Link to="/profile-setup" className="text-[#8C1515] hover:underline">enroll in classes</Link>
                {" "}to see your classmates' posts.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {feedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onUpvote={handleUpvote}
                  onSave={handleSave}
                  onFlag={handleFlag}
                  onDelete={handleDelete}
                  savedIds={savedIds}
                  upvotedIds={upvotedIds}
                  reportedIds={reportedPostIds}
                  showComments={openCommentIds.has(post.id)}
                  onToggleComments={() => toggleComments(post.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Col 3: Classes + Reviews ── */}
        <aside className="mt-6 space-y-5 lg:mt-0">

          {/* Active classes widget */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-700">Active classes</h2>
              {isAdmin ? (
                <Link to="/admin/classes" className="text-xs font-medium text-[#8C1515] hover:underline">
                  Manage
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClassPicker((p) => !p)}
                  className="text-xs font-medium text-[#8C1515] hover:underline"
                >
                  {showClassPicker ? "Done" : "Manage"}
                </button>
              )}
            </div>

            {isAdmin ? (
              /* Admin sees all catalog classes with delete option */
              catalogClasses.length === 0 ? (
                <p className="py-3 text-center text-xs text-stone-400">No classes yet.</p>
              ) : (
                <>
                  <ul className="flex flex-col gap-1">
                    {(showAllClasses ? catalogClasses : catalogClasses.slice(0, CLASS_LIMIT)).map((cls) => (
                      <AdminClassItem
                        key={cls.id}
                        cls={cls}
                        onDelete={(id) => setCatalogClasses((prev) => prev.filter((c) => c.id !== id))}
                      />
                    ))}
                  </ul>
                  {catalogClasses.length > CLASS_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setShowAllClasses((v) => !v)}
                      className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-50 hover:text-[#8C1515] transition-colors"
                    >
                      {showAllClasses ? "Show less" : `Show ${catalogClasses.length - CLASS_LIMIT} more`}
                    </button>
                  )}
                </>
              )
            ) : (
              /* Regular users see only their enrolled classes */
              <>
                {hubs.length === 0 ? (
                  <p className="py-3 text-center text-xs text-stone-400">No classes yet.</p>
                ) : (
                  <>
                  <ul className="flex flex-col gap-1">
                    {(showAllClasses ? hubs : hubs.slice(0, CLASS_LIMIT)).map((h) => (
                      <li key={h.id}>
                        <Link
                          to={`/class/${encodeURIComponent(h.id)}`}
                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-[#8C1515] transition-colors"
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#8C1515]" />
                          <span className="truncate">{h.name.split("–")[0].trim()}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {hubs.length > CLASS_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setShowAllClasses((v) => !v)}
                      className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-50 hover:text-[#8C1515] transition-colors"
                    >
                      {showAllClasses ? "Show less" : `Show ${hubs.length - CLASS_LIMIT} more`}
                    </button>
                  )}
                  </>
                )}
                {showClassPicker && catalogClasses.length > 0 && (
                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Catalog</p>
                    <div className="flex flex-col gap-1.5">
                      {catalogClasses.map((cls) => {
                        const enrolled = selectedClassIds.includes(cls.id);
                        return (
                          <label
                            key={cls.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-stone-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={enrolled}
                              onChange={() => toggleClass(cls.id)}
                              className="h-3.5 w-3.5 accent-[#8C1515]"
                            />
                            <span className={`truncate text-xs font-medium ${enrolled ? "text-[#8C1515]" : "text-stone-700"}`}>
                              {cls.name.split("–")[0].trim()}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Class reviews quick links */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-stone-700">Class reviews</h2>
            {hubs.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-2">
                <Link to="/profile-setup" className="text-[#8C1515] hover:underline">Enroll in classes</Link> to see reviews.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {hubs.slice(0, 4).map((h) => (
                  <Link
                    key={h.id}
                    to={`/reviews/${encodeURIComponent(h.id)}`}
                    className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 text-sm text-stone-700 transition-colors hover:border-[#8C1515]/30 hover:text-[#8C1515]"
                  >
                    <span className="truncate font-medium">{h.name.split("–")[0].trim()}</span>
                    <svg className="h-3.5 w-3.5 shrink-0 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
