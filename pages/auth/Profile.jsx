import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import TopNav from "../../components/TopNav";

const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT) — Los Angeles" },
  { value: "America/Denver",      label: "Mountain Time (MT) — Denver" },
  { value: "America/Chicago",     label: "Central Time (CT) — Chicago" },
  { value: "America/New_York",    label: "Eastern Time (ET) — New York" },
  { value: "America/Sao_Paulo",   label: "Brasília Time (BRT) — São Paulo" },
  { value: "Europe/London",       label: "GMT — London" },
  { value: "Europe/Paris",        label: "Central European Time — Paris" },
  { value: "Europe/Berlin",       label: "Central European Time — Berlin" },
  { value: "Asia/Dubai",          label: "Gulf Standard Time — Dubai" },
  { value: "Asia/Kolkata",        label: "India Standard Time — Mumbai" },
  { value: "Asia/Singapore",      label: "Singapore Time — Singapore" },
  { value: "Asia/Tokyo",          label: "Japan Standard Time — Tokyo" },
  { value: "Australia/Sydney",    label: "Australian Eastern Time — Sydney" },
  { value: "Pacific/Auckland",    label: "New Zealand Time — Auckland" },
];

export default function Profile() {
  const { currentUser, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName]     = useState(currentUser?.name ?? "");
  const [bio, setBio]                     = useState(currentUser?.bio ?? "");
  const [timezone, setTimezone]           = useState(currentUser?.timezone ?? "");
  const [profilePicUrl, setProfilePicUrl] = useState(currentUser?.profilePic ?? "");
  const previewPic = profilePicUrl || "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=256&q=80";

  async function handleSubmit(e) {
    e.preventDefault();
    await updateProfile({ displayName, bio, profilePic: profilePicUrl || undefined, timezone });
    navigate("/", { replace: true });
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
      </div>
    );
  }

  const identityTags  = currentUser.identityTags ?? [];
  const modalityTags  = currentUser.modalityTags ?? [];
  const studentStatus = currentUser.studentStatus;

  const tzLabel = TIMEZONES.find((t) => t.value === timezone)?.label;

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-stone-200">
          <h1 className="text-2xl font-semibold text-stone-900 mb-1">Your profile</h1>
          <p className="text-sm text-stone-500 mb-8">
            Visible to classmates in hubs and threads.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <img
                src={previewPic}
                alt=""
                className="h-24 w-24 rounded-full object-cover border border-stone-200 shrink-0"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=256&q=80"; }}
              />
              <div className="flex-1">
                <label htmlFor="profilePicUrl" className="block text-sm font-medium text-stone-700 mb-1">
                  Profile picture URL
                </label>
                <input
                  id="profilePicUrl"
                  type="url"
                  value={profilePicUrl}
                  onChange={(e) => setProfilePicUrl(e.target.value)}
                  placeholder="https://example.com/your-photo.jpg"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
                />
                <p className="text-xs text-stone-400 mt-1">Paste any public image URL — LinkedIn, Gravatar, etc.</p>
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="block text-sm font-medium text-stone-700 mb-2">Your tags</p>
              <div className="flex flex-wrap gap-2">
                {identityTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#8C1515]/10 px-3 py-1 text-xs font-semibold text-[#8C1515]">
                    {tag}
                  </span>
                ))}
                {studentStatus && (
                  <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold capitalize text-stone-800">
                    {studentStatus}
                  </span>
                )}
                {modalityTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium capitalize text-stone-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Display name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-stone-700 mb-1">
                Display name
              </label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25 resize-y"
                placeholder="Courses, interests, where you're based…"
              />
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-stone-700 mb-1">
                Time zone
              </label>
              <div className="relative">
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-stone-300 bg-white px-3 py-2 pr-9 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
                >
                  <option value="">— Not set —</option>
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
              {timezone && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/>
                    <path strokeLinecap="round" d="M12 6v6l4 2"/>
                  </svg>
                  Showing as: <span className="font-medium text-stone-700">{tzLabel}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#8C1515] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[#6f1010] transition-colors"
            >
              Save profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
