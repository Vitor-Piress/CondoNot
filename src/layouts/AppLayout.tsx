import { BellRing } from "lucide-react";
import type { PropsWithChildren } from "react";
import { SidebarNav } from "../components/ui/SidebarNav";

interface AppLayoutProps extends PropsWithChildren {
  currentPath: string;
  onNavigate: (to: string) => void;
  supabaseConfigError: string | null;
}

export function AppLayout({
  currentPath,
  onNavigate,
  supabaseConfigError,
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen app-background print:border-6 print:border-double print:rounded-sm print:p-3">
      <header className="print:hidden border-b border-black/10 bg-slate-900 px-6 py-3 text-slate-100">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <p className="text-sm font-medium tracking-[0.18em] text-slate-300">
            CONDONOTI
          </p>
          <button
            type="button"
            onClick={() => onNavigate("/")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-100 transition hover:bg-slate-800"
          >
            <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
            Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6">
        <div className="print:hidden">
          <SidebarNav currentPath={currentPath} onNavigate={onNavigate} />
        </div>

        <main className="min-w-0 space-y-6">
          {supabaseConfigError ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {supabaseConfigError}. O sistema segue com dados de demonstracao
              enquanto o ambiente nao e configurado.
            </section>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
