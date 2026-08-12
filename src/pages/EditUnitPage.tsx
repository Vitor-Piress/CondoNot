import { EditUnitForm } from "../components/forms/EditUnitForm";
import { Panel } from "../components/ui/Panel";

interface EditUnitPageProps {
  unitId: string;
  onNavigate: (to: string) => void;
}

export function EditUnitPage({ unitId, onNavigate }: EditUnitPageProps) {
  return (
    <Panel
      title="Editar unidade"
      subtitle="Atualize os dados e salve o registro"
      action={
        <button
          type="button"
          onClick={() => onNavigate(`/unidades/${unitId}`)}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
        >
          Voltar para unidade
        </button>
      }
    >
      <EditUnitForm
        unitId={unitId}
        onSuccess={() => onNavigate(`/unidades/${unitId}`)}
      />
    </Panel>
  );
}
