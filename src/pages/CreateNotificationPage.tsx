import { CreateNotificationForm } from "../components/forms/CreateNotificationForm";
import { Panel } from "../components/ui/Panel";

interface CreateNotificationPageProps {
  onNavigate: (to: string) => void;
}

export function CreateNotificationPage({
  onNavigate,
}: CreateNotificationPageProps) {
  return (
    <Panel
      title="Inserir notificação"
      subtitle="Registre uma notificação completa e direcione para uma unidade e um modelo"
      action={
        <button
          type="button"
          onClick={() => onNavigate("/notificacoes")}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
        >
          Abrir lista completa
        </button>
      }
    >
      <CreateNotificationForm
        onSuccess={(notificationId) =>
          onNavigate(`/notificacoes/${notificationId}`)
        }
      />
    </Panel>
  );
}
