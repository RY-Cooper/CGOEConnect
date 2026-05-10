import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { chatsAPI } from "../../api";
import ChatThread from "./ChatThread";
import TopNav from "../../components/TopNav";

export default function GeneralChat() {
  const [chatId, setChatId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chatsAPI.general()
      .then(({ chats }) => {
        if (chats?.length) setChatId(chats[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link to="/" className="text-sm font-medium text-[#8C1515] hover:underline">
            ← Home
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8C1515]/10">
              <svg className="h-5 w-5 text-[#8C1515]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-900">#introductions</h1>
              <p className="text-sm text-stone-500">General community chat · all CGOE members</p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              This is the community-wide chat — visible to all CGOE, HCP, and MS students. Introduce yourself, ask cross-class questions, and keep it respectful.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
          </div>
        ) : chatId ? (
          <ChatThread chatId={chatId} simple />
        ) : (
          <p className="text-center text-sm text-stone-500 py-12">General chat not available.</p>
        )}
      </main>
    </div>
  );
}
