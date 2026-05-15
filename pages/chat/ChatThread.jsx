import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../context/AuthContext";
import { chatsAPI, messagesAPI } from "../../api";
import { uploadImage } from "../../utils/cloudinary";


// ── Constants ───────────────────────────────────────────────────────────────

const TAG_OPTIONS = ["General", "HW", "Test", "Yap", "Project", "Study", "Question", "Resource"];

const EMOJI_PALETTE = [
  "👍","❤️","😂","😮","😢","🙏","💯","🔥","😅","🤔","🎉","💡","✅","🤝","👀","💪",
];

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

function getTzAbbr(tz) {
  if (!tz) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? null;
  } catch {
    return null;
  }
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d) / 60000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const hr = Math.floor(diffMin / 60);
  if (hr < 24) return `${hr}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── EmojiPickerPopover ──────────────────────────────────────────────────────

const EMOJI_TOP  = EMOJI_PALETTE.slice(0, 5);
const EMOJI_MORE = EMOJI_PALETTE.slice(5);

function EmojiPickerPopover({ onPick, onClose }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-9 left-0 z-30 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl"
    >
      <div className="flex items-center gap-0.5">
        {EMOJI_TOP.map((em) => (
          <button key={em} type="button" onClick={() => onPick(em)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-xl hover:bg-stone-100 transition-colors">
            {em}
          </button>
        ))}
        <button type="button" onClick={() => setExpanded((p) => !p)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
            expanded ? "bg-stone-100 text-stone-700" : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          }`}
          title={expanded ? "Show less" : "More reactions"}>
          {expanded ? "↑" : "···"}
        </button>
      </div>
      {expanded && (
        <div className="mt-1.5 border-t border-stone-100 pt-1.5">
          <div className="grid grid-cols-6 gap-0.5">
            {EMOJI_MORE.map((em) => (
              <button key={em} type="button" onClick={() => onPick(em)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-xl hover:bg-stone-100 transition-colors">
                {em}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PollDisplay ─────────────────────────────────────────────────────────────

function PollDisplay({ poll, messageId, userId, onVote }) {
  const total = poll.options.reduce((s, o) => s + Number(o.votes), 0);
  const myVote = poll.votedBy?.[userId];
  const voted = myVote !== undefined;

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="mb-3 text-sm font-semibold text-stone-800">{poll.question}</p>
      <div className="flex flex-col gap-2">
        {poll.options.map((opt) => {
          const pct = total > 0 ? Math.round((Number(opt.votes) / total) * 100) : 0;
          const isMyVote = myVote === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={voted}
              onClick={() => !voted && onVote(messageId, opt.id)}
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

// ── SchedulerDisplay ────────────────────────────────────────────────────────

function SchedulerDisplay({ scheduler, messageId, currentUserId, onAttend }) {
  const isAttending = (scheduler.attendees || []).includes(currentUserId);
  const dateStr = scheduler.date
    ? new Date(scheduler.date + "T12:00:00").toLocaleDateString(undefined, {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    : null;
  const timeStr = scheduler.time
    ? new Date(`1970-01-01T${scheduler.time}`).toLocaleTimeString(undefined, {
        hour: "numeric", minute: "2-digit",
      })
    : null;

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8C1515]/10">
          <svg className="h-5 w-5 text-[#8C1515]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-stone-900 text-sm">{scheduler.title}</p>
          {dateStr && <p className="mt-0.5 text-xs text-stone-600">{dateStr}</p>}
          {timeStr && <p className="text-xs text-stone-600">{timeStr}</p>}
          {scheduler.location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {scheduler.location}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAttend(messageId)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            isAttending
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              : "bg-[#8C1515] text-white hover:bg-[#6f1010]"
          }`}
        >
          {isAttending ? "Attending ✓" : "RSVP"}
        </button>
        {scheduler.attendees?.length > 0 && (
          <span className="text-xs text-stone-400">
            {scheduler.attendees.length} going
          </span>
        )}
      </div>
    </div>
  );
}

// ── MessageCard ─────────────────────────────────────────────────────────────

function MessageCard({
  msg, currentUser, showEmoji, onToggleEmoji, onAddEmoji,
  onToggleHelpful, onSave, onFlag, onVote, onAttend, isFlagged,
  replies, onAddReply, isChatModerator, onDelete,
}) {
  const isHelpful = msg.markedHelpfulBy?.includes(currentUser?.id);
  const isSaved = Boolean(msg.saved);
  const authorTz = msg.author_timezone || (msg.author_id === currentUser?.id ? currentUser?.timezone : null);
  const tzAbbr = getTzAbbr(authorTz);
  const [showReplies, setShowReplies] = useState(false);
  const [newReply, setNewReply] = useState("");

  function submitReply(e) {
    e.preventDefault();
    if (!newReply.trim() || !currentUser) return;
    onAddReply({
      id: `r-${Date.now()}`,
      authorId: currentUser.id,
      content: newReply.trim(),
      createdAt: new Date().toISOString(),
    });
    setNewReply("");
  }

  return (
    <article className="rounded-2xl border border-stone-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-5">
        {/* Author row */}
        <div className="flex items-start gap-3">
          <img
            src={msg.author_pic || `https://i.pravatar.cc/150?u=${msg.author_id}`}
            alt={msg.author_name}
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-stone-100"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-stone-900">{msg.author_name ?? "Unknown"}</span>
              {msg.author_role === "admin" && (
                <span className="rounded-full bg-[#8C1515] px-2.5 py-0.5 text-xs font-bold tracking-wide text-white uppercase">
                  ADMIN
                </span>
              )}
              {msg.tag && (
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tagStyle(msg.tag)}`}>
                  {msg.tag}
                </span>
              )}
              {isFlagged && (
                <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Flagged
                </span>
              )}
              <span className="ml-auto text-xs text-stone-400">
                {fmtTime(msg.created_at)}
                {tzAbbr && <span className="ml-1.5 text-stone-300">· {tzAbbr}</span>}
              </span>
            </div>

            {msg.content && (
              <p className="mt-2 text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">{msg.content}</p>
            )}

            {msg.image_url && (
              <img
                src={msg.image_url}
                alt="Attachment"
                className="mt-3 max-h-72 w-full rounded-xl border border-stone-100 object-cover"
              />
            )}

            {msg.poll && (
              <PollDisplay
                poll={msg.poll}
                messageId={msg.id}
                userId={currentUser?.id}
                onVote={onVote}
              />
            )}

            {msg.scheduler && (
              <SchedulerDisplay
                scheduler={msg.scheduler}
                messageId={msg.id}
                currentUserId={currentUser?.id}
                onAttend={onAttend}
              />
            )}

            {msg.reactions?.filter((r) => r.userIds?.length > 0).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {msg.reactions
                  .filter((r) => r.userIds?.length > 0)
                  .map((r) => (
                    <button
                      key={r.emoji}
                      type="button"
                      onClick={() => onAddEmoji(msg.id, r.emoji)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors
                        ${r.userIds.includes(currentUser?.id)
                          ? "border-[#8C1515]/30 bg-[#8C1515]/8 font-medium"
                          : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-stone-100"
                        }`}
                    >
                      {r.emoji}
                      <span className="text-xs text-stone-500">{r.userIds.length}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* Action bar */}
            <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-stone-100 pt-3">
              <button
                type="button"
                onClick={() => onToggleHelpful(msg.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors
                  ${isHelpful ? "bg-emerald-100 text-emerald-800" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}
              >
                <svg className="h-3.5 w-3.5" fill={isHelpful ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Helpful{msg.helpful > 0 ? ` · ${msg.helpful}` : ""}
              </button>

              <button
                type="button"
                onClick={() => setShowReplies((p) => !p)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors
                  ${showReplies ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                </svg>
                {replies.length > 0 ? `${replies.length} ${replies.length === 1 ? "reply" : "replies"}` : "Reply"}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => onToggleEmoji(msg.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  React
                </button>
                {showEmoji && (
                  <EmojiPickerPopover
                    onPick={(em) => onAddEmoji(msg.id, em)}
                    onClose={() => onToggleEmoji(null)}
                  />
                )}
              </div>

              {(isChatModerator || msg.author_id === currentUser?.id) && (
                <button
                  type="button"
                  onClick={() => onDelete(msg.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  Delete
                </button>
              )}

              <button
                type="button"
                onClick={() => onSave(msg.id)}
                className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors
                  ${isSaved ? "text-amber-700 bg-amber-50" : "text-stone-400 hover:text-amber-600 hover:bg-amber-50"}`}
              >
                <svg className="h-3.5 w-3.5" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
                {isSaved ? "Saved" : "Save"}
              </button>

              <button
                type="button"
                onClick={() => onFlag(msg.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors
                  ${isFlagged ? "text-red-600 bg-red-50" : "text-stone-400 hover:text-red-500 hover:bg-red-50"}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z"/>
                </svg>
                {isFlagged ? "Flagged" : "Flag"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Replies panel */}
      {showReplies && (
        <div className="border-t border-stone-100 bg-stone-50/60 px-5 py-4">
          {replies.length === 0 ? (
            <p className="mb-3 text-xs text-stone-400">No replies yet — be the first!</p>
          ) : (
            <ul className="mb-3 flex flex-col gap-3">
              {replies.map((r) => (
                <li key={r.id} className="flex gap-2.5">
                  <img
                    src={currentUser?.profilePic || `https://i.pravatar.cc/150?u=${r.authorId}`}
                    alt="Reply author"
                    className="h-6 w-6 shrink-0 rounded-full object-cover mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold text-stone-700">
                      {currentUser?.name ?? "You"}{" "}
                      <span className="font-normal text-stone-400">{fmtTime(r.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-stone-600">{r.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={submitReply} className="flex items-center gap-2">
            <img
              src={currentUser?.profilePic}
              alt={currentUser?.name}
              className="h-6 w-6 shrink-0 rounded-full object-cover"
            />
            <input
              type="text"
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Write a reply…"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-900 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
            />
            <button
              type="submit"
              disabled={!newReply.trim()}
              className="shrink-0 rounded-lg bg-[#8C1515] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#6f1010] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reply
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

// ── Composer ────────────────────────────────────────────────────────────────

function Composer({ onSubmit, currentUser, simple = false }) {
  const [text, setText] = useState("");
  const [tag, setTag] = useState("General");
  const [imgPreview, setImgPreview] = useState(null);
  const [imgUrl, setImgUrl]         = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError, setImgError]     = useState(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);
  const [showSched, setShowSched] = useState(false);
  const [sched, setSched] = useState({ title: "", date: "", time: "", location: "" });
  const fileRef = useRef(null);

  async function handleImg(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgPreview(URL.createObjectURL(file));
    setImgUrl(null);
    setImgError(null);
    setImgUploading(true);
    try {
      const url = await uploadImage(file);
      setImgUrl(url);
    } catch (err) {
      setImgPreview(null);
      setImgError(err.message || "Image upload failed — check your connection and try again.");
    } finally {
      setImgUploading(false);
    }
  }

  function removeImg() {
    setImgPreview(null);
    setImgUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function addPollOpt() {
    if (pollOpts.length < 6) setPollOpts((p) => [...p, ""]);
  }

  function removePollOpt(i) {
    if (pollOpts.length <= 2) return;
    setPollOpts((p) => p.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const hasContent =
      text.trim() || (imgUrl && !imgUploading) ||
      (showPoll && pollQ.trim() && pollOpts.some((o) => o.trim())) ||
      (showSched && sched.title.trim());
    if (!hasContent || imgUploading) return;

    onSubmit({
      text: text.trim(),
      tag,
      imageUrl: imgUrl || null,
      poll: showPoll && pollQ.trim()
        ? {
            question: pollQ.trim(),
            options: pollOpts.filter((o) => o.trim()).map((o) => o.trim()),
          }
        : null,
      scheduler: showSched && sched.title.trim() ? { ...sched } : null,
    });

    setText("");
    setTag("General");
    setImgPreview(null);
    setImgUrl(null);
    if (fileRef.current) fileRef.current.value = "";
    setShowPoll(false);
    setPollQ("");
    setPollOpts(["", ""]);
    setShowSched(false);
    setSched({ title: "", date: "", time: "", location: "" });
  }

  const canSubmit =
    !imgUploading && (
      text.trim() || imgUrl ||
      (showPoll && pollQ.trim() && pollOpts.some((o) => o.trim())) ||
      (showSched && sched.title.trim())
    );

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      {imgError && (
        <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {imgError}
        </div>
      )}
      {!simple && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors
                ${tag === t ? `${tagStyle(t)} ring-1 ring-offset-1 ring-current` : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <img
          src={currentUser?.profilePic}
          alt={currentUser?.name}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a post or ask a question…"
          rows={3}
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
          <button
            type="button"
            onClick={removeImg}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-white shadow hover:bg-stone-900"
          >
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
                  onChange={(e) => {
                    const next = [...pollOpts];
                    next[i] = e.target.value;
                    setPollOpts(next);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm focus:border-[#8C1515] focus:outline-none"
                />
                {pollOpts.length > 2 && (
                  <button type="button" onClick={() => removePollOpt(i)} className="text-stone-400 hover:text-red-500 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {pollOpts.length < 6 && (
            <button type="button" onClick={addPollOpt} className="mt-2 text-xs font-medium text-[#8C1515] hover:underline">
              + Add option
            </button>
          )}
        </div>
      )}

      {showSched && (
        <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Event / Session</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={sched.title}
              onChange={(e) => setSched((s) => ({ ...s, title: e.target.value }))}
              placeholder="Event title"
              className="sm:col-span-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none"
            />
            <input
              type="date"
              value={sched.date}
              onChange={(e) => setSched((s) => ({ ...s, date: e.target.value }))}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none"
            />
            <input
              type="time"
              value={sched.time}
              onChange={(e) => setSched((s) => ({ ...s, time: e.target.value }))}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none"
            />
            <input
              type="text"
              value={sched.location}
              onChange={(e) => setSched((s) => ({ ...s, location: e.target.value }))}
              placeholder="Location (room, Zoom, etc.)"
              className="sm:col-span-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} className="hidden" id="img-attach" />
        <label
          htmlFor="img-attach"
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors
            ${imgPreview ? "bg-[#8C1515]/10 text-[#8C1515]" : "text-stone-500 hover:bg-stone-100"}`}
          title="Attach image"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path strokeLinecap="round" d="M21 15l-5-5L5 21"/>
          </svg>
          Image
        </label>

        {!simple && (
        <button
          type="button"
          onClick={() => { setShowPoll((p) => !p); setShowSched(false); }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors
            ${showPoll ? "bg-[#8C1515]/10 text-[#8C1515]" : "text-stone-500 hover:bg-stone-100"}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          Poll
        </button>
        )}

        {!simple && (
        <button
          type="button"
          onClick={() => { setShowSched((p) => !p); setShowPoll(false); }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors
            ${showSched ? "bg-[#8C1515]/10 text-[#8C1515]" : "text-stone-500 hover:bg-stone-100"}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          Schedule
        </button>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#8C1515] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6f1010] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          Post
        </button>
      </div>
    </form>
  );
}

// ── ChatThread (exported) ────────────────────────────────────────────────────

export default function ChatThread({ chatId, chatObj, simple = false }) {
  const { currentUser } = useAuth();

  const [chat, setChat]   = useState(chatObj ?? null);
  const [msgList, setMsgList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chatObj) { setChat(chatObj); return; }
    if (!chatId) return;
    chatsAPI.get(chatId).then(({ chat: c }) => setChat(c)).catch(() => {});
  }, [chatId, chatObj]);

  const isChatModerator = Boolean(
    currentUser?.id && chat?.moderator_id && currentUser.id === chat.moderator_id
  );
  const [sortBy, setSortBy] = useState("new");
  const [emojiTarget, setEmojiTarget] = useState(null);
  const [flaggedIds, setFlaggedIds] = useState(new Set());

  const [replyMap, setReplyMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cgoe-msg-replies") || "{}");
    } catch {
      return {};
    }
  });

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const { messages } = await chatsAPI.messages(chatId);
      setMsgList(messages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const addMsgReply = useCallback((msgId, reply) => {
    setReplyMap((prev) => {
      const updated = { ...prev, [msgId]: [...(prev[msgId] ?? []), reply] };
      try { localStorage.setItem("cgoe-msg-replies", JSON.stringify(updated)); } catch { /* quota */ }
      return updated;
    });
  }, []);

  const sorted = useMemo(() => {
    const list = [...msgList];
    if (sortBy === "helpful") {
      list.sort((a, b) => (b.helpful ?? 0) - (a.helpful ?? 0));
    } else {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    return list;
  }, [msgList, sortBy]);

  const toggleHelpful = useCallback(async (id) => {
    const uid = currentUser?.id;
    if (!uid) return;
    setMsgList((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const marked = m.markedHelpfulBy?.includes(uid);
        return {
          ...m,
          helpful: marked ? (m.helpful ?? 0) - 1 : (m.helpful ?? 0) + 1,
          markedHelpfulBy: marked
            ? m.markedHelpfulBy.filter((x) => x !== uid)
            : [...(m.markedHelpfulBy ?? []), uid],
        };
      })
    );
    try { await messagesAPI.helpful(id); } catch { /* ignore */ }
  }, [currentUser]);

  const addEmoji = useCallback(async (msgId, emoji) => {
    const uid = currentUser?.id;
    if (!uid) return;
    let shouldReact = true;
    setMsgList((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const existing = m.reactions?.find((r) => r.emoji === emoji);
        let next;
        if (existing) {
          const already = existing.userIds.includes(uid);
          shouldReact = !already;
          next = m.reactions
            .map((r) =>
              r.emoji !== emoji ? r : { ...r, userIds: already ? r.userIds.filter((x) => x !== uid) : [...r.userIds, uid] }
            )
            .filter((r) => r.userIds.length > 0);
        } else {
          next = [...(m.reactions ?? []), { emoji, userIds: [uid] }];
        }
        return { ...m, reactions: next };
      })
    );
    setEmojiTarget(null);
    try {
      if (shouldReact) {
        await messagesAPI.react(msgId, emoji);
      } else {
        await messagesAPI.unreact(msgId, emoji);
      }
    } catch { /* ignore */ }
  }, [currentUser]);

  const toggleEmoji = useCallback((id) => {
    setEmojiTarget((prev) => (prev === id ? null : id));
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await messagesAPI.remove(id);
      setMsgList((prev) => prev.filter((m) => m.id !== id));
    } catch { /* ignore */ }
  }, []);

  const toggleSave = useCallback(async (id) => {
    setMsgList((prev) =>
      prev.map((m) => m.id !== id ? m : { ...m, saved: !m.saved })
    );
    try { await messagesAPI.save(id); } catch { /* ignore */ }
  }, []);

  const toggleFlag = useCallback((id) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      const wasFlagged = next.has(id);
      wasFlagged ? next.delete(id) : next.add(id);
      if (!wasFlagged) {
        messagesAPI.flag(id, "Reported by user").catch(() => {});
      }
      return next;
    });
  }, []);

  const voteOnPoll = useCallback(async (msgId, optionId) => {
    const uid = currentUser?.id;
    if (!uid) return;
    setMsgList((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.poll) return m;
        if (m.poll.votedBy?.[uid] !== undefined) return m;
        const newOptions = m.poll.options.map((o) =>
          o.id === optionId ? { ...o, votes: Number(o.votes) + 1 } : o
        );
        return {
          ...m,
          poll: {
            ...m.poll,
            options: newOptions,
            votedBy: { ...(m.poll.votedBy ?? {}), [uid]: optionId },
          },
        };
      })
    );
    try { await messagesAPI.vote(msgId, optionId); } catch { /* ignore */ }
  }, [currentUser]);

  const handleAttend = useCallback(async (msgId) => {
    const uid = currentUser?.id;
    if (!uid) return;
    setMsgList((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.scheduler) return m;
        const attending = (m.scheduler.attendees || []).includes(uid);
        return {
          ...m,
          scheduler: {
            ...m.scheduler,
            attendees: attending
              ? m.scheduler.attendees.filter((a) => a !== uid)
              : [...(m.scheduler.attendees || []), uid],
          },
        };
      })
    );
    try { await messagesAPI.attend(msgId); } catch { /* ignore */ }
  }, [currentUser]);

  async function handleNewPost({ text, imageUrl, poll, scheduler }) {
    if (!currentUser || !text.trim()) return;
    try {
      await chatsAPI.postMessage(chatId, {
        content: text,
        imageUrl: imageUrl || null,
        poll: poll ? { question: poll.question, options: poll.options } : null,
        scheduler: scheduler || null,
      });
      await fetchMessages();
      if (sortBy === "new") {
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
      }
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
      </div>
    );
  }

  const emptyState = sorted.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {!emptyState && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-400">{sorted.length} post{sorted.length !== 1 ? "s" : ""}</p>
          <div className="flex rounded-lg border border-stone-200 bg-white overflow-hidden text-xs font-medium shadow-sm">
            {["new", "helpful"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSortBy(opt)}
                className={`px-3 py-1.5 capitalize transition-colors
                  ${sortBy === opt ? "bg-[#8C1515] text-white" : "text-stone-600 hover:bg-stone-50"}`}
              >
                {opt === "new" ? "Newest" : "Most helpful"}
              </button>
            ))}
          </div>
        </div>
      )}

      {emptyState ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white py-14 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p className="text-sm font-medium text-stone-500">No posts yet — be the first!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              currentUser={currentUser}
              showEmoji={emojiTarget === msg.id}
              onToggleEmoji={toggleEmoji}
              onAddEmoji={addEmoji}
              onToggleHelpful={toggleHelpful}
              onSave={toggleSave}
              onFlag={toggleFlag}
              onVote={voteOnPoll}
              onAttend={handleAttend}
              isFlagged={flaggedIds.has(msg.id) || msg.flagged}
              replies={replyMap[msg.id] ?? []}
              onAddReply={(reply) => addMsgReply(msg.id, reply)}
              isChatModerator={isChatModerator}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <div className="mt-2">
        <Composer onSubmit={handleNewPost} currentUser={currentUser} simple={simple} />
      </div>
    </div>
  );
}
