import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { classesAPI } from "../../api";
import TopNav from "../../components/TopNav";

const TAG_OPTIONS = ["General", "HW", "Test", "Yap", "Project", "Study", "Question", "Resource"];

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

export default function NewChat() {
  const { currentUser, selectedClassIds } = useAuth();
  const navigate = useNavigate();

  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [tag, setTag] = useState("General");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedClassIds.length) return;
    classesAPI.list()
      .then(({ classes }) => {
        const enrolled = classes.filter((c) => selectedClassIds.includes(c.id));
        setEnrolledClasses(enrolled);
        if (enrolled.length && !classId) setClassId(enrolled[0].id);
      })
      .catch(() => {});
  }, [selectedClassIds]);

  const canSubmit = title.trim().length > 0 && classId;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const { chat } = await classesAPI.createChat(classId, {
        title: title.trim(),
        tags: [tag],
        description: description.trim() || undefined,
        is_private: isPrivate,
      });
      navigate(`/class/${encodeURIComponent(classId)}/subchat/${chat.id}`, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to create chat");
      setLoading(false);
    }
  }

  const selectedClass = enrolledClasses.find((c) => c.id === classId);

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Link to="/" className="text-sm font-medium text-[#8C1515] hover:underline">
            ← Home
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-stone-900">Create a subchat</h1>
          <p className="mt-1 text-sm text-stone-500">
            Start a focused thread for your class — homework help, study groups, or open discussion.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Class */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <label className="block text-sm font-semibold text-stone-800 mb-3">
              Which class is this for?
              <span className="ml-1 text-red-600">*</span>
            </label>
            {enrolledClasses.length === 0 ? (
              <p className="text-sm text-stone-500">
                Enroll in at least one class from your{" "}
                <Link to="/profile" className="text-[#8C1515] hover:underline font-medium">profile</Link>{" "}
                to create a subchat.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {enrolledClasses.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setClassId(cls.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-all
                      ${classId === cls.id
                        ? "border-[#8C1515] bg-[#8C1515]/5 font-medium text-[#8C1515] ring-1 ring-[#8C1515]/20"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                  >
                    {cls.name}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Title + tag */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <label htmlFor="chat-title" className="block text-sm font-semibold text-stone-800 mb-2">
                Chat title <span className="text-red-600">*</span>
              </label>
              <input
                id="chat-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="e.g. HW2 Q4 — gradient descent convergence"
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/20 transition"
              />
              <p className="mt-1.5 text-xs text-stone-400">{title.length}/80 characters</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">Tag</label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all
                      ${tag === t
                        ? `${tagStyle(t)} ring-1 ring-offset-1 ring-current`
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="chat-desc" className="block text-sm font-semibold text-stone-800 mb-2">
                Description <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="chat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What's this chat about? Give classmates context so they know if it's relevant to them."
                className="w-full resize-none rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/20 transition"
              />
            </div>
          </section>

          {/* Privacy */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <label className="block text-sm font-semibold text-stone-800 mb-3">Privacy</label>
            <div className="flex rounded-xl border border-stone-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  !isPrivate ? "bg-[#8C1515] text-white" : "bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-l border-stone-200 ${
                  isPrivate ? "bg-[#8C1515] text-white" : "bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                Private
              </button>
            </div>
            <p className="mt-2 text-xs text-stone-400">
              {isPrivate
                ? "Only people you approve can read and post in this subchat."
                : "Anyone enrolled in the class can read and post in this subchat."}
            </p>
          </section>

          {/* Rules reminder */}
          <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span>
              All subchats must comply with the{" "}
              <Link to="/guidelines" className="font-semibold underline">community guidelines</Link>.
            </span>
          </div>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8C1515] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#6f1010] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M12 4v16m8-8H4"/>
              </svg>
              {loading ? "Creating…" : "Create subchat"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
