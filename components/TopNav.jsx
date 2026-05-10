import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function TopNav() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-semibold text-stone-900 hover:text-[#8C1515] transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C1515]">
            <span className="text-sm font-black text-white tracking-tight">C</span>
          </div>
          <span className="hidden sm:block">CGOEConnect</span>
        </Link>

        {/* Center links */}
        <nav className="flex items-center gap-1">
          <Link
            to="/chat/general"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
            </svg>
            #introductions
          </Link>
          <Link
            to="/saved"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            Saved
          </Link>
          {currentUser?.role === "moderator" && (
            <Link
              to="/mod"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              Mod
            </Link>
          )}
          <Link
            to="/chat/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#8C1515] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6f1010] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 4v16m8-8H4"/>
            </svg>
            <span className="hidden sm:block">New subchat</span>
          </Link>
        </nav>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-medium text-stone-700 shadow-sm hover:border-stone-300 hover:bg-stone-50 transition-colors"
          >
            <img
              src={currentUser?.profilePic}
              alt={currentUser?.name}
              className="h-7 w-7 rounded-full object-cover"
            />
            <span className="hidden sm:block max-w-[120px] truncate">
              {currentUser?.name?.split(" ")[0]}
            </span>
            <svg
              className={`h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl border border-stone-200 bg-white py-2 shadow-xl">
              {/* User info */}
              <div className="flex items-center gap-3 border-b border-stone-100 px-4 pb-3 pt-1">
                <img
                  src={currentUser?.profilePic}
                  alt={currentUser?.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-900">{currentUser?.name}</p>
                  <p className="truncate text-xs text-stone-500">{currentUser?.program}</p>
                  {currentUser?.timezone && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-stone-400">
                      <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10"/>
                        <path strokeLinecap="round" d="M12 6v6l4 2"/>
                      </svg>
                      {currentUser.timezone.replace(/_/g, " ").split("/").pop()}
                    </p>
                  )}
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/profile-setup"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  Profile
                </Link>
                <Link
                  to="/chat/general"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors sm:hidden"
                >
                  <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                  </svg>
                  #introductions
                </Link>
                <Link
                  to="/saved"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors sm:hidden"
                >
                  <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                  </svg>
                  Saved posts
                </Link>
              </div>

              {currentUser?.role === "moderator" && (
                <Link
                  to="/mod"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  Moderation
                </Link>
              )}
              <div className="border-t border-stone-100 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
