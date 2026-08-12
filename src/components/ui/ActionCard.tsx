import type { LucideIcon } from "lucide-react";

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  highlight?: boolean;
}

export function ActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  highlight = false,
}: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border p-5 text-left transition duration-200 ${
        highlight
          ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20"
          : "border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-slate-300"
      }`}
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-current/20">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
      <p
        className={`mt-1 text-sm ${highlight ? "text-white/80" : "text-slate-500"}`}
      >
        {description}
      </p>
    </button>
  );
}
