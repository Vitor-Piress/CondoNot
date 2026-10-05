import { ChevronDown, Printer, Search } from "lucide-react";
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
import { formatCurrency, formatDate } from "../utils/format";
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
type SortOrder = "newest" | "oldest";
type ReportColumnKey =
  | "numero"
  | "emissao"
  | "dataRetroativa"
  | "categoria"
  | "modelo"
  | "unidade"
  | "motivo"
  | "status"
  | "dataBaixa"
  | "motivoBaixa"
  | "valor";

const reportColumns: { key: ReportColumnKey; label: string }[] = [
  { key: "numero", label: "Número" },
  { key: "emissao", label: "Data de emissão" },
  { key: "dataRetroativa", label: "Data da ocorrência" },
  { key: "categoria", label: "Categoria" },
  { key: "modelo", label: "Modelo" },
  { key: "unidade", label: "Unidade" },
  { key: "motivo", label: "Motivo" },
  { key: "status", label: "Status" },
  { key: "dataBaixa", label: "Data da baixa" },
  { key: "motivoBaixa", label: "Motivo da baixa" },
  { key: "valor", label: "Valor da multa" },
];

const pageSizeOptions = [10, 20, 30, 50, 100];

const filterControlClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 outline-none ring-slate-200 transition focus:ring";

const categoryOptions = [
  { value: "multa", label: "Multa" },
  { value: "orientacao", label: "Orientação" },
  { value: "advertencia", label: "Advertência" },
];

function normalizeCategory(category: string | null): string {
  return (
    category
      ?.normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("pt-BR") ?? ""
  );
}

