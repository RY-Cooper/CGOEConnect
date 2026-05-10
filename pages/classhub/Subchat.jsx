import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { classesAPI, chatsAPI, postsAPI } from "../../api";
import { useAuth } from "../../context/AuthContext";
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
        <div className="mx-auto max-w-3xl px-4 py-6">
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
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 flex flex-col gap-6">
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
      </main>
    </div>
  );
}
