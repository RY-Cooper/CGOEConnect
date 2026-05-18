import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { classesAPI, reviewsAPI } from "../../api";
import TopNav from "../../components/TopNav";

function StarRating({ value, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered ?? value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={!readOnly ? () => onChange(star) : undefined}
          onMouseEnter={!readOnly ? () => setHovered(star) : undefined}
          onMouseLeave={!readOnly ? () => setHovered(null) : undefined}
          className={readOnly ? "cursor-default" : "cursor-pointer"}
          tabIndex={readOnly ? -1 : 0}
          aria-label={readOnly ? undefined : `Rate ${star} star${star !== 1 ? "s" : ""}`}
        >
          <svg
            className={`h-5 w-5 transition-colors ${star <= display ? "text-amber-400" : "text-stone-200"}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ClassReviews() {
  const { classId } = useParams();
  const { currentUser } = useAuth();

  const [classInfo, setClassInfo] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formContent, setFormContent] = useState("");
  const [formCgoe, setFormCgoe] = useState(false);
  const [formAnonymous, setFormAnonymous] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState(new Set());
  const [helpfulMap, setHelpfulMap] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([
      classesAPI.get(classId),
      classesAPI.reviews(classId),
    ])
      .then(([{ class: cls }, { reviews: rv }]) => {
        setClassInfo(cls);
        setReviews(rv);
        const initialHelpful = {};
        for (const r of rv) {
          initialHelpful[r.id] = { count: Number(r.helpful_votes), marked: r.marked_helpful };
        }
        setHelpfulMap(initialHelpful);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId]);

  const displayed = activeTab === "cgoe"
    ? reviews.filter((r) => r.cgoe_specific)
    : reviews;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function submitReview(e) {
    e.preventDefault();
    if (formRating === 0 || !formContent.trim()) return;
    try {
      const { review } = await classesAPI.createReview(classId, {
        rating: formRating,
        content: formContent.trim(),
        cgoe_specific: formCgoe,
        anonymous: formAnonymous,
      });
      setReviews((prev) => [review, ...prev]);
      setHelpfulMap((prev) => ({ ...prev, [review.id]: { count: 0, marked: false } }));
      setFormRating(0);
      setFormContent("");
      setFormCgoe(false);
      setFormAnonymous(false);
      setShowForm(false);
      showToast("Review submitted!");
    } catch (err) {
      showToast(err.message || "Failed to submit review");
    }
  }

  async function handleFlag(reviewId) {
    setFlaggedIds((prev) => new Set([...prev, reviewId]));
    showToast("Review reported — moderators will review it.");
    try { await reviewsAPI.flag(reviewId, "Reported by user"); } catch { /* ignore */ }
  }

  async function handleHelpful(reviewId) {
    const current = helpfulMap[reviewId] ?? { count: 0, marked: false };
    const next = { count: current.marked ? current.count - 1 : current.count + 1, marked: !current.marked };
    setHelpfulMap((prev) => ({ ...prev, [reviewId]: next }));
    try { await reviewsAPI.helpful(reviewId); } catch { /* ignore */ }
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

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Link to="/" className="text-sm font-medium text-[#8C1515] hover:underline">← Home</Link>
          <h1 className="mt-4 text-2xl font-semibold text-stone-900">
            {classInfo?.name ?? classId}
          </h1>

          {avgRating ? (
            <div className="mt-3 flex items-center gap-3">
              <StarRating value={Math.round(Number(avgRating))} readOnly />
              <span className="text-base font-semibold text-stone-800">{avgRating}</span>
              <span className="text-sm text-stone-400">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-400">No reviews yet.</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-5">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "all" ? "bg-[#8C1515] text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              All reviews
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cgoe")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "cgoe" ? "bg-[#8C1515] text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              CGOE-specific
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                activeTab === "cgoe" ? "bg-white/20 text-white" : "bg-violet-100 text-violet-800"
              }`}>
                {reviews.filter((r) => r.cgoe_specific).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowForm((p) => !p)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#8C1515] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6f1010]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M12 4v16m8-8H4"/>
              </svg>
              Write a review
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {showForm && (
          <form onSubmit={submitReview} className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-stone-900">Your review</h2>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Overall rating</label>
              <StarRating value={formRating} onChange={setFormRating} />
              {formRating === 0 && <p className="mt-1 text-xs text-stone-400">Click to rate</p>}
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Written review</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
                placeholder="Share your experience with this class…"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              />
            </div>

            <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={formCgoe}
                onChange={(e) => setFormCgoe(e.target.checked)}
                className="h-4 w-4 accent-[#8C1515]"
              />
              This review includes a CGOE-specific perspective
            </label>

            <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={formAnonymous}
                onChange={(e) => setFormAnonymous(e.target.checked)}
                className="h-4 w-4 accent-[#8C1515]"
              />
              Post anonymously
              {!formAnonymous && currentUser && (
                <span className="flex items-center gap-1.5 ml-1">
                  <img
                    src={currentUser.profilePic}
                    alt={currentUser.displayName}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  <span className="text-stone-400 text-xs">Visible as {currentUser.displayName}</span>
                </span>
              )}
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formRating === 0 || !formContent.trim()}
                className="rounded-lg bg-[#8C1515] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6f1010] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit review
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <svg className="mx-auto mb-3 h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            <p className="text-sm font-medium text-stone-600">
              No {activeTab === "cgoe" ? "CGOE-specific " : ""}reviews yet
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm font-medium text-[#8C1515] hover:underline"
            >
              Be the first to review
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {displayed.map((review) => {
              const isFlagged = flaggedIds.has(review.id) || review.flagged;
              const helpful = helpfulMap[review.id] ?? { count: Number(review.helpful_votes), marked: review.marked_helpful };

              return (
                <li
                  key={review.id}
                  className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-opacity ${isFlagged ? "opacity-40" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {review.anonymous ? (
                        <div className="h-9 w-9 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                          <svg className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                          </svg>
                        </div>
                      ) : (
                        <img
                          src={review.author_pic || `https://i.pravatar.cc/150?u=${review.author_id}`}
                          alt={review.author_name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{review.author_name ?? "Anonymous"}</p>
                        <p className="text-xs text-stone-400">
                          {new Date(review.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.cgoe_specific && (
                        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">CGOE</span>
                      )}
                      <StarRating value={review.rating} readOnly />
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-stone-700">{review.content}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => !isFlagged && handleHelpful(review.id)}
                      disabled={isFlagged}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        helpful.marked ? "bg-[#8C1515]/10 text-[#8C1515]" : "text-stone-500 hover:bg-stone-100"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" fill={helpful.marked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                      </svg>
                      Helpful ({helpful.count})
                    </button>

                    {isFlagged ? (
                      <span className="text-xs text-stone-400">Reported</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleFlag(review.id)}
                        className="flex items-center gap-1 text-xs font-medium text-stone-400 transition-colors hover:text-red-500"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
                        </svg>
                        Report
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
