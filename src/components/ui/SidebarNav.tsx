import {
  Building2,
  ClipboardList,
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
    label: "Home",
    path: "/",
    icon: House,
  },
  {
    label: "Relatorios",
    path: "/notificacoes",
    icon: ClipboardList,
  },
  {
    label: "Unidades",
    path: "/unidades",
    icon: Building2,
  },
  {
    label: "Tipos Notificacao",
    path: "/tipos-notificacao",
    icon: Tags,
  },
];

function isActive(pathname: string, itemPath: string): boolean {
  if (itemPath === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(itemPath);
}

export function SidebarNav({ currentPath, onNavigate }: SidebarNavProps) {
  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-5 flex items-center gap-2 px-2">
        <LayoutList className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Principal
        </h2>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(currentPath, item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
