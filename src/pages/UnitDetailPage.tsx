import { useEffect, useState } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { getUnitById } from "../services/unitService";
import {
  getPersonEmail,
  getPersonName,
  getPersonPhone,
  getUnitLabel,
  type Unit,
} from "../types/domain";
import { formatDate } from "../utils/format";

interface UnitDetailPageProps {
  unitId: string;
  onNavigate: (to: string) => void;
}

export function UnitDetailPage({ unitId, onNavigate }: UnitDetailPageProps) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUnit() {
      try {
        const data = await getUnitById(unitId);

        if (!active) {
          return;
        }

        setUnit(data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar a unidade.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadUnit();

    return () => {
      active = false;
    };
  }, [unitId]);

  return (
    <Panel
      title="Unidade individual"
      subtitle="Visualizacao dedicada para cada unidade"
      action={
        <div className="inline-flex gap-2">
          <button
            type="button"
            onClick={() => onNavigate("/unidades")}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/unidades/${unitId}/editar`)}
            className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-slate-700"
          >
            Editar unidade
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Carregando unidade...</p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && !unit ? (
        <EmptyState
          title="Unidade nao encontrada"
          description="Confira se o identificador esta correto e tente novamente."
        />
      ) : null}

      {!loading && !error && unit ? (
        <article className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Unidade
            </p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {getUnitLabel(unit)}
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Bloco
              </p>
              <p className="mt-1 text-sm text-slate-700">{unit.bloco}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Apartamento
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {unit.apartamento ?? "Nao informado"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Alugado
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {unit.alugado === null
                  ? "Nao informado"
                  : unit.alugado
                    ? "Sim"
                    : "Nao"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Criada em
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {formatDate(unit.createdAt)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Proprietario
            </p>
            <div className="mt-1 space-y-1 text-sm leading-7 text-slate-700">
              <p>Nome: {getPersonName(unit.proprietario)}</p>
              <p>Telefone: {getPersonPhone(unit.proprietario)}</p>
              <p>Email: {getPersonEmail(unit.proprietario)}</p>
            </div>
          </div>

          {unit.alugado ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Inquilino
              </p>
              <div className="mt-1 space-y-1 text-sm leading-7 text-slate-700">
                <p>Nome: {getPersonName(unit.inquilino)}</p>
                <p>Telefone: {getPersonPhone(unit.inquilino)}</p>
                <p>Email: {getPersonEmail(unit.inquilino)}</p>
              </div>
            </div>
          ) : null}
        </article>
      ) : null}
    </Panel>
  );
}
