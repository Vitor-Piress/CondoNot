import { Panel } from "../components/ui/Panel";

interface NotFoundPageProps {
  onNavigate: (to: string) => void;
}

export function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  return (
    <Panel
      title="Pagina nao encontrada"
      subtitle="A rota informada nao existe"
      action={
        <button
          type="button"
          onClick={() => onNavigate("/")}
          className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-slate-700"
        >
          Voltar para home
        </button>
      }
    >
      <p className="text-sm text-slate-600">
        Verifique o endereco e tente novamente.
      </p>
    </Panel>
  );
}
