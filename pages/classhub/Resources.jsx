import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { classesAPI } from "../../api";

const RESOURCE_LINKS = {
  cs229: [
    { title: "Lecture slides — supervised learning", type: "PDF", url: "https://example.edu/cs229/slides/supervised.pdf" },
    { title: "Notation cheat sheet", type: "PDF", url: "https://example.edu/cs229/ref/notation.pdf" },
    { title: "Course calendar (ICS)", type: "Link", url: "https://example.edu/cs229/calendar" },
  ],
  cs231n: [
    { title: "CNN backprop summary", type: "PDF", url: "https://example.edu/cs231n/ref/cnn-backprop.pdf" },
    { title: "A2 starter notebook", type: "Link", url: "https://colab.research.google.com/example/cs231n-a2" },
    { title: "Office hours queue", type: "Link", url: "https://example.edu/cs231n/oh" },
  ],
  cs224n: [
    { title: "Transformer intuition slides", type: "PDF", url: "https://example.edu/cs224n/slides/transformers.pdf" },
    { title: "Annotated attention paper list", type: "Link", url: "https://example.edu/cs224n/readings" },
  ],
  ee364a: [
    { title: "Convex analysis primer", type: "PDF", url: "https://example.edu/ee364a/ref/convex-primer.pdf" },
    { title: "Boyd & Vandenberghe — selected chapters", type: "Link", url: "https://example.edu/ee364a/textbook" },
  ],
  cs145: [
    { title: "SQL patterns sheet", type: "PDF", url: "https://example.edu/cs145/ref/sql-patterns.pdf" },
    { title: "Docker lab VM image", type: "Link", url: "https://example.edu/cs145/docker" },
    { title: "Recovery & indexing overview", type: "PDF", url: "https://example.edu/cs145/slides/recovery.pdf" },
  ],
};

function TypeBadge({ type }) {
  const isPdf = type === "PDF";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isPdf ? "bg-red-50 text-[#8C1515]" : "bg-emerald-50 text-emerald-900"}`}>
      {type}
    </span>
  );
}

export default function Resources() {
  const { classId } = useParams();
  const [className, setClassName] = useState(null);
  const list = RESOURCE_LINKS[classId] ?? [];
  const base = `/class/${classId}`;

  useEffect(() => {
    classesAPI.get(classId)
      .then(({ class: cls }) => setClassName(cls.name))
      .catch(() => {});
  }, [classId]);

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link to={base} className="text-sm font-medium text-[#8C1515] hover:underline">
          ← Back to hub
        </Link>

        <h1 className="mt-6 text-2xl font-semibold text-stone-900">
          Resources
          {className && (
            <span className="block text-base font-normal text-stone-600 mt-1">{className}</span>
          )}
        </h1>

        {list.length === 0 ? (
          <p className="mt-6 text-sm text-stone-600">No resources listed for this class yet.</p>
        ) : (
          <ul className="mt-8 space-y-3">
            {list.map((item) => (
              <li key={item.title}>
                <a
                  href={item.url}
                  className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-[#8C1515]/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-stone-500">{item.url}</p>
                  </div>
                  <div className="shrink-0">
                    <TypeBadge type={item.type} />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
