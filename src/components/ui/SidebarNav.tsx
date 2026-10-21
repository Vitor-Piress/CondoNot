import {
  Building2,
  ClipboardList,
  FileText,
  House,
  LayoutList,
  Tags,
} from "lucide-react";
import type { ComponentType } from "react";

interface SidebarNavProps {
  currentPath: string;
  onNavigate: (to: string) => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
}

const navItems: NavItem[] = [
  {
    label: "Início",
    path: "/",
    icon: House,
  },
  {
    label: "Notificações",
    path: "/notificacoes",
    icon: ClipboardList,
  },
  {
    label: "Unidades",
    path: "/unidades",
    icon: Building2,
  },
  {
    label: "Modelo de notificação",
    path: "/tipos-notificacao",
    icon: Tags,
  },
  {
    label: "Regimento interno",
    path: "/regimento-interno",
    icon: FileText,
  },
];

function isActive(pathname: string, itemPath: string): boolean {
  if (itemPath === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(itemPath);
}

export function SidebarNav({ currentPath, onNavigate }: SidebarNavProps) {
  const activeIndex = navItems.findIndex((item) =>
    isActive(currentPath, item.path),
  );

  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-5 flex items-center gap-2 px-2">
        <LayoutList className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Principal
        </h2>
      </div>

      <nav className="relative flex flex-col gap-1">
        <span
          aria-hidden="true"
          style={{
            transform: `translateY(calc(${Math.max(activeIndex, 0)} * 2.5rem))`,
          }}
          className={`pointer-events-none absolute inset-x-0 top-0 h-9 rounded-xl bg-slate-900 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            activeIndex >= 0 ? "opacity-100" : "opacity-0"
          }`}
        />
        {navItems.map((item) => {
          const active = isActive(currentPath, item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`relative z-10 flex h-9 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors duration-200 cursor-pointer ${
                active
                  ? "text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
