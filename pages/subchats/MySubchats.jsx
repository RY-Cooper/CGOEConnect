import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { chatsAPI, usersAPI } from "../../api";
import TopNav from "../../components/TopNav";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── MemberRow ────────────────────────────────────────────────────────────────

function MemberRow({ member, chatId, isCreator, onRemoved }) {
  const [removing, setRemoving] = useState(false);
  async function handleRemove() {
    if (!confirm(`Remove ${member.name} from this subchat?`)) return;
    setRemoving(true);
    try {
      await chatsAPI.removeMember(chatId, member.id);
      onRemoved(member.id);
    } catch (err) { alert(err.message); } finally { setRemoving(false); }
  }
  return (
    <li className="flex items-center gap-3 py-2">
      <img src={member.profile_pic || `https://i.pravatar.cc/150?u=${member.id}`} alt={member.name} className="h-7 w-7 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-800 truncate">{member.name}</p>
        {member.program && <p className="text-xs text-stone-400 truncate">{member.program}</p>}
      </div>
      {isCreator && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Remove
        </button>
      )}
    </li>
  );
}

// ── AddMemberPanel ────────────────────────────────────────────────────────────

function AddMemberPanel({ chatId, existingIds, onAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { users } = await usersAPI.search(query.trim());
        setResults(users.filter((u) => !existingIds.has(u.id)));
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, existingIds]);

  async function handleAdd(user) {
    setAdding(user.id);
    try {
      const { member } = await chatsAPI.addMember(chatId, user.id);
      onAdded(member ?? user);
      setQuery("");
      setResults([]);
    } catch (err) { alert(err.message); } finally { setAdding(null); }
  }

  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Add member</p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name…"
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/20"
      />
      {results.length > 0 && (
        <ul className="mt-1.5 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white shadow-sm overflow-hidden">
          {results.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-3 py-2">
              <img src={u.profile_pic || `https://i.pravatar.cc/150?u=${u.id}`} alt={u.name} className="h-6 w-6 rounded-full object-cover" />
              <span className="min-w-0 flex-1 text-sm text-stone-800 truncate">{u.name}</span>
              <button
                type="button"
                onClick={() => handleAdd(u)}
                disabled={adding === u.id}
                className="shrink-0 rounded-lg bg-[#8C1515] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#6f1010] disabled:opacity-50"
              >
                {adding === u.id ? "Adding…" : "Add"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── SubchatManageCard ────────────────────────────────────────────────────────

function SubchatManageCard({ chat, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadMembers() {
    if (members !== null) return;
    setLoadingMembers(true);
    try {
      const { members: m } = await chatsAPI.members(chat.id);
      setMembers(m);
    } catch { setMembers([]); } finally { setLoadingMembers(false); }
  }

  function handleToggle() {
    if (!expanded) loadMembers();
    setExpanded((p) => !p);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${chat.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await chatsAPI.remove(chat.id);
      onDeleted(chat.id);
    } catch (err) { alert(err.message); setDeleting(false); }
  }

  const memberIds = new Set((members ?? []).map((m) => m.id));

  return (
    <article className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-stone-900">{chat.title}</h3>
              {chat.is_private ? (
                <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  Private
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Open</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-stone-400">
              {chat.class_name && <span>{chat.class_name} · </span>}
              {Number(chat.member_count ?? 0)} member{Number(chat.member_count ?? 0) !== 1 ? "s" : ""}
              {Number(chat.pending_requests) > 0 && (
                <span className="ml-2 font-medium text-amber-600">
                  · {chat.pending_requests} pending request{Number(chat.pending_requests) !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={chat.class_id ? `/class/${chat.class_id}/subchat/${chat.id}` : `/subchat/${chat.id}`}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={handleToggle}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                expanded ? "bg-stone-100 text-stone-900" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {expanded ? "Close" : "Manage"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 bg-stone-50/60 px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Members</p>
          {loadingMembers ? (
            <div className="flex justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {(members ?? []).map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  chatId={chat.id}
                  isCreator
                  onRemoved={(uid) => setMembers((prev) => prev.filter((x) => x.id !== uid))}
                />
              ))}
              {members?.length === 0 && (
                <li className="py-2 text-xs text-stone-400">No members yet.</li>
              )}
            </ul>
          )}
          <AddMemberPanel
            chatId={chat.id}
            existingIds={memberIds}
            onAdded={(member) => setMembers((prev) => [...(prev ?? []), member])}
          />
        </div>
      )}
    </article>
  );
}

// ── JoinRequestCard ──────────────────────────────────────────────────────────

function JoinRequestCard({ request, chatId, chatTitle, onResolved }) {
  const [loading, setLoading] = useState(null);

  async function handle(action) {
    setLoading(action);
    try {
      await chatsAPI.respondRequest(chatId, request.id, action);
      onResolved(request.id, action);
    } catch (err) { alert(err.message); } finally { setLoading(null); }
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <img
        src={request.user_pic || `https://i.pravatar.cc/150?u=${request.user_id}`}
        alt={request.user_name}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-900">{request.user_name}</p>
        <p className="text-xs text-stone-400">
          Wants to join <span className="font-medium text-stone-600">{chatTitle}</span> · {timeAgo(request.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => handle("accept")}
          disabled={loading !== null}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {loading === "accept" ? "…" : "Accept"}
        </button>
        <button
          type="button"
          onClick={() => handle("deny")}
          disabled={loading !== null}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition-colors"
        >
          {loading === "deny" ? "…" : "Deny"}
        </button>
      </div>
    </li>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MySubchats() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState("subchats");
  const [chats, setChats] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ chats: myChats }, { requests: myOutgoing }] = await Promise.all([
        chatsAPI.mine(),
        chatsAPI.myJoinRequests().catch(() => ({ requests: [] })),
      ]);
      setChats(myChats);
      setOutgoingRequests(myOutgoing);

      const privateChats = myChats.filter((c) => c.created_by === currentUser?.id && c.is_private && Number(c.pending_requests) > 0);
      const allIncoming = await Promise.all(
        privateChats.map(async (c) => {
          try {
            const { requests: reqs } = await chatsAPI.joinRequests(c.id);
            return reqs.map((r) => ({ ...r, chatId: c.id, chatTitle: c.title }));
          } catch { return []; }
        })
      );
      setIncomingRequests(allIncoming.flat());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [currentUser?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleResolved(requestId, action) {
    setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (action === "accept") {
      setChats((prev) =>
        prev.map((c) => {
          const req = incomingRequests.find((r) => r.id === requestId);
          if (!req || c.id !== req.chatId) return c;
          return {
            ...c,
            member_count: Number(c.member_count) + 1,
            pending_requests: Math.max(0, Number(c.pending_requests) - 1),
          };
        })
      );
    }
  }

  const totalPending = incomingRequests.length + outgoingRequests.length;

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link to="/" className="text-sm font-medium text-[#8C1515] hover:underline">← Home</Link>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold text-stone-900">My Subchats</h1>
            <Link
              to="/chat/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#8C1515] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6f1010] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M12 4v16m8-8H4"/>
              </svg>
              New subchat
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setTab("subchats")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "subchats" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            My Subchats{chats.length > 0 && ` · ${chats.length}`}
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={`relative flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "requests" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Join Requests
            {totalPending > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8C1515] px-1.5 text-xs font-bold text-white">
                {totalPending}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
          </div>
        ) : tab === "subchats" ? (
          chats.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
              <svg className="mx-auto mb-3 h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
              </svg>
              <p className="text-sm font-medium text-stone-600">You haven't created any subchats yet</p>
              <Link to="/chat/new" className="mt-4 inline-block text-sm font-medium text-[#8C1515] hover:underline">
                Create your first subchat
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {chats.map((chat) => (
                <SubchatManageCard
                  key={chat.id}
                  chat={chat}
                  onDeleted={(id) => setChats((prev) => prev.filter((c) => c.id !== id))}
                />
              ))}
            </div>
          )
        ) : incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <svg className="mx-auto mb-3 h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-sm font-medium text-stone-600">No pending join requests</p>
            <p className="mt-1 text-xs text-stone-400">Requests to join your private subchats will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {incomingRequests.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Incoming — requests to join your subchats
                </h2>
                <ul className="flex flex-col gap-3">
                  {incomingRequests.map((req) => (
                    <JoinRequestCard
                      key={req.id}
                      request={req}
                      chatId={req.chatId}
                      chatTitle={req.chatTitle}
                      onResolved={handleResolved}
                    />
                  ))}
                </ul>
              </section>
            )}
            {outgoingRequests.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Your pending requests
                </h2>
                <ul className="flex flex-col gap-3">
                  {outgoingRequests.map((req) => (
                    <li key={req.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-900">{req.chat_title}</p>
                        <p className="text-xs text-stone-400">
                          {req.class_name && <span>{req.class_name} · </span>}
                          Requested {timeAgo(req.created_at)}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Pending
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
