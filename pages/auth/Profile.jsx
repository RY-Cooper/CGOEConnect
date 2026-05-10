import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { classesAPI } from "../../api";
import { uploadImage } from "../../utils/cloudinary";
import { IDENTITY_TAGS, STUDENT_STATUSES, MODALITY_TAGS } from "./Register";
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
  const { currentUser, updateProfile, setSelectedClassIds } = useAuth();
  const navigate = useNavigate();

  const [displayName,   setDisplayName]   = useState(currentUser?.name ?? "");
  const [bio,           setBio]           = useState(currentUser?.bio ?? "");
  const [timezone,      setTimezone]      = useState(currentUser?.timezone ?? "");
  const [identityTags,  setIdentityTags]  = useState(currentUser?.identityTags ?? []);
  const [studentStatus, setStudentStatus] = useState(currentUser?.studentStatus ?? "");
  const [modalityTags,  setModalityTags]  = useState(currentUser?.modalityTags ?? []);
  const [classIds,      setClassIds]      = useState(currentUser?.classes ?? []);
  const [catalogClasses, setCatalogClasses] = useState([]);
  const [picFile,       setPicFile]       = useState(null);
  const [picPreview,    setPicPreview]    = useState(currentUser?.profilePic ?? "");
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState(null);
  const picRef = useRef(null);

  const previewPic = picPreview || "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=256&q=80";

  const catalogSorted = useMemo(
    () => [...catalogClasses].sort((a, b) => a.name.localeCompare(b.name)),
    [catalogClasses]
  );

  useEffect(() => {
    classesAPI.list().then(({ classes }) => setCatalogClasses(classes)).catch(() => {});
  }, []);

  function handlePicPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicFile(file);
    setPicPreview(URL.createObjectURL(file));
  }

  function toggleIdentity(tag) {
    setIdentityTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
  }
  function toggleModality(tag) {
    setModalityTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
  }
  function toggleClass(id) {
    setClassIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  const tzLabel = TIMEZONES.find((t) => t.value === timezone)?.label;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      let picUrl = picPreview;
      if (picFile) picUrl = await uploadImage(picFile);
      await updateProfile({
        displayName, bio, timezone,
        profilePic:   picUrl || undefined,
        identityTags,
        studentStatus,
        modalityTags,
      });
      await setSelectedClassIds(classIds);
      navigate("/", { replace: true });
    } catch (err) {
      setSaveError(err.message || "Save failed — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-stone-200">
          <h1 className="text-2xl font-semibold text-stone-900 mb-1">Your profile</h1>
          <p className="text-sm text-stone-500 mb-4">Visible to classmates in hubs and threads.</p>

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

            {/* Display name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-stone-700 mb-1">Display name</label>
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
              <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1">Bio</label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25 resize-y"
                placeholder="Courses, interests, where you're based…"
              />
            </div>

            {/* Program & pathway tags */}
            <fieldset>
              <legend className="block text-sm font-medium text-stone-700 mb-2">Program &amp; pathway</legend>
              <div className="flex flex-wrap gap-2">
                {IDENTITY_TAGS.map((tag) => {
                  const on = identityTags.includes(tag);
                  return (
                    <button key={tag} type="button" onClick={() => toggleIdentity(tag)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${on ? "bg-[#8C1515] text-white shadow" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Student status */}
            <fieldset>
              <legend className="block text-sm font-medium text-stone-700 mb-2">Where are you in your journey?</legend>
              <div className="flex flex-wrap gap-2">
                {STUDENT_STATUSES.map((s) => (
                  <button key={s} type="button" onClick={() => setStudentStatus(s)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${studentStatus === s ? "bg-[#8C1515] text-white shadow" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Modality tags */}
            <fieldset>
              <legend className="block text-sm font-medium text-stone-700 mb-2">Schedule &amp; format</legend>
              <div className="flex flex-wrap gap-2">
                {MODALITY_TAGS.map((tag) => {
                  const on = modalityTags.includes(tag);
                  return (
                    <button key={tag} type="button" onClick={() => toggleModality(tag)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${on ? "bg-stone-800 text-white shadow" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Classes */}
            <div>
              <p className="block text-sm font-medium text-stone-700 mb-2">Your classes</p>
              {catalogSorted.length === 0 ? (
                <p className="text-xs text-stone-400">No classes in the catalog yet — ask your admin to add some.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-stone-200 divide-y divide-stone-100">
                  {catalogSorted.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-stone-50">
                      <input
                        type="checkbox"
                        checked={classIds.includes(c.id)}
                        onChange={() => toggleClass(c.id)}
                        className="rounded border-stone-300 text-[#8C1515] focus:ring-[#8C1515]"
                      />
                      <span className="text-sm text-stone-900">{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-stone-700 mb-1">Time zone</label>
              <div className="relative">
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-stone-300 bg-white px-3 py-2 pr-9 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
                >
                  <option value="">— Not set —</option>
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
              {timezone && tzLabel && (
                <p className="mt-1.5 text-xs text-stone-500">Showing as: <span className="font-medium text-stone-700">{tzLabel}</span></p>
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
