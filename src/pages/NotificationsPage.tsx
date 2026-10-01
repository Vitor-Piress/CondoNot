import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { UnitCombobox } from "../components/ui/UnitCombobox";
import {
  listNotifications,
  type NotificationFilters,
} from "../services/notificationService";
import { listNotificationTypes } from "../services/notificationTypeService";
import { listUnits } from "../services/unitService";
import {
  getNotificationCategoryLabel,
  getUnitLabel,
  type Notification,
  type NotificationType,
  type Unit,
} from "../types/domain";
import { formatDate } from "../utils/format";
import { useCondominio } from "../contexts/useCondominio";

interface NotificationsPageProps {
  onNavigate: (to: string) => void;
}

const initialFilters: NotificationFilters = {
  query: "",
  typeId: "",
  unitId: "",
};

type StatusFilter = "ativa" | "todas";

export function NotificationsPage({ onNavigate }: NotificationsPageProps) {
  const { activeCondominioId } = useCondominio();
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ativa");
  const [rows, setRows] = useState<Notification[]>([]);
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRows() {
      if (!activeCondominioId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [notifications, typeRows, unitRows] = await Promise.all([
          listNotifications(filters, activeCondominioId),
          listNotificationTypes(activeCondominioId),
          listUnits("", activeCondominioId),
        ]);

        if (!active) {
          return;
        }

        setRows(notifications);
        setTypes(typeRows);
        setUnits(unitRows);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar as notificações.";
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
  }, [activeCondominioId, filters]);

  const typeMap = useMemo(
    () =>
      new Map(types.map((type) => [type.id, type.titulo ?? `Tipo ${type.id}`])),
    [types],
  );

  const unitMap = useMemo(
    () => new Map(units.map((unit) => [unit.id, getUnitLabel(unit)])),
    [units],
  );

  const visibleRows = useMemo(
    () =>
      statusFilter === "ativa"
        ? rows.filter((row) => row.status === "ativa")
        : rows,
    [rows, statusFilter],
  );

  return (
    <Panel
      title="Relatórios e visualização de notificações"
      subtitle="Lista completa com filtros e acesso ao detalhe individual"
      action={
        <button
          type="button"
          onClick={() => onNavigate("/notificacoes/nova")}
          className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-slate-700"
        >
          Inserir notificação
        </button>
      }
    >
      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={filters.query}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                query: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none ring-slate-200 transition focus:ring"
            placeholder="Buscar por tipo, categoria ou motivo"
          />
        </label>

        <select
          value={filters.typeId}
          onChange={(event) =>
            setFilters((previous) => ({
              ...previous,
              typeId: event.target.value,
            }))
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-200 transition focus:ring"
        >
          <option value="">Todos os tipos</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.titulo ?? `Tipo ${type.id}`}
            </option>
          ))}
        </select>

        <UnitCombobox
          units={units}
          value={filters.unitId}
          onChange={(unitId) =>
            setFilters((previous) => ({
              ...previous,
              unitId,
            }))
          }
          emptyOptionLabel="Todas as unidades"
          placeholder="Buscar unidade"
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as StatusFilter)
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-200 transition focus:ring"
        >
          <option value="ativa">Somente ativas</option>
          <option value="todas">Todas (inclui baixadas)</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-slate-500">Carregando...</p> : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && visibleRows.length === 0 ? (
        <EmptyState
          title="Nenhum resultado"
          description="Ajuste os filtros ou cadastre uma nova notificação."
        />
      ) : null}

      {!loading && !error && visibleRows.length > 0 ? (
        <ul className="space-y-3">
          {visibleRows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onNavigate(`/notificacoes/${row.id}`)}
                className="grid w-full gap-2 rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_220px_160px] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {getNotificationCategoryLabel(row.categoria) ??
                        `Notificação #${row.id}`}
                    </p>
                    {row.status === "baixada" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-rose-700">
                        Baixada
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.motivo ?? "Sem motivo informado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                    Tipo de notificação
                  </p>
                  <p className="text-sm text-slate-700">
                    {typeMap.get(row.idTipoNotificacao) ??
                      `Tipo ${row.idTipoNotificacao}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {row.idUnidade
                      ? (unitMap.get(row.idUnidade) ?? ` ${row.idUnidade}`)
                      : "Sem unidade"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(row.createdAt)}
                  </p>
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    {row.valorMulta === null
                      ? "Sem multa"
                      : `Multa: ${row.valorMulta}`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
