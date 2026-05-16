import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { classesAPI } from "../../api";

const BOARD_BY_CLASS = {
  cs229: [
    {
      moderatorName: "James Wu",
      title: "HW thread etiquette reminder",
      date: "2026-04-22",
      body: "Keep hints conceptual — don't paste runnable answers in announcements or pinned threads. Use spoiler tags in subchats if you're sharing partially formed ideas.",
    },
    {
      moderatorName: "James Wu",
      title: "Midterm discussion boundaries",
      date: "2026-04-18",
      body: "Feel free to compare what topics showed up on practice versus lectures — avoid quoting exam prompts verbatim until everyone has sat it.",
    },
  ],
  cs231n: [
    {
      moderatorName: "James Wu",
      title: "GPU usage check-in",
      date: "2026-04-20",
      body: "If you're hitting quota limits, swap tips in resources — cloud credits vary by program and no one should feel obligated to spend out of pocket.",
    },
  ],
  cs224n: [
    {
      moderatorName: "James Wu",
      title: "Optional alignment Friday session",
      date: "2026-04-24",
      body: "Some of us are Zooming through the optional alignment material — join if helpful; no recording expectations.",
    },
    {
      moderatorName: "James Wu",
      title: "Partner matching",
      date: "2026-04-15",
      body: "Reply in the matching subchat by Sunday if you want a random partner — moderators will batch pairs Monday morning.",
    },
  ],
  ee364a: [
    {
      moderatorName: "James Wu",
      title: "Project proposal timeline",
      date: "2026-04-25",
      body: "One-pagers should stay high-level — cite collaborators by Slack handle so moderators can spot duplicate coverage.",
    },
  ],
  cs145: [
    {
      moderatorName: "James Wu",
      title: "Docker setup sync",
      date: "2026-04-19",
      body: "Finish the connectivity checklist before section — ping moderators if images pull slowly so we can crowdsource mirrors.",
    },
  ],
};

const DEFAULT_BOARD = [
  {
    moderatorName: "Moderator",
    title: "Welcome — moderator-maintained board",
    date: "2026-04-01",
    body: "This board is for community norms and coordination posted by student moderators — not course administration.",
  },
];

export default function Announcements() {
  const { classId } = useParams();
  const [className, setClassName] = useState(null);
  const items = BOARD_BY_CLASS[classId] ?? DEFAULT_BOARD;
  const base = `/class/${classId}`;

  useEffect(() => {
    classesAPI.get(classId)
      .then(({ class: cls }) => setClassName(cls.name))
      .catch(() => {});
  }, [classId]);

  return (
    <div className="min-h-screen bg-[#f6f1e7] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link to={base} className="text-sm font-medium text-[#8C1515] hover:underline">
          ← Back to hub
        </Link>

        <div className="mt-6 rounded-sm border-2 border-amber-900/30 bg-[#fffdf8] p-6 shadow-md">
          <div className="border-b-2 border-dashed border-amber-900/20 pb-4 mb-6">
            <h1 className="font-serif text-2xl font-bold text-amber-950 tracking-tight">
              {className ?? "Class"} — Announcements
            </h1>
            <p className="mt-1 text-sm text-amber-900/70">
              Posted by <strong>community moderators</strong> — peer volunteers, not instructors or Stanford course staff.
            </p>
          </div>

          <ul className="space-y-6">
            {items.map((item) => (
              <li key={item.title + item.date} className="relative border-l-4 border-[#8C1515] pl-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/60">{item.date}</p>
                <h2 className="mt-1 text-lg font-semibold text-stone-900">{item.title}</h2>
                <p className="mt-2 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{item.body}</p>
                <p className="mt-3 text-xs font-medium text-[#8C1515]">— {item.moderatorName}, moderator</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
