import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { classesAPI, chatsAPI } from "../../api";
import TopNav from "../../components/TopNav";

function NewChatModal({ classId, onCreated, onClose }) {
  const [title, setTitle] = useState("");
  const [isChannel, setIsChannel] = useState(true);
  const [saving, setSaving] = useState(false);

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
        <h3 className="text-lg font-semibold text-stone-900 mb-4">New class chat</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. General announcements"
              autoFocus
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is-channel"
              checked={isChannel}
              onChange={(e) => setIsChannel(e.target.checked)}
              className="h-4 w-4 accent-[#8C1515]"
            />
            <label htmlFor="is-channel" className="text-sm text-stone-700">
              Admin channel <span className="text-stone-400">(vs. student subchat)</span>
            </label>
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

function ClassRow({ cls, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [chats, setChats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingClass, setDeletingClass] = useState(false);

  async function handleDeleteClass(e) {
    e.stopPropagation();
    if (!confirm(`Delete "${cls.name}" and all its chats, reviews, and resources? This cannot be undone.`)) return;
    setDeletingClass(true);
    try {
      await classesAPI.remove(cls.id);
      onDelete(cls.id);
    } catch (err) {
      alert(err.message);
      setDeletingClass(false);
    }
  }

  async function loadChats() {
    if (chats !== null) return;
    setLoading(true);
    try {
      const { chats: list } = await classesAPI.chats(cls.id);
      setChats(list);
    } catch {
      setChats([]);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    if (!expanded) loadChats();
    setExpanded((v) => !v);
  }

  async function handleDeleteChat(chatId) {
    if (!confirm("Delete this chat? All messages inside will also be deleted.")) return;
    setDeleting(chatId);
    try {
      await chatsAPI.remove(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  }

  const channels = (chats ?? []).filter((c) => c.is_channel);
  const subchats  = (chats ?? []).filter((c) => !c.is_channel);

  return (
    <li className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <span className={`shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden>
          <svg className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-stone-900">{cls.name}</span>
          <span className="text-xs text-stone-400">{cls.id} · {(cls.programs ?? []).join(", ") || "No programs"}</span>
        </span>
        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Link
            to={`/class/${encodeURIComponent(cls.id)}`}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            View hub
          </Link>
          <button
            type="button"
            onClick={handleDeleteClass}
            disabled={deletingClass}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deletingClass ? "Deleting…" : "Delete"}
          </button>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-stone-100 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Chats</p>
            <button
              type="button"
              onClick={() => setModal(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#8C1515] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6f1010] transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M12 4v16m8-8H4"/>
              </svg>
              New chat
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
            </div>
          ) : chats?.length === 0 ? (
            <p className="py-3 text-center text-xs text-stone-400">No chats yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {channels.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-stone-500">Channels</p>
                  <ul className="flex flex-col gap-1.5">
                    {channels.map((chat) => (
                      <ChatRowItem
                        key={chat.id}
                        chat={chat}
                        classId={cls.id}
                        deleting={deleting === chat.id}
                        onDelete={() => handleDeleteChat(chat.id)}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {subchats.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-stone-500">Subchats</p>
                  <ul className="flex flex-col gap-1.5">
                    {subchats.map((chat) => (
                      <ChatRowItem
                        key={chat.id}
                        chat={chat}
                        classId={cls.id}
                        deleting={deleting === chat.id}
                        onDelete={() => handleDeleteChat(chat.id)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {modal && (
        <NewChatModal
          classId={cls.id}
          onCreated={(chat) => {
            setChats((prev) => [chat, ...(prev ?? [])]);
            setModal(false);
          }}
          onClose={() => setModal(false)}
        />
      )}
    </li>
  );
}

function ChatRowItem({ chat, classId, deleting, onDelete }) {
  const routeSegment = chat.is_channel ? "channel" : "subchat";
  return (
    <li className="flex items-center gap-3 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${chat.is_channel ? "bg-[#8C1515]" : "bg-stone-400"}`} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{chat.title}</span>
      <Link
        to={`/class/${encodeURIComponent(classId)}/${routeSegment}/${chat.id}`}
        className="shrink-0 text-xs font-medium text-[#8C1515] hover:underline"
      >
        Open
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
      >
        {deleting ? "…" : "Delete"}
      </button>
    </li>
  );
}

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClass, setNewClass] = useState({ id: "", name: "", programs: "" });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    classesAPI.list()
      .then(({ classes: all }) => setClasses(all))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    try {
      const programs = newClass.programs
        ? newClass.programs.split(",").map((p) => p.trim()).filter(Boolean)
        : [];
      const { class: cls } = await classesAPI.create({ id: newClass.id.trim(), name: newClass.name.trim(), programs });
      setClasses((prev) => [...prev, cls]);
      setMsg({ ok: true, text: `"${cls.name}" created!` });
      setNewClass({ id: "", name: "", programs: "" });
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Failed to create class" });
    } finally {
      setCreating(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link to="/" className="text-sm font-medium text-[#8C1515] hover:underline">← Home</Link>
          <h1 className="mt-4 text-2xl font-semibold text-stone-900">Manage classes</h1>
          <p className="mt-1 text-sm text-stone-500">
            Create classes, add class chats, and remove chats. Only admins can see this page.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">

        {/* Create new class */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-stone-900 mb-4">Create a new class</h2>
          {msg && (
            <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm font-medium ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {msg.text}
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Class ID</label>
              <input
                type="text" required
                value={newClass.id}
                onChange={(e) => setNewClass((p) => ({ ...p, id: e.target.value }))}
                placeholder="e.g. EDUC101"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Class name</label>
              <input
                type="text" required
                value={newClass.name}
                onChange={(e) => setNewClass((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Introduction to Education"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">Programs <span className="text-stone-400">(comma-separated)</span></label>
              <input
                type="text"
                value={newClass.programs}
                onChange={(e) => setNewClass((p) => ({ ...p, programs: e.target.value }))}
                placeholder="e.g. CGOE, HCP, MS"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating || !newClass.id.trim() || !newClass.name.trim()}
                className="rounded-lg bg-[#8C1515] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6f1010] disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating…" : "Create class"}
              </button>
            </div>
          </form>
        </section>

        {/* All classes */}
        <section>
          <h2 className="text-base font-semibold text-stone-900 mb-4">
            All classes <span className="text-stone-400 font-normal">({classes.length})</span>
          </h2>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
            </div>
          ) : classes.length === 0 ? (
            <p className="text-sm text-stone-500">No classes yet. Create one above.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {classes.map((cls) => (
                <ClassRow
                  key={cls.id}
                  cls={cls}
                  onDelete={(id) => setClasses((prev) => prev.filter((c) => c.id !== id))}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
