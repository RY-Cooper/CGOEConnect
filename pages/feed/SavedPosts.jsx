import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { postsAPI, usersAPI } from "../../api";
import TopNav from "../../components/TopNav";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SavedPostCard({ post, currentUser, onUnsave }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(null);

  useEffect(() => {
    if (showComments && comments === null) {
      postsAPI.comments(post.id)
        .then(({ comments: cs }) => setComments(cs))
        .catch(() => setComments([]));
    }
  }, [showComments, post.id, comments]);

  const commentCount = comments?.length ?? Number(post.comment_count ?? 0);

  return (
    <article className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-stone-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/>
            </svg>
            {Number(post.upvotes)}
          </div>

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

          <button
            type="button"
            onClick={() => onUnsave(post.id)}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-amber-700 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            Unsave
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
            <p className="text-xs text-stone-400">No replies yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2.5">
                  <img
                    src={c.author_pic || `https://i.pravatar.cc/150?u=${c.author_id}`}
                    alt={c.author_name}
                    className="h-6 w-6 shrink-0 rounded-full object-cover mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold text-stone-700">
                      {c.author_name ?? "Unknown"}{" "}
                      <span className="font-normal text-stone-400">{timeAgo(c.created_at)}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-stone-600">{c.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export default function SavedPosts() {
  const { currentUser } = useAuth();
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    usersAPI.savedPosts(currentUser.id)
      .then(({ posts }) => setSavedPosts(posts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  async function handleUnsave(postId) {
    setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
    setToast("Post removed from saved.");
    setTimeout(() => setToast(null), 3000);
    try { await postsAPI.save(postId); } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-sm font-medium text-[#8C1515] hover:underline">← Home</Link>
          <h1 className="mt-4 text-2xl font-semibold text-stone-900">Saved posts</h1>
          {!loading && (
            <p className="mt-1 text-sm text-stone-500">
              {savedPosts.length} saved post{savedPosts.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <svg className="mx-auto mb-3 h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            <p className="text-sm font-medium text-stone-600">No saved posts yet</p>
            <p className="mt-1 text-xs text-stone-400">Save posts from the feed to find them here.</p>
            <Link to="/" className="mt-4 inline-block text-sm font-medium text-[#8C1515] hover:underline">
              Browse the feed
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {savedPosts.map((post) => (
              <SavedPostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onUnsave={handleUnsave}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
