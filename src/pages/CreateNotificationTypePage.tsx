import { useState } from "react";
import { CreateNotificationTypeForm } from "../components/forms/CreateNotificationTypeForm";
import { Panel } from "../components/ui/Panel";

interface CreateNotificationTypePageProps {
  onNavigate: (to: string) => void;
}

export function CreateNotificationTypePage({
  onNavigate,
}: CreateNotificationTypePageProps) {
  const [success, setSuccess] = useState(false);

  return (
    <Panel
      title="Inserir tipo de notificação"
      subtitle="Cadastre templates para agilizar novos registros"
      action={
        <button
          type="button"
          onClick={() => onNavigate("/")}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
        >
          Voltar para o início
        </button>
      }
    >
      <CreateNotificationTypeForm
        onSuccess={() => {
          setSuccess(true);
        }}
      />

      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          Tipo cadastrado com sucesso.
        </p>
      ) : null}
    </Panel>
  );
}
