import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { uploadImage } from "../../utils/cloudinary";
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
  const [displayName, setDisplayName] = useState(currentUser?.name ?? "");
  const [bio, setBio]                 = useState(currentUser?.bio ?? "");
  const [timezone, setTimezone]       = useState(currentUser?.timezone ?? "");
  const [picFile, setPicFile]         = useState(null);
  const [picPreview, setPicPreview]   = useState(currentUser?.profilePic ?? "");
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState(null);
  const picRef                        = useRef(null);
  const previewPic = picPreview || "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=256&q=80";

  function handlePicPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicFile(file);
    setPicPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      let picUrl = picPreview;
      if (picFile) picUrl = await uploadImage(picFile);
      await updateProfile({ displayName, bio, profilePic: picUrl || undefined, timezone });
      navigate("/", { replace: true });
    } catch (err) {
      setSaveError(err.message || "Save failed — check your connection and try again.");
    } finally {
      setSaving(false);
    }
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
          <p className="text-sm text-stone-500 mb-4">
            Visible to classmates in hubs and threads.
          </p>
          {saveError && (
            <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {saveError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={previewPic}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover border border-stone-200"
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=256&q=80"; }}
                />
                <button
                  type="button"
                  onClick={() => picRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#8C1515] text-white shadow hover:bg-[#6f1010] transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700">Profile picture</p>
                <input ref={picRef} type="file" accept="image/*" onChange={handlePicPick} className="hidden" />
                <button type="button" onClick={() => picRef.current?.click()} className="mt-1 text-xs font-medium text-[#8C1515] hover:underline">
                  {picFile ? "Change photo" : "Upload photo"}
                </button>
                {picFile && <p className="mt-0.5 text-xs text-stone-400 truncate max-w-[180px]">{picFile.name}</p>}
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
              disabled={saving}
              className="w-full rounded-lg bg-[#8C1515] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[#6f1010] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