function getDateBoundary(value: string, endOfDay = false): number | null {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function getOccurrenceTimestamp(row: Notification): number {
  if (row.dataRetroativa) {
    const value = /^\d{4}-\d{2}-\d{2}$/.test(row.dataRetroativa)
      ? `${row.dataRetroativa}T12:00:00`
      : row.dataRetroativa;
    const time = new Date(value).getTime();
    if (Number.isFinite(time)) return time;
  }
  return new Date(row.createdAt).getTime();
}

function formatInputDate(value: string): string {
  return value ? value.split("-").reverse().join("/") : "";
}

function getLocalDateInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function NotificationsPage({ onNavigate }: NotificationsPageProps) {
  const { activeCondominioId, activeCondominio } = useCondominio();
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ativa");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [selectedReportColumns, setSelectedReportColumns] = useState<
    ReportColumnKey[]
  >(reportColumns.map((column) => column.key));
  const [rows, setRows] = useState<Notification[]>([]);
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
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
      new Map(
        types.map((type) => [type.id, type.titulo ?? `Modelo ${type.id}`]),
      ),
    [types],
  );

  const unitMap = useMemo(
    () => new Map(units.map((unit) => [unit.id, getUnitLabel(unit)])),
    [units],
  );

  const visibleRows = useMemo(() => {
    const from = getDateBoundary(dateFrom);
    const to = getDateBoundary(dateTo, true);

    return rows
      .filter((row) => {
        const emittedAt = getOccurrenceTimestamp(row);
        const statusMatches =
          statusFilter === "todas" || row.status === "ativa";
        const categoryMatches =
          categoryFilter === "" ||
          normalizeCategory(row.categoria) === categoryFilter;
        const fromMatches = from === null || emittedAt >= from;
        const toMatches = to === null || emittedAt <= to;

        return statusMatches && categoryMatches && fromMatches && toMatches;
      })
      .sort((a, b) => {
        const difference =
          getOccurrenceTimestamp(a) - getOccurrenceTimestamp(b);
        return sortOrder === "newest" ? -difference : difference;
      });
  }, [rows, statusFilter, categoryFilter, dateFrom, dateTo, sortOrder]);

  const renderedRows = useMemo(
    () => visibleRows.slice(0, pageSize),
    [visibleRows, pageSize],
  );

  const reportingPeriod = useMemo(() => {
    const timestamps = visibleRows
      .map(getOccurrenceTimestamp)
      .filter(Number.isFinite);
    const firstNotification = timestamps.length
      ? getLocalDateInputValue(new Date(Math.min(...timestamps)).toISOString())
      : "";
    const lastNotification = timestamps.length
      ? getLocalDateInputValue(new Date(Math.max(...timestamps)).toISOString())
      : "";

    return {
      from: dateFrom || firstNotification,
      to: dateTo || lastNotification,
    };
  }, [visibleRows, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const byModel = new Map<string, number>();
    let fineTotal = 0;
    let fineCount = 0;
    let cancelledCount = 0;
    const byCategory = { multa: 0, orientacao: 0, advertencia: 0 };

    for (const row of visibleRows) {
      const category = normalizeCategory(row.categoria);
      if (category in byCategory) {
        byCategory[category as keyof typeof byCategory] += 1;
      }
      const name =
        typeMap.get(row.idTipoNotificacao) ?? `Modelo ${row.idTipoNotificacao}`;
      byModel.set(name, (byModel.get(name) ?? 0) + 1);
      if (row.status === "baixada") cancelledCount += 1;
      if (row.status === "ativa" && row.valorMulta !== null) {
        fineTotal += row.valorMulta;
        fineCount += 1;
      }
    }

    return {
      total: visibleRows.length,
      cancelledCount,
      byCategory,
      fineTotal,
      fineCount,
      byModel: [...byModel.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"),
      ),
    };
  }, [visibleRows, typeMap]);

  const summaryContent = (
    <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-3 print:border-slate-400">
        <div className="border-slate-200 p-3 print:border-slate-400">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
            Notificação mais recorrente
          </p>
          <p className="text-xl font-semibold text-slate-900">
            {summary.byModel[0]?.[0] ?? "—"}
          </p>
          <p className="text-xs text-slate-500">
            {summary.byModel[0]?.[1] ?? 0} de {summary.total} ocorrência(s)
          </p>
          {summary.cancelledCount > 0 ? (
            <p className="text-xs text-slate-500">
              {summary.cancelledCount} baixada(s) incluída(s)
            </p>
          ) : null}
        </div>
        <div className="border-t border-slate-200 p-3 print:border-slate-400">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
            Total em multas (ativas)
          </p>
          <p className="text-xl font-semibold text-slate-900">
            {formatCurrency(summary.fineTotal)}
          </p>
          <p className="text-xs text-slate-500">
            {summary.fineCount} multa(s) aplicada(s)
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-3 print:border-slate-400">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-400">
          Sumário
        </p>
        <ul className="space-y-1 text-sm text-slate-700">
          {categoryOptions.map((option) => (
            <li
              key={option.value}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-1 print:border-slate-400"
            >
              <span>{option.label}</span>
              <span className="font-semibold">
                {
                  summary.byCategory[
                    option.value as keyof typeof summary.byCategory
                  ]
                }
              </span>
            </li>
          ))}
          <li
            key={"total"}
            className="flex items-center justify-between gap-2 rounded-lg border bg-slate-50 border-slate-300 px-3 py-1 print:border-slate-400 font-bold"
          >
            <span>Total</span>
            <span className="font-semibold">{summary.total}</span>
          </li>
        </ul>
      </div>
      <div className="rounded-xl border border-slate-200 p-3 print:border-slate-400 sm:col-span-2 print:col-span-2">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate-400">
          Por modelo de notificação
        </p>
        <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {summary.byModel.map(([name, count]) => (
            <li
              key={name}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 print:border-slate-400"
            >
              <span className="min-w-0 wrap-break-word">{name}</span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  function getReportCellValue(
    column: ReportColumnKey,
    row: Notification,
  ): string {
    switch (column) {
      case "numero":
        return row.id;
      case "emissao":
        return formatDate(row.createdAt);
      case "dataRetroativa":
        return row.dataRetroativa ? formatInputDate(row.dataRetroativa) : "—";
      case "categoria":
        return getNotificationCategoryLabel(row.categoria) ?? "Não informada";
      case "modelo":
        return (
          typeMap.get(row.idTipoNotificacao) ??
          `Modelo ${row.idTipoNotificacao}`
        );
      case "unidade":
        return unitMap.get(row.idUnidade) ?? row.idUnidade;
      case "motivo":
        return row.motivo ?? "Sem motivo informado";
      case "status":
        return row.status === "ativa" ? "Ativa" : "Baixada";
      case "dataBaixa":
        return row.dataBaixa ? formatDate(row.dataBaixa) : "—";
      case "motivoBaixa":
        return row.motivoBaixa ?? "—";
      case "valor":
        return row.valorMulta === null ? "—" : formatCurrency(row.valorMulta);
    }
  }

  return (
    <>
      <Panel
        title="Relatórios e visualização de notificações"
        subtitle="Lista completa com filtros e acesso ao detalhe individual"
        action={
          <div className="flex flex-wrap items-center w-full justify-start gap-2">
            <button
              type="button"
              onClick={() => onNavigate("/notificacoes/nova")}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-slate-700 cursor-pointer"
            >
              Inserir notificação
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                setCategoryFilter("");
                setDateFrom("");
                setDateTo("");
                setStatusFilter("ativa");
                setSortOrder("newest");
                setPageSize(10);
                setSelectedReportColumns(
                  reportColumns.map((column) => column.key),
                );
              }}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100 cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        }
      >
        <section className="mb-5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setIsFiltersOpen((open) => !open)}
            aria-expanded={isFiltersOpen}
            aria-controls="report-filters-panel"
            className="flex w-full items-center justify-between gap-3  cursor-pointer rounded-2xl px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-slate-700">
              Filtros do relatório
            </span>
            <ChevronDown
              className={`size-4 text-slate-500 transition-transform ${isFiltersOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div
            id="report-filters-panel"
            hidden={!isFiltersOpen}
            className="border-t border-slate-200 p-4"
          >
            <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Busca
                <span className="relative block">
                  <Search
                    className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"
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
                    className={`${filterControlClass} pl-9`}
                    placeholder="Modelo, categoria ou motivo"
                  />
                </span>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Modelo
                <select
                  value={filters.typeId}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      typeId: event.target.value,
                    }))
                  }
                  className={filterControlClass}
                >
                  <option value="">Todos os modelos</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.titulo ?? `Modelo ${type.id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Unidade
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
                  inputClassName={filterControlClass}
                />
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Categoria
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className={filterControlClass}
                >
                  <option value="">Todas as categorias</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                  className={filterControlClass}
                >
                  <option value="ativa">Somente ativas</option>
                  <option value="todas">Todas (inclui baixadas)</option>
                </select>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Ocorrências a partir de
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className={filterControlClass}
                />
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Ocorrências até
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  className={filterControlClass}
                />
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Ordenação
                <select
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(event.target.value as SortOrder)
                  }
                  className={filterControlClass}
                >
                  <option value="newest">Mais recentes primeiro</option>
                  <option value="oldest">Mais antigas primeiro</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setIsColumnsOpen((open) => !open)}
            aria-expanded={isColumnsOpen}
            aria-controls="report-columns-panel"
            className="flex w-full items-center justify-between  cursor-pointer gap-3 rounded-2xl px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-slate-700">
              Colunas do relatório impresso
              <span className="ml-2 text-xs font-normal text-slate-500">
                {selectedReportColumns.length} de {reportColumns.length}{" "}
                selecionadas
              </span>
            </span>
            <ChevronDown
              className={`size-4 text-slate-500 transition-transform ${isColumnsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isColumnsOpen ? (
            <div
              id="report-columns-panel"
              className="border-t border-slate-200 p-4"
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {reportColumns.map((column) => {
                  const checked = selectedReportColumns.includes(column.key);
                  return (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={checked && selectedReportColumns.length === 1}
                        onChange={(event) =>
                          setSelectedReportColumns((current) =>
                            event.target.checked
                              ? [...current, column.key]
                              : current.filter((key) => key !== column.key),
                          )
                        }
                        className="size-4 accent-slate-900"
                      />
                      {column.label}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Selecione pelo menos uma coluna para incluir na impressão.
              </p>
            </div>
          ) : null}
        </section>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {renderedRows.length < visibleRows.length
              ? `Exibindo ${renderedRows.length} de ${visibleRows.length}`
              : visibleRows.length}{" "}
            notificaç
            {visibleRows.length === 1 ? "ão" : "ões"}
          </p>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Itens por página
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-9 rounded-xl border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none cursor-pointer ring-slate-200 focus:ring"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || Boolean(error) || visibleRows.length === 0}
              aria-label="Imprimir relatório"
              title="Imprimir relatório"
              className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 text-slate-600 transition cursor-pointer hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer aria-hidden="true" size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        {!loading && !error && visibleRows.length > 0 ? (
          <div className="mb-5">{summaryContent}</div>
        ) : null}

        {!loading && !error && visibleRows.length === 0 ? (
          <EmptyState
            title="Nenhum resultado"
            description="Ajuste os filtros ou cadastre uma nova notificação."
          />
        ) : null}

        {!loading && !error && visibleRows.length > 0 ? (
          <ul className="space-y-3">
            {renderedRows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(`/notificacoes/${row.id}`)}
                  className="grid w-full gap-2 rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_220px_160px] md:items-center cursor-pointer"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold text-slate-900">
                        {row.idUnidade
                          ? (unitMap.get(row.idUnidade) ?? row.idUnidade)
                          : "Sem unidade"}
                        <span className="font-semibold text-slate-600">
                          {" • "}
                          {getNotificationCategoryLabel(row.categoria) ??
                            `Notificação #${row.id}`}
                        </span>
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
                      Modelo de notificação
                    </p>
                    <p className="text-sm text-slate-700">
                      {typeMap.get(row.idTipoNotificacao) ??
                        `Modelo ${row.idTipoNotificacao}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(row.createdAt)}
                    </p>
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                      {row.valorMulta === null
                        ? "Sem multa"
                        : `Multa: ${formatCurrency(row.valorMulta)}`}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      {!loading && !error && visibleRows.length > 0 ? (
        <section className="notification-report-print hidden print:block print:px-[10mm] print:py-[8mm]">
          <header className="mb-6 border-b border-slate-400 pb-3">
            <h1 className="text-2xl font-bold text-slate-900">
              Relatório de notificações
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {activeCondominio?.name ?? "Condomínio"} · Gerado em{" "}
              {formatDate(new Date().toISOString())}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Período de apuração:{" "}
              {reportingPeriod.from
                ? formatInputDate(reportingPeriod.from)
                : "sem data inicial"}{" "}
              a{" "}
              {reportingPeriod.to
                ? formatInputDate(reportingPeriod.to)
                : "sem data final"}{" "}
              · Categoria:{" "}
              {categoryOptions.find((option) => option.value === categoryFilter)
                ?.label ?? "Todas"}{" "}
              · Status: {statusFilter === "ativa" ? "Ativas" : "Todas"} ·{" "}
              {visibleRows.length} registro(s)
            </p>
          </header>
          <div className="mb-4 break-inside-avoid">{summaryContent}</div>
          <table className="notification-report-table text-left text-xs">
            <thead>
              <tr>
                {selectedReportColumns.map((columnKey) => (
                  <th key={columnKey}>
                    {reportColumns.find((column) => column.key === columnKey)
                      ?.label ?? columnKey}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  {selectedReportColumns.map((columnKey) => (
                    <td key={columnKey}>
                      {getReportCellValue(columnKey, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
