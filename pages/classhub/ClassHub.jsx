import { useContext, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { classesAPI } from "../../api";
import TopNav from "../../components/TopNav";
import { AuthContext } from "../../context/AuthContext";

function tagVariant(tag) {
  const t = tag?.toUpperCase?.() ?? "";
  if (t === "HW")   return "bg-sky-100 text-sky-800";
  if (t === "TEST") return "bg-amber-100 text-amber-900";
  if (t === "YAP")  return "bg-violet-100 text-violet-900";
  return "bg-stone-100 text-stone-700";
}

function ChatItem({ ch, base, label }) {
  const [open, setOpen] = useState(false);
  const created = ch.created_at
    ? new Date(ch.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const tag = ch.tags?.[0] ?? "";
  const routeSegment = ch.is_channel ? "channel" : "subchat";

  return (
    <li className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-stone-50"
      >
        <span className={`mt-0.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
          <svg className="h-5 w-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            {ch.pinned && (
              <span className="rounded-full bg-[#8C1515]/10 px-2 py-0.5 text-xs font-semibold text-[#8C1515]">Pinned</span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tagVariant(tag)}`}>
              {tag || "Chat"}
            </span>
          </span>
          <span className="mt-1 block font-medium text-stone-900">{ch.title}</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-stone-100 px-4 py-3 pl-12 bg-stone-50/80">
          <p className="text-sm text-stone-600">
            {created && <span>Started {created} · </span>}
            Open the thread to read and reply.
          </p>
          <Link
            to={`${base}/${routeSegment}/${ch.id}`}
            className="mt-3 inline-flex rounded-lg bg-[#8C1515] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6f1010]"
          >
            Open {label}
          </Link>
        </div>
      )}
    </li>
  );
}

function NewChatModal({ classId, isChannel, onCreated, onClose }) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { chat } = await classesAPI.createChat(classId, { title: title.trim(), is_channel: isChannel });
      onCreated(chat);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">
          {isChannel ? "New channel" : "New subchat"}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isChannel ? "e.g. Announcements" : "e.g. Week 3 HW help"}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="rounded-lg bg-[#8C1515] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6f1010] disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClassHub() {
  const { classId } = useParams();
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.role === "admin";

  const [hubClass, setHubClass] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // null | "channel" | "subchat"

  useEffect(() => {
    setLoading(true);
    Promise.all([
      classesAPI.get(classId),
      classesAPI.chats(classId),
    ])
      .then(([{ class: cls }, { chats: chatList }]) => {
        setHubClass(cls);
        setChats(chatList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId]);

  const { channels, subchats } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? chats.filter((ch) => ch.title.toLowerCase().includes(q)) : chats;
    const sorted = [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    return {
      channels: sorted.filter((ch) => ch.is_channel),
      subchats:  sorted.filter((ch) => !ch.is_channel),
    };
  }, [chats, query]);

  function handleCreated(chat) {
    setChats((prev) => [chat, ...prev]);
    setModal(null);
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

  if (!hubClass) {
    return (
      <div className="min-h-screen bg-stone-50 px-4 py-10">
        <TopNav />
        <p className="text-stone-600">Class not found.</p>
        <Link to="/" className="mt-4 inline-block text-[#8C1515] font-medium">Back home</Link>
      </div>
    );
  }

  const base = `/class/${encodeURIComponent(classId)}`;
  const navCls = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-[#8C1515] text-white" : "text-stone-700 hover:bg-stone-100"}`;

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link to="/" className="text-sm font-medium text-[#8C1515] hover:underline">← Home</Link>
          <h1 className="mt-4 text-2xl font-semibold text-stone-900">{hubClass.name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-stone-600 leading-relaxed">
            Offered for{" "}
            <span className="font-medium text-stone-800">
              {(hubClass.programs ?? []).join(", ")}
            </span>{" "}
            students. Use subchats for homework threads, exams, and casual yap — stay respectful and cite sources when sharing notes.
          </p>

          <nav className="mt-8 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-6" aria-label="Class hub sections">
            <NavLink to={`${base}/announcements`} className={navCls}>Announcements</NavLink>
            <NavLink to={base} end className={navCls}>Chats</NavLink>
            <NavLink to={`${base}/resources`} className={navCls}>Resources</NavLink>
            <Link to={`/reviews/${encodeURIComponent(classId)}`} className={navCls({ isActive: false })}>Reviews</Link>
            <div className="ml-auto flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setModal("channel")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#8C1515] px-3 py-2 text-sm font-semibold text-[#8C1515] hover:bg-[#8C1515]/5 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  New channel
                </button>
              )}
              <button
                type="button"
                onClick={() => setModal("subchat")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#8C1515] px-3 py-2 text-sm font-semibold text-white hover:bg-[#6f1010] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 4v16m8-8H4"/>
                </svg>
                New subchat
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <label htmlFor="hub-search" className="sr-only">Search chats</label>
          <input
            id="hub-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title…"
            className="w-full max-w-md rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
          />
        </div>

        {channels.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-stone-900 mb-3">Channels</h2>
            <ul className="flex flex-col gap-2">
              {channels.map((ch) => (
                <ChatItem key={ch.id} ch={ch} base={base} label="channel" />
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Subchats</h2>
          {subchats.length === 0 ? (
            <p className="text-sm text-stone-600">
              {query ? "No subchats match your search." : "No subchats yet — create the first one!"}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {subchats.map((ch) => (
                <ChatItem key={ch.id} ch={ch} base={base} label="subchat" />
              ))}
            </ul>
          )}
        </section>
      </main>

      {modal && (
        <NewChatModal
          classId={classId}
          isChannel={modal === "channel"}
          onCreated={handleCreated}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
