import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Demo seed users — all share password "password123"
const DEMO_USERS = [
  { email: "aisha@example.com",  name: "Aisha Patel",   bio: "MS CS '25 | ML enthusiast | ex-Google",        program: "CGOE", role: "student",    pic: "https://i.pravatar.cc/150?img=1" },
  { email: "james@example.com",  name: "James Wu",      bio: "HCP student | Healthcare + AI",                 program: "HCP",  role: "moderator",  pic: "https://i.pravatar.cc/150?img=2" },
  { email: "sofia@example.com",  name: "Sofia Reyes",   bio: "MS EE | Signal processing nerd",               program: "MS",   role: "student",    pic: "https://i.pravatar.cc/150?img=3" },
  { email: "derek@example.com",  name: "Derek Okafor",  bio: "CGOE | Full-stack dev | Building cool things", program: "CGOE", role: "student",    pic: "https://i.pravatar.cc/150?img=4" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  function pickDemo(user) {
    setSelectedDemo(user.email);
    setEmail(user.email);
    setPassword("password123");
    setError("");
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg border border-stone-200">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-stone-900">CGOEConnect</h1>
          <p className="mt-1 text-sm text-stone-600">Sign in to connect with your cohort</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              placeholder="you@stanford.edu"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input
              id="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              placeholder="••••••••"
            />
          </div>

          {/* Demo quick-select */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Demo — sign in as
            </p>
            <div className="flex flex-col gap-2">
              {DEMO_USERS.map((u) => {
                const selected = selectedDemo === u.email;
                return (
                  <button
                    key={u.email} type="button" onClick={() => pickDemo(u)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selected
                        ? "border-[#8C1515]/40 bg-[#8C1515]/5 ring-1 ring-[#8C1515]/20"
                        : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    <img src={u.pic} alt={u.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${selected ? "text-[#8C1515]" : "text-stone-900"}`}>{u.name}</p>
                      <p className="text-xs text-stone-400 truncate">{u.bio}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{u.program}</span>
                      {u.role === "moderator" && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Mod</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full rounded-lg bg-[#8C1515] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#6f1010] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          New here?{" "}
          <Link to="/register" className="font-medium text-[#8C1515] hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
