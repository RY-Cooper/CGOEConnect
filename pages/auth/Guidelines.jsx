import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RULES = [
  {
    title: "Be respectful and inclusive",
    body: "Treat classmates and staff with professionalism. Harassment, discrimination, and personal attacks are not tolerated.",
  },
  {
    title: "Keep academics honest",
    body: "Share intuition and resources, but do not post solutions to graded work or encourage dishonesty.",
  },
  {
    title: "Protect privacy",
    body: "Do not share private Zoom links, emails, or personal details without consent.",
  },
  {
    title: "Stay on topic",
    body: "Use class hubs for coursework discussion; move casual chat to designated yap threads.",
  },
  {
    title: "Report concerns",
    body: "Flag harmful content so moderators can review quickly and keep the community safe.",
  },
];

export default function Guidelines() {
  const { setAgreedToGuidelines } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAgree() {
    setError("");
    setSaving(true);
    try {
      await setAgreedToGuidelines(true);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl border border-stone-200">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-stone-900">
            Community guidelines
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Stanford CGOE/HCP/MS students — quick norms before you dive in.
          </p>
        </div>

        <ul className="space-y-4 mb-8">
          {RULES.map((rule) => (
            <li
              key={rule.title}
              className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3"
            >
              <p className="font-medium text-stone-900">{rule.title}</p>
              <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                {rule.body}
              </p>
            </li>
          ))}
        </ul>

        {error && (
          <p className="mb-3 text-sm text-red-600" role="alert">{error}</p>
        )}

        <button
          type="button"
          onClick={handleAgree}
          disabled={saving}
          className="w-full rounded-lg bg-[#8C1515] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[#6f1010] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "I Agree"}
        </button>
      </div>
    </div>
  );
}
