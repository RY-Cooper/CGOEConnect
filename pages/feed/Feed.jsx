import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { classesAPI, postsAPI, chatsAPI, feedbackAPI } from "../../api";
import { uploadImage } from "../../utils/cloudinary";
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
  const [imgPreview, setImgPreview] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError, setImgError] = useState(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);
  const fileRef = useRef(null);

  async function handleImg(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setImgError("File too large — maximum 10 MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setImgPreview(URL.createObjectURL(file));
    setImgUrl(null);
    setImgError(null);
    setImgUploading(true);
    try {
      const url = await uploadImage(file);
      setImgUrl(url);
    } catch (err) {
      setImgPreview(null);
      setImgError(err.message || "Image upload failed.");
    } finally {
      setImgUploading(false);
    }
  }

  function removeImg() {
    setImgPreview(null);
    setImgUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function togglePoll() {
    setShowPoll((v) => !v);
    setPollQ("");
    setPollOpts(["", ""]);
  }

  const canSubmit = !submitting && !imgUploading && (
    text.trim() || (imgUrl) ||
    (showPoll && pollQ.trim() && pollOpts.filter((o) => o.trim()).length >= 2)
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = {
        content: text.trim(),
        image_url: imgUrl || null,
        poll: showPoll && pollQ.trim()
          ? { question: pollQ.trim(), options: pollOpts.filter((o) => o.trim()) }
          : null,
      };
      const { post } = await postsAPI.create(payload);
      onPost(post);
      setText("");
      setImgPreview(null); setImgUrl(null);
      if (fileRef.current) fileRef.current.value = "";
      setShowPoll(false); setPollQ(""); setPollOpts(["", ""]);
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm mb-6">
      {imgError && (
        <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{imgError}</div>
      )}
      <div className="flex gap-3">
        <img
          src={currentUser?.profilePic || `https://i.pravatar.cc/150?u=${currentUser?.id}`}
          alt={currentUser?.name}
          className="h-8 w-8 rounded-full object-cover shrink-0"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={showPoll ? "Add context for your poll (optional)…" : "Share something with the community…"}
          rows={2}
          className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-[#8C1515] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8C1515]/20 transition"
        />
      </div>

      {imgPreview && (
        <div className="mt-3 relative inline-block">
          <img src={imgPreview} alt="Preview" className={`max-h-48 rounded-xl border border-stone-200 object-cover ${imgUploading ? "opacity-50" : ""}`} />
          {imgUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
            </div>
          )}
          <button type="button" onClick={removeImg}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-white shadow hover:bg-stone-900">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {showPoll && (
        <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Poll</p>
          <input
            type="text"
            value={pollQ}
            onChange={(e) => setPollQ(e.target.value)}
            placeholder="Ask a question…"
            className="mb-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/20"
          />
          <div className="flex flex-col gap-2">
            {pollOpts.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm focus:border-[#8C1515] focus:outline-none"
                />
                {pollOpts.length > 2 && (
                  <button type="button" onClick={() => setPollOpts((p) => p.filter((_, idx) => idx !== i))}
                    className="text-stone-400 hover:text-red-500 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {pollOpts.length < 6 && (
            <button type="button" onClick={() => setPollOpts((p) => [...p, ""])}
              className="mt-2 text-xs font-medium text-[#8C1515] hover:underline">
              + Add option
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} id="feed-img-upload" />
        <label htmlFor="feed-img-upload"
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${imgPreview ? "bg-sky-100 text-sky-700" : "text-stone-500 hover:bg-stone-100"}`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Image
        </label>
        <button type="button" onClick={togglePoll}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${showPoll ? "bg-violet-100 text-violet-700" : "text-stone-500 hover:bg-stone-100"}`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          Poll
        </button>
        <div className="flex-1" />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-[#8C1515] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6f1010] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}

function PostPollDisplay({ poll, postId, userId, onVote }) {
  const total = (poll.options || []).reduce((s, o) => s + Number(o.votes), 0);
  const voted = poll.voted_option_id != null;

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="mb-3 text-sm font-semibold text-stone-800">{poll.question}</p>
      <div className="flex flex-col gap-2">
        {(poll.options || []).map((opt) => {
          const pct = total > 0 ? Math.round((Number(opt.votes) / total) * 100) : 0;
          const isMyVote = poll.voted_option_id === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={voted}
              onClick={() => !voted && onVote(postId, opt.id)}
              className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-left text-sm transition-all
                ${isMyVote
                  ? "border-[#8C1515]/40 bg-[#8C1515]/5"
                  : voted
                    ? "border-stone-200 bg-white text-stone-500 cursor-default"
                    : "border-stone-200 bg-white text-stone-700 hover:border-[#8C1515]/30 hover:bg-[#8C1515]/5 cursor-pointer"
                }`}
            >
              {voted && (
                <span className="absolute inset-y-0 left-0 bg-[#8C1515]/8 transition-all" style={{ width: `${pct}%` }} />
              )}
              <span className="relative flex items-center justify-between gap-4">
                <span className={`font-medium ${isMyVote ? "text-[#8C1515]" : ""}`}>
                  {isMyVote && "✓ "}{opt.text}
                </span>
                {voted && <span className="shrink-0 text-xs text-stone-400">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-stone-400">
        {total} vote{total !== 1 ? "s" : ""}{!voted && " · click to vote"}
      </p>
    </div>
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

function PostCard({ post, currentUser, onUpvote, onSave, onFlag, onDelete, onPin, onVote, savedIds, upvotedIds, reportedIds, showComments, onToggleComments, isModOrAdmin }) {
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
    <article id={`post-${post.id}`} className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${post.pinned ? "border-[#8C1515]/30" : "border-stone-200"}`}>
      {post.pinned && (
        <div className="flex items-center gap-1.5 border-b border-[#8C1515]/10 bg-[#8C1515]/5 px-5 py-1.5">
          <svg className="h-3 w-3 text-[#8C1515]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 3a1 1 0 0 1 .707 1.707L13 8.414V15l2 2v1H9v-1l2-2V8.414L7.293 4.707A1 1 0 0 1 8 3h8z"/>
          </svg>
          <span className="text-xs font-semibold text-[#8C1515]">Pinned</span>
        </div>
      )}
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

        {post.content && (
          <p className="text-sm text-stone-700 leading-relaxed">{post.content}</p>
        )}

        {post.image_url && (
          <img
            src={post.image_url}
            alt=""
            className="mt-3 max-h-96 w-full rounded-xl object-cover border border-stone-100"
          />
        )}

        {post.poll && (
          <PostPollDisplay
            poll={post.poll}
            postId={post.id}
            userId={currentUser?.id}
            onVote={onVote}
          />
        )}

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

          {isModOrAdmin && (
            <button
              type="button"
              onClick={() => onPin(post.id)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${post.pinned ? "text-[#8C1515] hover:bg-[#8C1515]/10" : "text-stone-400 hover:bg-stone-100"}`}
              title={post.pinned ? "Unpin post" : "Pin post to top"}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 3a1 1 0 0 1 .707 1.707L13 8.414V15l2 2v1H9v-1l2-2V8.414L7.293 4.707A1 1 0 0 1 8 3h8z"/>
              </svg>
              {post.pinned ? "Unpin" : "Pin"}
            </button>
          )}
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
  const isModOrAdmin = isAdmin || currentUser?.role === "moderator";

  const [feedPosts, setFeedPosts] = useState([]);
  const [catalogClasses, setCatalogClasses] = useState([]);
  const [mySubchats, setMySubchats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upvotedIds, setUpvotedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [reportedPostIds, setReportedPostIds] = useState(new Set());
  const [openCommentIds, setOpenCommentIds] = useState(new Set());
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [toast, setToast] = useState(null);
  const CLASS_LIMIT = 5;

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("general");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

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
        setCatalogClasses([...classes].sort((a, b) => a.name.localeCompare(b.name)));
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

  const unenrolledClasses = useMemo(
    () => catalogClasses.filter((c) => !selectedClassIds.includes(c.id)),
    [catalogClasses, selectedClassIds]
  );

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

  async function handleVote(postId, optionId) {
    try {
      const { options, voted_option_id } = await postsAPI.vote(postId, optionId);
      setFeedPosts((prev) => prev.map((p) =>
        p.id === postId && p.poll
          ? { ...p, poll: { ...p.poll, options, voted_option_id } }
          : p
      ));
    } catch (err) {
      showToast(err.message || "Failed to record vote");
    }
  }

  async function handlePin(postId) {
    try {
      const { post: updated } = await postsAPI.pin(postId);
      setFeedPosts((prev) => {
        const next = prev.map((p) => p.id === postId ? { ...p, pinned: updated.pinned } : p);
        return [...next].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at));
      });
      showToast(updated.pinned ? "Post pinned to top." : "Post unpinned.");
    } catch (err) {
      showToast(err.message || "Failed to pin post");
    }
  }

  async function handleChatPin(chatId) {
    try {
      const { chat: updated } = await chatsAPI.pin(chatId);
      setMySubchats((prev) => {
        const next = prev.map((c) => c.id === chatId ? { ...c, pinned: updated.pinned } : c);
        return [...next].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at));
      });
      showToast(updated.pinned ? "Subchat pinned to top." : "Subchat unpinned.");
    } catch (err) {
      showToast(err.message || "Failed to pin subchat");
    }
  }

  function toggleComments(postId) {
    setOpenCommentIds((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  async function handleFeedbackSubmit(e) {
    e.preventDefault();
    if (!feedbackMessage.trim() || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    try {
      await feedbackAPI.submit(feedbackCategory, feedbackMessage.trim());
      setFeedbackSent(true);
      setFeedbackMessage("");
    } catch (err) {
      showToast(err.message || "Failed to send feedback");
    } finally {
      setFeedbackSubmitting(false);
    }
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

        {/* ── Col 1: Active subchats + Guidelines ── */}
        <aside className="mb-6 space-y-4 lg:mb-0">
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
                    <li key={chat.id} className="group/item">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/class/${encodeURIComponent(chat.class_id)}/subchat/${chat.id}`}
                          onClick={() => markVisited(chat.id)}
                          className="group min-w-0 flex-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-stone-50"
                        >
                          {chat.pinned ? (
                            <svg className="h-2.5 w-2.5 shrink-0 text-[#8C1515]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16 4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1H8a1 1 0 0 0-.707 1.707L9 8.414V13l-3 3v2h5v5h2v-5h5v-2l-3-3V8.414l1.707-1.707A1 1 0 0 0 16 5V4z"/>
                            </svg>
                          ) : (
                            <span className={`h-2 w-2 shrink-0 rounded-full ${isNew ? "bg-emerald-500" : "bg-stone-300"}`} />
                          )}
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
                        {isModOrAdmin && (
                          <button
                            onClick={() => handleChatPin(chat.id)}
                            title={chat.pinned ? "Unpin subchat" : "Pin subchat"}
                            className={`shrink-0 rounded p-1 opacity-0 group-hover/item:opacity-100 transition-opacity ${chat.pinned ? "text-[#8C1515]" : "text-stone-300 hover:text-[#8C1515]"}`}
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16 4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1H8a1 1 0 0 0-.707 1.707L9 8.414V13l-3 3v2h5v5h2v-5h5v-2l-3-3V8.414l1.707-1.707A1 1 0 0 0 16 5V4z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                      {chat.class_name && (
                        <p className="ml-7 truncate text-xs text-stone-400">{chat.class_name}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Community Guidelines */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-stone-700">Community Guidelines</h2>
            <ul className="flex flex-col gap-3">
              {[
                {
                  title: "Be respectful and inclusive",
                  body: "Treat classmates and staff with professionalism. Harassment, discrimination, and personal attacks are not tolerated.",
                },
                {
                  title: "Keep academics honest",
                  body: "Share intuition and resources, but do not post solutions to graded work or encourage dishonesty.",
                },
                {
                  title: "Protect privacy",
                  body: "Do not share private Zoom links, emails, or personal details without consent.",
                },
                {
                  title: "Stay on topic",
                  body: "Use class hubs for coursework discussion; move casual chat to designated yap threads.",
                },
                {
                  title: "Report concerns",
                  body: "Flag harmful content so moderators can review quickly and keep the community safe.",
                },
              ].map(({ title, body }) => (
                <li key={title} className="flex gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8C1515]" />
                  <div>
                    <p className="text-xs font-semibold text-stone-700">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-amber-800">
                <span className="font-semibold">Enforcement:</span> Admins will remove content that violates these guidelines. While rare, a consistent pattern of violations may result in the account being suspended or banned.
              </p>
            </div>
          </div>
        </aside>

        {/* ── Col 2: Posts feed ── */}
        <div className="min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-stone-900">Home feed</h1>
            <p className="mt-1 text-sm text-stone-500">Latest posts from the CGOE community about all things CGOE-related.</p>
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
                  onPin={handlePin}
                  onVote={handleVote}
                  isModOrAdmin={isModOrAdmin}
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

        {/* ── Col 3: Classes + Reviews + Feedback ── */}
        <aside className="mt-6 space-y-5 lg:mt-0">

          {/* Course roster widget */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-700">Courses</h2>
              {isModOrAdmin && (
                <Link to="/admin/classes" className="text-xs font-medium text-[#8C1515] hover:underline">
                  Manage
                </Link>
              )}
            </div>

            {(
              <>
                {/* Enrolled courses */}
                {hubs.length > 0 && (
                  <>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Enrolled</p>
                    <ul className="flex flex-col gap-0.5 mb-1">
                      {hubs.map((h) => (
                        <li key={h.id} className="group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-stone-50">
                          <Link
                            to={`/class/${encodeURIComponent(h.id)}`}
                            className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-sm font-medium text-stone-800 hover:text-[#8C1515]"
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#8C1515]" />
                            <span className="truncate">{h.name.split("–")[0].trim()}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleClass(h.id)}
                            title="Remove from my courses"
                            className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-stone-300 transition-all hover:bg-red-50 hover:text-red-400 group-hover:text-stone-400"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" d="M20 12H4"/>
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Available / unenrolled courses */}
                {unenrolledClasses.length > 0 && (
                  <div className={hubs.length > 0 ? "mt-3 border-t border-stone-100 pt-3" : ""}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                      {hubs.length > 0 ? "Add a course" : "All courses"}
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {(showAllClasses ? unenrolledClasses : unenrolledClasses.slice(0, 4)).map((cls) => (
                        <li key={cls.id} className="group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-stone-50">
                          <span className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-sm text-stone-500">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-stone-200" />
                            <span className="truncate">{cls.name.split("–")[0].trim()}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleClass(cls.id)}
                            title="Add to my courses"
                            className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-stone-300 transition-all hover:bg-emerald-50 hover:text-emerald-500 group-hover:text-stone-400"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" d="M12 4v16m8-8H4"/>
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {unenrolledClasses.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setShowAllClasses((v) => !v)}
                        className="mt-1.5 w-full rounded-lg py-1.5 text-xs font-medium text-stone-400 hover:bg-stone-50 hover:text-[#8C1515] transition-colors"
                      >
                        {showAllClasses ? "Show less" : `+${unenrolledClasses.length - 4} more`}
                      </button>
                    )}
                  </div>
                )}

                {hubs.length === 0 && unenrolledClasses.length === 0 && (
                  <p className="py-3 text-center text-xs text-stone-400">No courses available yet.</p>
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

          {/* Platform feedback */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setFeedbackOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[#8C1515] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                <span className="text-sm font-semibold text-stone-700">Share feedback</span>
              </div>
              <svg className={`h-4 w-4 text-stone-400 shrink-0 transition-transform ${feedbackOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {feedbackOpen && (
              <div className="mt-4">
                <p className="mb-4 text-xs text-stone-400">Help us improve CGOEConnect.</p>
                {feedbackSent ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-stone-700">Thanks for your feedback!</p>
                    <button
                      type="button"
                      onClick={() => setFeedbackSent(false)}
                      className="text-xs text-[#8C1515] hover:underline"
                    >
                      Send another
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="flex flex-col gap-3">
                    <div className="flex gap-1.5">
                      {[
                        { value: "bug",     label: "Bug" },
                        { value: "feature", label: "Feature request" },
                        { value: "general", label: "General" },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFeedbackCategory(value)}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            feedbackCategory === value
                              ? "bg-[#8C1515] text-white"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder={
                        feedbackCategory === "bug"
                          ? "Describe the bug and how to reproduce it…"
                          : feedbackCategory === "feature"
                          ? "What feature would you like to see?"
                          : "Any thoughts, suggestions, or comments…"
                      }
                      rows={3}
                      className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-[#8C1515] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8C1515]/20 transition"
                    />
                    <button
                      type="submit"
                      disabled={!feedbackMessage.trim() || feedbackSubmitting}
                      className="w-full rounded-xl bg-[#8C1515] py-2 text-sm font-semibold text-white hover:bg-[#6f1010] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {feedbackSubmitting ? "Sending…" : "Send feedback"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
