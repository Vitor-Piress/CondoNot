import { LayoutGrid, List } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { listUnits } from "../services/unitService";
import { getUnitLabel, getUnitMainResident, type Unit } from "../types/domain";

interface UnitsPageProps {
  onNavigate: (to: string) => void;
}

type UnitsViewMode = "list" | "grid";

export function UnitsPage({ onNavigate }: UnitsPageProps) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<UnitsViewMode>("list");

  useEffect(() => {
    let active = true;

    async function loadRows() {
      setLoading(true);
      setError(null);

      try {
        const data = await listUnits(query);

        if (!active) {
          return;
        }

        setRows(data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar as unidades.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRows();

    return () => {
      active = false;
    };
  }, [query]);

  return (
    <Panel
      title="Unidades"
      subtitle="Visualizacao dedicada de unidades com modo lista e grade"
      action={
        <div className="inline-flex rounded-xl border border-slate-300 p-1">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${
              viewMode === "list"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${
              viewMode === "grid"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            Grade
          </button>
        </div>
      }
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mb-5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 transition focus:ring"
        placeholder="Buscar unidade por bloco, apartamento ou morador"
      />

      {loading ? <p className="text-sm text-slate-500">Carregando...</p> : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="Nenhuma unidade encontrada"
          description="Tente ajustar sua busca para encontrar os registros esperados."
        />
      ) : null}

      {!loading && !error && rows.length > 0 && viewMode === "list" ? (
        <ul className="space-y-2">
          {rows.map((unit) => (
            <li key={unit.id}>
              <button
                type="button"
                onClick={() => onNavigate(`/unidades/${unit.id}`)}
                className="grid w-full gap-2 rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_180px_180px] md:items-center"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {getUnitLabel(unit)}
                </p>
                <p className="text-sm text-slate-600">
                  {unit.alugado === null
                    ? "Status nao informado"
                    : unit.alugado
                      ? "Unidade alugada"
                      : "Unidade do proprietario"}
                </p>
                <p className="text-sm text-slate-500">
                  {getUnitMainResident(unit)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && rows.length > 0 && viewMode === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((unit) => (
            <button
              key={unit.id}
              type="button"
              onClick={() => onNavigate(`/unidades/${unit.id}`)}
              className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
            >
              <p className="text-sm font-semibold text-slate-900">
                {getUnitLabel(unit)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {unit.alugado === null
                  ? "Status nao informado"
                  : unit.alugado
                    ? "Unidade alugada"
                    : "Unidade do proprietario"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {getUnitMainResident(unit)}
              </p>
            </button>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
