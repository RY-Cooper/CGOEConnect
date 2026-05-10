import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { classesAPI } from "../../api";

export const IDENTITY_TAGS  = ["CGOE","HCP","NDO","Certificate","Professional Ed","MS"];
export const STUDENT_STATUSES = ["prospective","admitted","current","alumni"];
export const MODALITY_TAGS  = ["full-time","part-time","remote","hybrid"];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);
}

export default function Register() {
  const { login, saveRegistration } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identityTags, setIdentityTags] = useState([]);
  const [studentStatus, setStudentStatus] = useState("");
  const [modalityTags, setModalityTags] = useState([]);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState([]);
  const [customName, setCustomName] = useState("");
  const [customClasses, setCustomClasses] = useState([]);
  const [catalogClasses, setCatalogClasses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    classesAPI.list().then(({ classes }) => setCatalogClasses(classes)).catch(() => {});
  }, []);

  const catalogSorted = useMemo(
    () => [...catalogClasses].sort((a, b) => a.name.localeCompare(b.name)),
    [catalogClasses]
  );

  function toggleIdentity(tag) {
    setIdentityTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
    setError("");
  }
  function toggleModality(tag) {
    setModalityTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
  }
  function toggleCatalogClass(id) {
    setSelectedCatalogIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function addCustomClass(e) {
    e.preventDefault();
    const n = customName.trim();
    if (!n) return;
    const id = `custom-${slugify(n)||"course"}-${Date.now().toString(36)}`;
    setCustomClasses((p) => [...p, { id, name: n }]);
    setCustomName("");
  }
  function removeCustomClass(id) {
    setCustomClasses((p) => p.filter((c) => c.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const displayName = name.trim();
    if (!displayName)            { setError("Enter your display name."); return; }
    if (!email.trim())           { setError("Enter your email."); return; }
    if (!password.trim())        { setError("Enter a password."); return; }
    if (!identityTags.length)    { setError("Select at least one program or pathway tag."); return; }
    if (!studentStatus)          { setError("Select where you are in your journey."); return; }
    if (!selectedCatalogIds.length && !customClasses.length) {
      setError("Select at least one class from the catalog or add your own course."); return;
    }
    setError(""); setLoading(true);
    try {
      // Register creates the user and logs them in
      await login(email.trim(), password.trim());
    } catch {
      // User might not exist yet — try registering first
      try {
        const { authAPI } = await import("../../api");
        const { token } = await authAPI.register(email.trim(), password.trim(), displayName, identityTags[0] ?? "CGOE");
        localStorage.setItem("cgoe_token", token);
        await login(email.trim(), password.trim());
      } catch (err) {
        setError(err.message || "Registration failed");
        setLoading(false);
        return;
      }
    }
    await saveRegistration({
      displayName,
      identityTags,
      studentStatus,
      modalityTags,
      selectedClassIds: [...selectedCatalogIds, ...customClasses.map((c) => c.id)],
      customClasses,
    });
    navigate("/guidelines", { replace: true });
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg border border-stone-200">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-stone-900">Join CGOEConnect</h1>
          <p className="mt-1 text-sm text-stone-600">Tell us how you show up in the community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">Name <span className="text-red-600">*</span></label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              placeholder="Your name" autoComplete="name" required />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">Email <span className="text-red-600">*</span></label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              placeholder="you@stanford.edu" autoComplete="email" required />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">Password <span className="text-red-600">*</span></label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              placeholder="Choose a password" autoComplete="new-password" required />
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

          <fieldset>
            <legend className="text-sm font-medium text-stone-700 mb-2">Classes this quarter <span className="text-red-600">*</span></legend>
            <p className="text-xs text-stone-500 mb-3">Pick at least one from the catalog and/or add your own course.</p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-stone-200 divide-y divide-stone-100">
              {catalogSorted.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-stone-50">
                  <input type="checkbox" checked={selectedCatalogIds.includes(c.id)} onChange={() => toggleCatalogClass(c.id)}
                    className="mt-1 rounded border-stone-300 text-[#8C1515] focus:ring-[#8C1515]" />
                  <span className="text-sm font-medium text-stone-900">{c.name}</span>
                </label>
              ))}
            </div>

            {customClasses.length > 0 && (
              <ul className="mt-3 space-y-2">
                {customClasses.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#8C1515]/5 px-3 py-2 text-sm">
                    <span className="font-medium text-stone-900">{c.name}</span>
                    <button type="button" onClick={() => removeCustomClass(c.id)}
                      className="text-xs font-medium text-[#8C1515] hover:underline">Remove</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={customName} onChange={(e) => setCustomName(e.target.value)}
                placeholder="Add a class not listed (e.g. STATS 200)"
                className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25" />
              <button type="button" onClick={addCustomClass}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50">
                Add class
              </button>
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-[#8C1515] px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-[#6f1010] transition-colors disabled:opacity-50">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[#8C1515] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
