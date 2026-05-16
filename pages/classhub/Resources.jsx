import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { classesAPI, resourcesAPI } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { uploadFile } from "../../utils/cloudinary";
import TopNav from "../../components/TopNav";

function fileType(mime) {
  if (!mime) return "Link";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "Image";
  if (mime.includes("word") || mime.includes("document")) return "Doc";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "Sheet";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "Slides";
  return "File";
}

const BADGE = {
  PDF:    "bg-red-50 text-[#8C1515]",
  Image:  "bg-sky-50 text-sky-800",
  Doc:    "bg-blue-50 text-blue-800",
  Sheet:  "bg-emerald-50 text-emerald-800",
  Slides: "bg-amber-50 text-amber-800",
  File:   "bg-stone-100 text-stone-700",
  Link:   "bg-emerald-50 text-emerald-900",
};

function TypeBadge({ type }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[type] ?? BADGE.File}`}>
      {type}
    </span>
  );
}

export default function Resources() {
  const { classId } = useParams();
  const { currentUser } = useAuth();
  const [hubClass, setHubClass] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("file");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [pickedFile, setPickedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileRef = useRef(null);

  const base = `/class/${classId}`;

  useEffect(() => {
    Promise.all([
      classesAPI.get(classId),
      resourcesAPI.list(classId),
    ])
      .then(([{ class: cls }, { resources: res }]) => {
        setHubClass(cls);
        setResources(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId]);

  function flash(msg, ok = true) {
    if (ok) setSuccess(msg); else setError(msg);
    setTimeout(() => { setSuccess(null); setError(null); }, 4000);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setUploading(true);
    try {
      let url = linkUrl;
      let type = "Link";
      if (mode === "file") {
        if (!pickedFile) { flash("Pick a file first.", false); return; }
        if (pickedFile.size > 10 * 1024 * 1024) { flash("File too large — maximum size is 10 MB.", false); return; }
        url  = await uploadFile(pickedFile);
        type = fileType(pickedFile.type);
      }
      if (!url) { flash("Enter a URL.", false); return; }
      const { resource } = await resourcesAPI.create(classId, { title: title.trim(), url, file_type: type });
      setResources((prev) => [{ ...resource, uploaded_by_name: currentUser?.name }, ...prev]);
      setTitle(""); setLinkUrl(""); setPickedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      flash("Resource added!");
    } catch (err) {
      flash(err.message || "Upload failed", false);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await resourcesAPI.remove(classId, id);
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      flash(err.message || "Failed to delete", false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to={base} className="text-sm font-medium text-[#8C1515] hover:underline">
          ← Back to hub
        </Link>

        <h1 className="mt-6 text-2xl font-semibold text-stone-900">
          Resources
          {hubClass && <span className="block text-base font-normal text-stone-500 mt-1">{hubClass.name}</span>}
        </h1>

        {/* Add resource form */}
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Add a resource</h2>

          {(error || success) && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
              {success || error}
            </div>
          )}

          {/* Mode toggle */}
          <div className="mb-4 flex rounded-lg border border-stone-200 bg-stone-50 overflow-hidden w-fit text-xs font-medium">
            {["file", "link"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-4 py-2 capitalize transition-colors ${mode === m ? "bg-[#8C1515] text-white" : "text-stone-600 hover:bg-stone-100"}`}
              >
                {m === "file" ? "Upload file" : "Paste link"}
              </button>
            ))}
          </div>

          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Week 3 lecture slides)"
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
            />

            {mode === "file" ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-stone-200 px-4 py-5 text-sm text-stone-500 hover:border-[#8C1515]/40 hover:bg-stone-50 transition-colors"
              >
                <svg className="h-5 w-5 shrink-0 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
                {pickedFile
                  ? <span className="font-medium text-stone-700 truncate">{pickedFile.name}</span>
                  : <span>Click to choose a file — PDF, image, doc, etc.</span>
                }
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)}
                />
              </div>
            ) : (
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/resource"
                required={mode === "link"}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#8C1515] focus:outline-none focus:ring-2 focus:ring-[#8C1515]/25"
              />
            )}

            <button
              type="submit"
              disabled={uploading}
              className="self-start rounded-lg bg-[#8C1515] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6f1010] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {uploading ? "Uploading…" : "Add resource"}
            </button>
          </form>
        </div>

        {/* Resource list */}
        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
            </div>
          ) : resources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white py-12 text-center">
              <p className="text-sm text-stone-500">No resources yet — add the first one above.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {resources.map((r) => {
                const canDelete = currentUser?.id === r.uploaded_by || currentUser?.role === "moderator";
                return (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 hover:underline"
                    >
                      <p className="font-medium text-stone-900 text-sm">{r.title}</p>
                      <p className="mt-0.5 text-xs text-stone-400 truncate">{r.uploaded_by_name && `Added by ${r.uploaded_by_name} · `}{new Date(r.created_at).toLocaleDateString()}</p>
                    </a>
                    <TypeBadge type={r.file_type} />
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
