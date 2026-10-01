import { BellRing, Building2 } from "lucide-react";
import type { PropsWithChildren } from "react";
import { SidebarNav } from "../components/ui/SidebarNav";
import { useCondominio } from "../contexts/useCondominio";

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
  const {
    condominios,
    activeCondominioId,
    activeCondominio,
    loadingCondominios,
    condominioError,
    setActiveCondominioId,
  } = useCondominio();

  return (
    <div className="min-h-screen app-background print:border-6 print:border-double print:rounded-sm print:p-3">
      <header className="print:hidden border-b border-black/10 bg-slate-900 px-6 py-3 text-slate-100">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <p className="text-sm font-medium tracking-[0.18em] text-slate-300">
            CONDONOTI
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <span className="hidden sm:inline">Condomínio</span>
              <select
                value={activeCondominioId ?? ""}
                onChange={(event) => setActiveCondominioId(event.target.value)}
                disabled={loadingCondominios || condominios.length === 0}
                aria-label="Selecionar condomínio"
                className="max-w-52 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
              >
                {loadingCondominios ? (
                  <option value="">Carregando...</option>
                ) : null}
                {condominios.map((condominio) => (
                  <option key={condominio.id} value={condominio.id}>
                    {condominio.name}
                  </option>
                ))}
              </select>
            </label>
            <span
              className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-white"
              title={activeCondominio?.name ?? "Condomínio selecionado"}
            >
              {activeCondominio?.logo_url ? (
                <img
                  src={activeCondominio.logo_url}
                  alt={`Logo de ${activeCondominio.name}`}
                  className="size-full object-contain p-0.5"
                />
              ) : (
                <Building2
                  aria-hidden="true"
                  className="text-slate-500"
                  size={19}
                />
              )}
            </span>
            <button
              type="button"
              onClick={() => onNavigate("/condominios")}
              aria-label="Gerenciar condomínios"
              title="Gerenciar condomínios"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-700 text-slate-100 transition hover:bg-slate-800"
            >
              <Building2 aria-hidden="true" size={17} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-100 transition hover:bg-slate-800"
            >
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6">
        <div className="print:hidden">
          <SidebarNav currentPath={currentPath} onNavigate={onNavigate} />
        </div>

        <main className="min-w-0 space-y-6">
          {condominioError ? (
            <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {condominioError}
            </section>
          ) : null}
          {supabaseConfigError ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {supabaseConfigError}. O sistema segue com dados de demonstração
              enquanto o ambiente não é configurado.
            </section>
          ) : null}
          {loadingCondominios && currentPath !== "/condominios" ? (
            <p className="text-sm text-slate-500">Carregando condomínios...</p>
          ) : !activeCondominioId && currentPath !== "/condominios" ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-700">
                Cadastre um condomínio para começar.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("/condominios")}
                className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Gerenciar condomínios
              </button>
            </section>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
