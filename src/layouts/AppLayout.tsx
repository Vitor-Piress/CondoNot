import { BellRing, Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import type { PropsWithChildren } from "react";
import { SidebarNav } from "../components/ui/SidebarNav";
import { useCondominio } from "../contexts/useCondominio";

const CONDOMINIO_SWITCH_FEEDBACK_MS = 600;

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
  const [isSwitchingCondominio, setIsSwitchingCondominio] = useState(false);

  function handleCondominioChange(id: string) {
    setActiveCondominioId(id);
    onNavigate("/");
    setIsSwitchingCondominio(true);
    window.setTimeout(
      () => setIsSwitchingCondominio(false),
      CONDOMINIO_SWITCH_FEEDBACK_MS,
    );
  }

  return (
    <div className="app-background flex min-h-screen w-full max-w-full flex-col overflow-x-hidden print:min-h-0 print:overflow-visible print:border-0 print:p-0">
      <header className="print:hidden border-b border-black/10 bg-slate-900 px-4 py-3 text-slate-100 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
          <img
            src="https://clkjgwxwjmymqctvnldf.supabase.co/storage/v1/object/public/images-app/uploads/condonot/Gemini_Generated_Image_4qszmx4qszmx4qsz-removebg-preview.png"
            alt="Condonot"
            className="h-8 w-auto max-w-36 rounded-md bg-white p-1 object-contain"
          />
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium text-slate-300 sm:flex-none">
              <select
                value={activeCondominioId ?? ""}
                onChange={(event) => handleCondominioChange(event.target.value)}
                disabled={loadingCondominios || condominios.length === 0}
                aria-label="Selecionar condomínio"
                className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60 sm:w-auto sm:max-w-60"
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
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-100 transition hover:bg-slate-800"
            >
              <Building2 aria-hidden="true" size={17} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/")}
              aria-label="Ir para o dashboard"
              title="Dashboard"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-100 transition hover:bg-slate-800 sm:size-auto sm:gap-2 sm:px-3 sm:py-1.5"
            >
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden text-xs font-semibold uppercase tracking-[0.15em] sm:inline">
                Dashboard
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 print:mx-0 print:block print:max-w-none print:px-0 print:py-0 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6">
        <div className="print:hidden">
          <SidebarNav currentPath={currentPath} onNavigate={onNavigate} />
        </div>

        <main className="min-w-0 space-y-6 print:w-full print:space-y-0">
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

      <footer className="print:hidden border-t border-slate-200/80 px-4 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Condonot. Todos os direitos reservados.
      </footer>

      {isSwitchingCondominio ? (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-lg">
            <Loader2 className="animate-spin" aria-hidden="true" size={18} />
            Trocando de condomínio...
          </div>
        </div>
      ) : null}
    </div>
  );
}
