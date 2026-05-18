import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { uploadImage } from "../../utils/cloudinary";

export const IDENTITY_TAGS    = ["CGOE","HCP","NDO","Certificate","Professional Ed","MS"];
export const STUDENT_STATUSES = ["prospective","admitted","current","alumni"];
export const MODALITY_TAGS    = ["full-time","part-time","remote","hybrid"];
export const TIMEZONES = [
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
export const COURSES = [
  { id: "cs103",  name: "CS 103 — Mathematical Foundations of Computing" },
  { id: "cs106a", name: "CS 106A — Programming Methodology" },
  { id: "cs106b", name: "CS 106B — Programming Abstractions" },
  { id: "cs107",  name: "CS 107 — Computer Organization & Systems" },
  { id: "cs109",  name: "CS 109 — Probability for Computer Scientists" },
  { id: "cs111",  name: "CS 111 — Operating Systems Principles" },
  { id: "cs140e", name: "CS 140E — Operating Systems Design & Implementation" },
  { id: "cs142",  name: "CS 142 — Web Applications" },
  { id: "cs144",  name: "CS 144 — Introduction to Computer Networking" },
  { id: "cs145",  name: "CS 145 — Introduction to Databases" },
  { id: "cs147",  name: "CS 147 — Introduction to Human-Computer Interaction Design" },
  { id: "cs149",  name: "CS 149 — Parallel Computing" },
  { id: "cs153",  name: "CS 153 — AI/startup-focused seminar course" },
  { id: "cs154",  name: "CS 154 — Introduction to Automata and Complexity Theory" },
  { id: "cs161",  name: "CS 161 — Design and Analysis of Algorithms" },
  { id: "cs168",  name: "CS 168 — The Modern Algorithmic Toolbox" },
  { id: "cs193x", name: "CS 193X — Web Programming Fundamentals" },
  { id: "cs221",  name: "CS 221 — Artificial Intelligence: Principles and Techniques" },
  { id: "cs224n", name: "CS 224N — NLP with Deep Learning" },
  { id: "cs229",  name: "CS 229 — Machine Learning" },
  { id: "cs231n", name: "CS 231N — Deep Learning for Computer Vision" },
  { id: "cs234",  name: "CS 234 — Reinforcement Learning" },
  { id: "cs238",  name: "CS 238 — Decision Making Under Uncertainty" },
  { id: "cs244c", name: "CS 244C — Advanced Networking and Distributed Systems" },
  { id: "cs247",  name: "CS 247 — Human-Computer Interaction Seminar" },
  { id: "cs255",  name: "CS 255 — Introduction to Cryptography" },
  { id: "cs261",  name: "CS 261 — Combinatorial Optimization" },
  { id: "cs265",  name: "CS 265 — Randomized Algorithms and Probabilistic Analysis" },
  { id: "cs278",  name: "CS 278 — Social Computing" },
  { id: "cs347",  name: "CS 347 — Human-Computer Interaction: Foundations and Frontiers" },
  { id: "cs520",  name: "CS 520 — Knowledge Graphs" },
];

export default function Register() {
  const { loginWithToken, saveRegistration } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [bio, setBio] = useState("");
  const [identityTags, setIdentityTags] = useState([]);
  const [studentStatus, setStudentStatus] = useState("");
  const [modalityTags, setModalityTags] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [timezone, setTimezone] = useState("");
  const [picFile, setPicFile] = useState(null);
  const [picPreview, setPicPreview] = useState("");
  const picRef = useRef(null);

  function handlePicPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicFile(file);
    setPicPreview(URL.createObjectURL(file));
  }

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredCourses = courseSearch.trim()
    ? COURSES.filter((c) => c.name.toLowerCase().includes(courseSearch.toLowerCase()))
    : COURSES;

  function toggleIdentity(tag) {
    setIdentityTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
    setError("");
  }
  function toggleModality(tag) {
    setModalityTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
  }
  function toggleCourse(id) {
    setSelectedCourseIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  function handleNext(e) {
    e.preventDefault();
    if (!name.trim())     { setError("Enter your display name."); return; }
    if (!email.trim())    { setError("Enter your email."); return; }
    if (!password.trim()) { setError("Enter a password."); return; }
    setError("");
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!identityTags.length)      { setError("Select at least one program or pathway tag."); return; }
    if (!studentStatus)            { setError("Select where you are in your journey."); return; }
    if (!selectedCourseIds.length) { setError("Select at least one class."); return; }
    setError(""); setLoading(true);
    try {
      const { authAPI } = await import("../../api");
      const { token, user } = await authAPI.register(email.trim(), password.trim(), name.trim(), identityTags[0] ?? "CGOE");
      loginWithToken(token, user);
      const profilePic = picFile ? await uploadImage(picFile).catch(() => undefined) : undefined;
      await saveRegistration(user.id, {
        displayName: name.trim(),
        bio: bio.trim(),
        profilePic,
        identityTags,
        studentStatus,
        modalityTags,
        timezone,
        selectedClassIds: selectedCourseIds,
      });
    } catch (err) {
      setError(err.message || "Registration failed");
      setLoading(false);
      return;
    }
    navigate("/guidelines", { replace: true });
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg border border-stone-200">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-stone-900">Join CGOEConnect</h1>
          <p className="mt-1 text-sm text-stone-600">
            {step === 1 ? "Create your account" : "Tell us how you show up in the community"}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {[1, 2].map((n) => (
              <div key={n} className={`h-1.5 w-12 rounded-full transition-colors ${step >= n ? "bg-[#8C1515]" : "bg-stone-200"}`} />
            ))}
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">Name <span className="text-red-600">*</span></label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
                placeholder="Your name" autoComplete="name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">Email <span className="text-red-600">*</span></label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
                placeholder="you@stanford.edu" autoComplete="email" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">Password <span className="text-red-600">*</span></label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
                placeholder="Choose a password" autoComplete="new-password" />
            </div>

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

            <button type="submit"
              className="w-full rounded-lg bg-[#8C1515] px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-[#6f1010] transition-colors">
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={picPreview || "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=256&q=80"}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover border border-stone-200"
                />
                <button type="button" onClick={() => picRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#8C1515] text-white shadow hover:bg-[#6f1010] transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700">Profile picture <span className="text-stone-400 font-normal">(optional)</span></p>
                <input ref={picRef} type="file" accept="image/*" onChange={handlePicPick} className="hidden" />
                <button type="button" onClick={() => picRef.current?.click()}
                  className="mt-1 text-xs font-medium text-[#8C1515] hover:underline">
                  {picFile ? "Change photo" : "Upload photo"}
                </button>
                {picFile && <p className="mt-0.5 text-xs text-stone-400 truncate max-w-[180px]">{picFile.name}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1">
                Bio <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25 resize-none"
                placeholder="Tell the community a bit about yourself…" />
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-stone-700 mb-2">Program &amp; pathway <span className="text-red-600">*</span></legend>
              <p className="text-xs text-stone-500 mb-3">Choose any that apply — CGOE, HCP, NDO, certificates, Professional Ed, MS, etc.</p>
              <div className="flex flex-wrap gap-2">
                {IDENTITY_TAGS.map((tag) => {
                  const on = identityTags.includes(tag);
                  return (
                    <button key={tag} type="button" onClick={() => toggleIdentity(tag)}
                      className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${on ? "bg-[#8C1515] text-white shadow" : "bg-stone-100 text-stone-800 hover:bg-stone-200"}`}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-stone-700 mb-2">Where are you in your journey? <span className="text-red-600">*</span></legend>
              <div className="flex flex-wrap gap-2">
                {STUDENT_STATUSES.map((s) => (
                  <button key={s} type="button" onClick={() => { setStudentStatus(s); setError(""); }}
                    className={`rounded-full px-3 py-2 text-sm font-medium capitalize transition-colors ${studentStatus === s ? "bg-[#8C1515] text-white shadow" : "bg-stone-100 text-stone-800 hover:bg-stone-200"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-stone-700 mb-2">Schedule &amp; format <span className="text-stone-400 font-normal">(optional)</span></legend>
              <div className="flex flex-wrap gap-2">
                {MODALITY_TAGS.map((tag) => {
                  const on = modalityTags.includes(tag);
                  return (
                    <button key={tag} type="button" onClick={() => toggleModality(tag)}
                      className={`rounded-full px-3 py-2 text-sm font-medium capitalize transition-colors ${on ? "bg-stone-800 text-white shadow" : "bg-stone-100 text-stone-800 hover:bg-stone-200"}`}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-stone-700 mb-1">
                Time zone <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-stone-300 bg-white px-3 py-2 pr-9 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25">
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
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-stone-700 mb-2">Classes this quarter <span className="text-red-600">*</span></legend>
              <p className="text-xs text-stone-500 mb-3">Select all that apply.</p>
              <input
                value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Search courses…"
                className="mb-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25" />
              <div className="max-h-52 overflow-y-auto rounded-lg border border-stone-200 divide-y divide-stone-100">
                {filteredCourses.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-stone-500 text-center">No courses match your search.</p>
                ) : filteredCourses.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-stone-50">
                    <input type="checkbox" checked={selectedCourseIds.includes(c.id)} onChange={() => toggleCourse(c.id)}
                      className="rounded border-stone-300 text-[#8C1515] focus:ring-[#8C1515]" />
                    <span className="text-sm text-stone-900">{c.name}</span>
                  </label>
                ))}
              </div>
              {selectedCourseIds.length > 0 && (
                <p className="mt-1.5 text-xs text-stone-500">{selectedCourseIds.length} selected</p>
              )}
            </fieldset>

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={() => { setStep(1); setError(""); }}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                Back
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 rounded-lg bg-[#8C1515] px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-[#6f1010] transition-colors disabled:opacity-50">
                {loading ? "Creating account…" : "Create account"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[#8C1515] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
