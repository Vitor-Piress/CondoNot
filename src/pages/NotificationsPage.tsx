import {
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronDown,
  Printer,
  Search,
  ShieldOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { NotificationTypeCombobox } from "../components/ui/NotificationTypeCombobox";
import { Panel } from "../components/ui/Panel";
import { UnitCombobox } from "../components/ui/UnitCombobox";
import {
  getNotificationEmailRecipient,
  inactivateNotificationsBatch,
  listNotificationAttachments,
  listNotifications,
  sendNotificationEmail,
  type NotificationFilters,
} from "../services/notificationService";
import { listNotificationTypes } from "../services/notificationTypeService";
import { listUnits } from "../services/unitService";
import {
  getNotificationAuthorLabel,
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
type EmailFilter = "todas" | "enviado" | "pendente";
type SortOrder = "newest" | "oldest";
type ReportColumnKey =
  | "numero"
  | "emissao"
  | "dataRetroativa"
  | "categoria"
  | "modelo"
  | "unidade"
  | "motivo"
  | "criadoPor"
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
  { key: "criadoPor", label: "Criada por" },
  { key: "status", label: "Status" },
  { key: "dataBaixa", label: "Data da baixa" },
  { key: "motivoBaixa", label: "Motivo da baixa" },
  { key: "valor", label: "Valor da multa" },
];

const pageSizeOptions = [10, 20, 30, 50, 100];

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-start",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-start",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-end",
    totalPages,
  ];
}

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
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("todas");
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
  const [currentPage, setCurrentPage] = useState(1);
  const [previousCondominioId, setPreviousCondominioId] =
    useState(activeCondominioId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Estados do modal de Baixa em Lote
  const [isBatchBaixaModalOpen, setIsBatchBaixaModalOpen] = useState(false);
  const [batchBaixaMotivo, setBatchBaixaMotivo] = useState("");
  const [batchBaixaError, setBatchBaixaError] = useState<string | null>(null);
  const [isSubmittingBatchBaixa, setIsSubmittingBatchBaixa] = useState(false);
  const [batchBaixaSuccessCount, setBatchBaixaSuccessCount] = useState<
    number | null
  >(null);

  // Estados do modal de Envio de E-mail em Lote
  const [isBatchEmailModalOpen, setIsBatchEmailModalOpen] = useState(false);
  const [isSendingBatchEmail, setIsSendingBatchEmail] = useState(false);
  const [batchEmailCurrentIndex, setBatchEmailCurrentIndex] = useState(0);
  const [batchEmailFinished, setBatchEmailFinished] = useState(false);
  const [batchEmailItemResults, setBatchEmailItemResults] = useState<
    Record<
      string,
      {
        status: "pending" | "sending" | "success" | "error";
        message?: string;
      }
    >
  >({});

  if (previousCondominioId !== activeCondominioId) {
    setPreviousCondominioId(activeCondominioId);
    setCurrentPage(1);
    setSelectedIds([]);
  }

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

  const typeObjectMap = useMemo(
    () => new Map(types.map((type) => [type.id, type])),
    [types],
  );

  const unitMap = useMemo(
    () => new Map(units.map((unit) => [unit.id, getUnitLabel(unit)])),
    [units],
  );

  const unitObjectMap = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
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
        const emailAlreadySent =
          row.emailNotificacao || Boolean(row.emailEnviadoEm);
        const emailMatches =
          emailFilter === "todas" ||
          (emailFilter === "enviado" ? emailAlreadySent : !emailAlreadySent);
        const categoryMatches =
          categoryFilter === "" ||
          normalizeCategory(row.categoria) === categoryFilter;
        const fromMatches = from === null || emittedAt >= from;
        const toMatches = to === null || emittedAt <= to;

        return (
          statusMatches &&
          emailMatches &&
          categoryMatches &&
          fromMatches &&
          toMatches
        );
      })
      .sort((a, b) => {
        const difference =
          getOccurrenceTimestamp(a) - getOccurrenceTimestamp(b);
        return sortOrder === "newest" ? -difference : difference;
      });
  }, [
    rows,
    statusFilter,
    emailFilter,
    categoryFilter,
    dateFrom,
    dateTo,
    sortOrder,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(visibleRows.length / pageSize)),
    [visibleRows.length, pageSize],
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const renderedRows = useMemo(
    () => visibleRows.slice(startIndex, endIndex),
    [visibleRows, startIndex, endIndex],
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedNotifications = useMemo(
    () => rows.filter((row) => selectedSet.has(row.id)),
    [rows, selectedSet],
  );

  const allRenderedSelected =
    renderedRows.length > 0 &&
    renderedRows.every((row) => selectedSet.has(row.id));

  const allVisibleSelected =
    visibleRows.length > 0 &&
    visibleRows.every((row) => selectedSet.has(row.id));

  function toggleRowSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function togglePageSelection() {
    const pageIds = renderedRows.map((row) => row.id);
    if (allRenderedSelected) {
      const pageIdSet = new Set(pageIds);
      setSelectedIds((current) =>
        current.filter((id) => !pageIdSet.has(id)),
      );
    } else {
      setSelectedIds((current) =>
        Array.from(new Set([...current, ...pageIds])),
      );
    }
  }

  function toggleAllVisibleSelection() {
    const visibleIds = visibleRows.map((row) => row.id);
    if (allVisibleSelected) {
      const visibleIdSet = new Set(visibleIds);
      setSelectedIds((current) =>
        current.filter((id) => !visibleIdSet.has(id)),
      );
    } else {
      setSelectedIds((current) =>
        Array.from(new Set([...current, ...visibleIds])),
      );
    }
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  const batchBaixaAnalysis = useMemo(() => {
    const eligible: Notification[] = [];
    const alreadyBaixadas: Notification[] = [];

    for (const row of selectedNotifications) {
      if (row.status === "ativa") {
        eligible.push(row);
      } else {
        alreadyBaixadas.push(row);
      }
    }

    return { eligible, alreadyBaixadas };
  }, [selectedNotifications]);

  const batchEmailAnalysis = useMemo(() => {
    const items = selectedNotifications.map((row) => {
      const unit = row.idUnidade
        ? (unitObjectMap.get(row.idUnidade) ?? null)
        : null;
      const recipient = unit ? getNotificationEmailRecipient(unit) : null;
      const alreadySent =
        row.emailNotificacao || Boolean(row.emailEnviadoEm);
      const isBaixada = row.status === "baixada";
      const missingToken = !row.cienciaToken;

      let blockReason: string | null = null;
      if (alreadySent) {
        blockReason = "E-mail já enviado anteriormente";
      } else if (isBaixada) {
        blockReason = "Notificação já está baixada";
      } else if (!recipient) {
        blockReason = "Unidade sem e-mail cadastrado";
      } else if (missingToken) {
        blockReason = "Notificação sem token de ciência";
      }

      return {
        row,
        unit,
        recipient,
        alreadySent,
        isBaixada,
        blockReason,
        isEligible: blockReason === null,
      };
    });

    const eligibleItems = items.filter((item) => item.isEligible);
    const blockedItems = items.filter((item) => !item.isEligible);
    const alreadySentCount = items.filter((item) => item.alreadySent).length;

    return {
      items,
      eligibleItems,
      blockedItems,
      alreadySentCount,
      canSendBatch:
        items.length > 0 &&
        blockedItems.length === 0 &&
        eligibleItems.length === items.length,
    };
  }, [selectedNotifications, unitObjectMap]);

  function openBatchBaixaModal() {
    setBatchBaixaMotivo("");
    setBatchBaixaError(null);
    setBatchBaixaSuccessCount(null);
    setIsBatchBaixaModalOpen(true);
  }

  function closeBatchBaixaModal() {
    if (isSubmittingBatchBaixa) {
      return;
    }
    setIsBatchBaixaModalOpen(false);
    setBatchBaixaMotivo("");
    setBatchBaixaError(null);
    setBatchBaixaSuccessCount(null);
  }

  async function handleConfirmBatchBaixa() {
    if (!activeCondominioId || isSubmittingBatchBaixa) {
      return;
    }

    if (batchBaixaAnalysis.alreadyBaixadas.length > 0) {
      setBatchBaixaError(
        "Remova as notificações já baixadas da seleção antes de confirmar a baixa em lote.",
      );
      return;
    }

    if (batchBaixaAnalysis.eligible.length === 0) {
      setBatchBaixaError("Nenhuma notificação ativa selecionada.");
      return;
    }

    const trimmedMotivo = batchBaixaMotivo.trim();
    if (!trimmedMotivo) {
      setBatchBaixaError("Informe o motivo da baixa em lote.");
      return;
    }

    setIsSubmittingBatchBaixa(true);
    setBatchBaixaError(null);

    try {
      const targetIds = batchBaixaAnalysis.eligible.map((row) => row.id);
      const updatedRows = await inactivateNotificationsBatch(
        targetIds,
        activeCondominioId,
        trimmedMotivo,
      );
      const updatedMap = new Map(updatedRows.map((item) => [item.id, item]));

      setRows((current) =>
        current.map((row) => updatedMap.get(row.id) ?? row),
      );
      setBatchBaixaSuccessCount(updatedRows.length);
      setSelectedIds([]);
    } catch (err) {
      setBatchBaixaError(
        err instanceof Error
          ? err.message
          : "Não foi possível realizar a baixa em lote.",
      );
    } finally {
      setIsSubmittingBatchBaixa(false);
    }
  }

  function openBatchEmailModal() {
    setBatchEmailCurrentIndex(0);
    setBatchEmailFinished(false);
    setBatchEmailItemResults({});
    setIsBatchEmailModalOpen(true);
  }

  function closeBatchEmailModal() {
    if (isSendingBatchEmail) {
      return;
    }
    setIsBatchEmailModalOpen(false);
    setBatchEmailCurrentIndex(0);
    setBatchEmailFinished(false);
    setBatchEmailItemResults({});
  }

  async function handleConfirmBatchEmail() {
    if (
      !activeCondominioId ||
      isSendingBatchEmail ||
      !batchEmailAnalysis.canSendBatch
    ) {
      return;
    }

    const queue = batchEmailAnalysis.eligibleItems;
    setIsSendingBatchEmail(true);
    setBatchEmailFinished(false);
    setBatchEmailCurrentIndex(0);

    const initialStatuses: Record<
      string,
      { status: "pending" | "sending" | "success" | "error"; message?: string }
    > = {};
    for (const item of queue) {
      initialStatuses[item.row.id] = { status: "pending" };
    }
    setBatchEmailItemResults(initialStatuses);

    const succeededIds = new Set<string>();

    for (let index = 0; index < queue.length; index += 1) {
      const item = queue[index];
      setBatchEmailCurrentIndex(index + 1);
      setBatchEmailItemResults((current) => ({
        ...current,
        [item.row.id]: { status: "sending" },
      }));

      try {
        if (!item.unit) {
          throw new Error("Unidade não encontrada.");
        }

        const attachments = await listNotificationAttachments(
          item.row.id,
          activeCondominioId,
        );
        const typeObj =
          typeObjectMap.get(item.row.idTipoNotificacao) ?? null;
        const typeTitle =
          typeObj?.titulo ?? `Tipo ${item.row.idTipoNotificacao}`;

        const updatedNotification = await sendNotificationEmail(
          item.row,
          item.unit,
          typeTitle,
          typeObj,
          activeCondominio,
          attachments,
        );

        succeededIds.add(item.row.id);
        setRows((current) =>
          current.map((row) =>
            row.id === updatedNotification.id ? updatedNotification : row,
          ),
        );
        setBatchEmailItemResults((current) => ({
          ...current,
          [item.row.id]: {
            status: "success",
            message: `Enviado para ${updatedNotification.emailEnviadoPara}`,
          },
        }));
      } catch (sendError) {
        const message =
          sendError instanceof Error
            ? sendError.message
            : "Falha ao enviar o e-mail.";
        setBatchEmailItemResults((current) => ({
          ...current,
          [item.row.id]: {
            status: "error",
            message,
          },
        }));
      }
    }

    if (succeededIds.size > 0) {
      setSelectedIds((current) =>
        current.filter((id) => !succeededIds.has(id)),
      );
    }

    setIsSendingBatchEmail(false);
    setBatchEmailFinished(true);
  }

  useEffect(() => {
    if (!isBatchBaixaModalOpen && !isBatchEmailModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      if (isBatchBaixaModalOpen && !isSubmittingBatchBaixa) {
        setIsBatchBaixaModalOpen(false);
        setBatchBaixaMotivo("");
        setBatchBaixaError(null);
        setBatchBaixaSuccessCount(null);
      }
      if (isBatchEmailModalOpen && !isSendingBatchEmail) {
        setIsBatchEmailModalOpen(false);
        setBatchEmailCurrentIndex(0);
        setBatchEmailFinished(false);
        setBatchEmailItemResults({});
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isBatchBaixaModalOpen,
    isSubmittingBatchBaixa,
    isBatchEmailModalOpen,
    isSendingBatchEmail,
  ]);

  const paginationItems = useMemo(
    () => buildPaginationItems(safeCurrentPage, totalPages),
    [safeCurrentPage, totalPages],
  );

  const topPaginationControls = (
    <nav
      aria-label="Navegação rápida de páginas"
      className="flex items-center gap-1.5"
    >
      <button
        type="button"
        onClick={() =>
          setCurrentPage((page) => Math.max(1, Math.min(page, totalPages) - 1))
        }
        disabled={safeCurrentPage <= 1}
        aria-label="Página anterior"
        title="Página anterior"
        className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition cursor-pointer hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        <ArrowLeft aria-hidden="true" size={16} />
      </button>
      <button
        type="button"
        onClick={() =>
          setCurrentPage((page) =>
            Math.min(totalPages, Math.min(page, totalPages) + 1),
          )
        }
        disabled={safeCurrentPage >= totalPages}
        aria-label="Próxima página"
        title="Próxima página"
        className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition cursor-pointer hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        <ArrowRight aria-hidden="true" size={16} />
      </button>
    </nav>
  );

  const paginationControls = (
    <nav
      aria-label="Paginação de notificações"
      className="flex flex-wrap items-center justify-center gap-1.5"
    >
      <button
        type="button"
        onClick={() =>
          setCurrentPage((page) => Math.max(1, Math.min(page, totalPages) - 1))
        }
        disabled={safeCurrentPage <= 1}
        aria-label="Página anterior"
        title="Página anterior"
        className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition cursor-pointer hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        <ArrowLeft aria-hidden="true" size={16} />
      </button>

      {paginationItems.map((item) => {
        if (typeof item !== "number") {
          return (
            <span
              key={item}
              aria-hidden="true"
              className="inline-flex h-9 min-w-7 items-center justify-center px-1 text-xs font-semibold text-slate-400 select-none"
            >
              ...
            </span>
          );
        }

        const isActive = item === safeCurrentPage;
        return (
          <button
            key={item}
            type="button"
            onClick={() => setCurrentPage(item)}
            aria-label={`Ir para a página ${item}`}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-2.5 text-xs font-semibold transition cursor-pointer ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() =>
          setCurrentPage((page) =>
            Math.min(totalPages, Math.min(page, totalPages) + 1),
          )
        }
        disabled={safeCurrentPage >= totalPages}
        aria-label="Próxima página"
        title="Próxima página"
        className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition cursor-pointer hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        <ArrowRight aria-hidden="true" size={16} />
      </button>
    </nav>
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
      <div className="animate-slide-down rounded-xl border border-slate-200 p-3 print:border-slate-400">
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

      <div className="animate-slide-down rounded-xl border border-slate-200 p-3 print:border-slate-400">
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
      <div className="animate-slide-down rounded-xl border border-slate-200 p-3 print:border-slate-400 sm:col-span-2 print:col-span-2">
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
      case "criadoPor":
        return getNotificationAuthorLabel(row);
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
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
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
                  setEmailFilter("todas");
                  setSortOrder("newest");
                  setPageSize(10);
                  setCurrentPage(1);
                  setSelectedReportColumns(
                    reportColumns.map((column) => column.key),
                  );
                }}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100 cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || Boolean(error) || visibleRows.length === 0}
              aria-label="Imprimir relatório"
              title="Imprimir relatório"
              className="ml-auto inline-flex h-9 items-center rounded-xl border border-slate-300 px-3 py-2 text-slate-600 transition cursor-pointer hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer aria-hidden="true" size={16} />
            </button>
          </div>
        }
      >
        {loading ? (
          <p className="mb-5 text-sm text-slate-500">Carregando...</p>
        ) : null}

        {error ? (
          <p className="animate-slide-down mb-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        {!loading && !error && visibleRows.length > 0 ? (
          <div className="mb-5">{summaryContent}</div>
        ) : null}

        <section className="mb-5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setIsFiltersOpen((open) => !open)}
            aria-expanded={isFiltersOpen}
            aria-controls="report-filters-panel"
            className="flex w-full items-center justify-between gap-3 cursor-pointer rounded-2xl px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-slate-700">
              Filtros do relatório
            </span>
            <ChevronDown
              className={`size-4 text-slate-500 transition-transform ${isFiltersOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isFiltersOpen ? (
            <div
              id="report-filters-panel"
              className="animate-slide-down border-t border-slate-200 p-4"
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
                    onChange={(event) => {
                      setFilters((previous) => ({
                        ...previous,
                        query: event.target.value,
                      }));
                      setCurrentPage(1);
                    }}
                    className={`${filterControlClass} pl-9`}
                    placeholder="Modelo, categoria ou motivo"
                  />
                </span>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Modelo
                <NotificationTypeCombobox
                  types={types}
                  value={filters.typeId}
                  onChange={(typeId) => {
                    setFilters((previous) => ({
                      ...previous,
                      typeId,
                    }));
                    setCurrentPage(1);
                  }}
                  emptyOptionLabel="Todos os modelos"
                  placeholder="Buscar modelo"
                  inputClassName={filterControlClass}
                />
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Unidade
                <UnitCombobox
                  units={units}
                  value={filters.unitId}
                  onChange={(unitId) => {
                    setFilters((previous) => ({
                      ...previous,
                      unitId,
                    }));
                    setCurrentPage(1);
                  }}
                  emptyOptionLabel="Todas as unidades"
                  placeholder="Buscar unidade"
                  inputClassName={filterControlClass}
                />
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Categoria
                <select
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setCurrentPage(1);
                  }}
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
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setCurrentPage(1);
                  }}
                  className={filterControlClass}
                >
                  <option value="ativa">Somente ativas</option>
                  <option value="todas">Todas (inclui baixadas)</option>
                </select>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Envio de e-mail
                <select
                  value={emailFilter}
                  onChange={(event) => {
                    setEmailFilter(event.target.value as EmailFilter);
                    setCurrentPage(1);
                  }}
                  className={filterControlClass}
                >
                  <option value="todas">Todos</option>
                  <option value="pendente">E-mail pendente (não enviado)</option>
                  <option value="enviado">E-mail enviado</option>
                </select>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Ocorrências a partir de
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setCurrentPage(1);
                  }}
                  className={filterControlClass}
                />
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Ocorrências até
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setCurrentPage(1);
                  }}
                  className={filterControlClass}
                />
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-slate-600">
                Ordenação
                <select
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value as SortOrder);
                    setCurrentPage(1);
                  }}
                  className={filterControlClass}
                >
                  <option value="newest">Mais recentes primeiro</option>
                  <option value="oldest">Mais antigas primeiro</option>
                </select>
              </label>
            </div>
          </div>
          ) : null}
        </section>

        <section className="mb-5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setIsColumnsOpen((open) => !open)}
            aria-expanded={isColumnsOpen}
            aria-controls="report-columns-panel"
            className="flex w-full items-center justify-between cursor-pointer gap-3 rounded-2xl px-4 py-3 text-left"
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
              className="animate-slide-down border-t border-slate-200 p-4"
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

        {!loading && !error && visibleRows.length === 0 ? (
          <EmptyState
            title="Nenhum resultado"
            description="Ajuste os filtros ou cadastre uma nova notificação."
          />
        ) : null}

        {!loading && !error && visibleRows.length > 0 ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-slate-700 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={allRenderedSelected}
                    onChange={togglePageSelection}
                    className="size-3.5 cursor-pointer accent-slate-900"
                  />
                  <span className="text-xs font-semibold leading-none">
                    Selecionar página ({renderedRows.length})
                  </span>
                </label>
                {visibleRows.length > renderedRows.length ? (
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-slate-700 transition hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisibleSelection}
                      className="size-3.5 cursor-pointer accent-slate-900"
                    />
                    <span className="text-xs font-semibold leading-none">
                      Selecionar todas as filtradas ({visibleRows.length})
                    </span>
                  </label>
                ) : null}
                <p className="text-xs text-slate-500">
                  {renderedRows.length < visibleRows.length
                    ? `Exibindo ${startIndex + 1}–${startIndex + renderedRows.length} de ${visibleRows.length}`
                    : visibleRows.length}{" "}
                  notificaç
                  {visibleRows.length === 1 ? "ão" : "ões"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-500">
                  Itens por página
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none cursor-pointer ring-slate-200 focus:ring"
                  >
                    {pageSizeOptions.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                {topPaginationControls}
              </div>
            </div>

            {selectedNotifications.length > 0 ? (
              <div className="animate-slide-down mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-300 bg-slate-900 px-3.5 py-2 text-white shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold">
                    {selectedNotifications.length} notificação(ões)
                    selecionada(s)
                  </span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="inline-flex h-7 cursor-pointer items-center rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-slate-200 transition hover:bg-slate-700"
                  >
                    <span className="text-xs font-medium leading-none">
                      Limpar seleção
                    </span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openBatchEmailModal}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 text-slate-900 transition hover:bg-slate-100"
                  >
                    <Bell aria-hidden="true" size={13} />
                    <span className="text-xs font-semibold leading-none">
                      Enviar e-mail em lote
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={openBatchBaixaModal}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 text-white transition hover:bg-rose-500"
                  >
                    <ShieldOff aria-hidden="true" size={13} />
                    <span className="text-xs font-semibold leading-none">
                      Dar baixa em lote
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            <ul
              key={`page-${safeCurrentPage}-size-${pageSize}`}
              className="space-y-3"
            >
              {renderedRows.map((row) => {
                const isSelected = selectedSet.has(row.id);
                const emailAlreadySent =
                  row.emailNotificacao || Boolean(row.emailEnviadoEm);

                return (
                  <li key={row.id}>
                    <div
                      className={`animate-slide-down flex items-center gap-3.5 rounded-xl border px-4 py-3 transition md:h-28 ${
                        isSelected
                          ? "border-slate-900 bg-slate-50/90 ring-1 ring-slate-900/10"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <label
                        onClick={(event) => event.stopPropagation()}
                        className="flex shrink-0 cursor-pointer items-center justify-center p-1"
                        title={`Selecionar notificação #${row.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(row.id)}
                          aria-label={`Selecionar notificação #${row.id}`}
                          className="size-5 cursor-pointer rounded accent-slate-900"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => onNavigate(`/notificacoes/${row.id}`)}
                        className="grid h-full min-w-0 flex-1 gap-2 text-left md:grid-cols-[minmax(0,1fr)_220px_160px] md:items-center cursor-pointer"
                      >
                        <div className="flex h-full min-w-0 flex-col justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-bold leading-snug text-slate-900">
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
                            {emailAlreadySent ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                                E-mail enviado
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                                E-mail pendente
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 max-w-2xl text-xs leading-snug text-slate-500">
                            {row.motivo ?? "Sem motivo informado"}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                            Criada por: {getNotificationAuthorLabel(row)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                            Modelo de notificação
                          </p>
                          <p className="line-clamp-2 text-sm text-slate-700">
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
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500">
                Página {safeCurrentPage} de {totalPages}
              </p>
              {paginationControls}
            </div>
          </>
        ) : null}
      </Panel>

      {isBatchBaixaModalOpen ? (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeBatchBaixaModal();
            }
          }}
          className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="animate-slide-down flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Dar baixa em lote
                </h3>
                <p className="text-xs text-slate-500">
                  Esta ação é permanente e manterá o histórico para auditoria.
                </p>
              </div>
              <button
                type="button"
                onClick={closeBatchBaixaModal}
                disabled={isSubmittingBatchBaixa}
                aria-label="Fechar modal"
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>

            {batchBaixaSuccessCount !== null ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-semibold">Baixa em lote concluída!</p>
                  <p className="mt-1">
                    {batchBaixaSuccessCount} notificação(ões) foram marcadas
                    como baixadas com sucesso.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeBatchBaixaModal}
                    className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-slate-500">
                        Ativas (elegíveis)
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {batchBaixaAnalysis.eligible.length}
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-slate-500">Já baixadas</span>
                      <span
                        className={`text-lg font-bold ${
                          batchBaixaAnalysis.alreadyBaixadas.length > 0
                            ? "text-rose-600"
                            : "text-slate-900"
                        }`}
                      >
                        {batchBaixaAnalysis.alreadyBaixadas.length}
                      </span>
                    </div>
                  </div>

                  {batchBaixaAnalysis.alreadyBaixadas.length > 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <p className="font-semibold">
                        Há {batchBaixaAnalysis.alreadyBaixadas.length}{" "}
                        notificação(ões) já baixada(s) na seleção.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIds(
                            batchBaixaAnalysis.eligible.map((item) => item.id),
                          )
                        }
                        className="mt-2 cursor-pointer rounded-lg bg-amber-800 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-700"
                      >
                        Manter apenas ativas ({batchBaixaAnalysis.eligible.length}
                        )
                      </button>
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Notificações selecionadas ({selectedNotifications.length})
                    </p>
                    <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2 text-xs">
                      {selectedNotifications.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                            {item.idUnidade
                              ? (unitMap.get(item.idUnidade) ?? item.idUnidade)
                              : "Sem unidade"}{" "}
                            •{" "}
                            {getNotificationCategoryLabel(item.categoria) ??
                              `#${item.id}`}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              item.status === "ativa"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {item.status === "ativa" ? "Ativa" : "Já baixada"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Motivo da baixa em lote
                    <textarea
                      value={batchBaixaMotivo}
                      onChange={(event) =>
                        setBatchBaixaMotivo(event.target.value)
                      }
                      rows={3}
                      disabled={isSubmittingBatchBaixa}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="Ex.: Baixa realizada em lote após deliberação do conselho."
                    />
                  </label>

                  {batchBaixaError ? (
                    <p className="animate-slide-down rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                      {batchBaixaError}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={closeBatchBaixaModal}
                    disabled={isSubmittingBatchBaixa}
                    className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-slate-300 px-3 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="text-xs font-semibold leading-none">
                      Cancelar
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmBatchBaixa()}
                    disabled={
                      isSubmittingBatchBaixa ||
                      batchBaixaAnalysis.eligible.length === 0 ||
                      batchBaixaAnalysis.alreadyBaixadas.length > 0
                    }
                    className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-rose-600 px-3.5 text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-xs font-semibold leading-none">
                      {isSubmittingBatchBaixa
                        ? "Dando baixa..."
                        : `Confirmar baixa (${batchBaixaAnalysis.eligible.length})`}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {isBatchEmailModalOpen ? (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeBatchEmailModal();
            }
          }}
          className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="animate-slide-down flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Envio de e-mail em lote
                </h3>
                <p className="text-xs text-slate-500">
                  Permitido somente para notificações ativas que ainda não
                  tiveram e-mail enviado.
                </p>
              </div>
              <button
                type="button"
                onClick={closeBatchEmailModal}
                disabled={isSendingBatchEmail}
                aria-label="Fechar modal"
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="block text-slate-500">
                    Prontas para envio (inéditas)
                  </span>
                  <span className="text-lg font-bold text-emerald-700">
                    {batchEmailAnalysis.eligibleItems.length}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="block text-slate-500">
                    Com impedimento no lote
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      batchEmailAnalysis.blockedItems.length > 0
                        ? "text-rose-600"
                        : "text-slate-900"
                    }`}
                  >
                    {batchEmailAnalysis.blockedItems.length}
                  </span>
                </div>
              </div>

              {!isSendingBatchEmail &&
              !batchEmailFinished &&
              batchEmailAnalysis.blockedItems.length > 0 ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <p className="font-semibold">
                    Envio do lote bloqueado: {batchEmailAnalysis.blockedItems.length}{" "}
                    notificação(ões) selecionada(s) não pode(m) ser enviada(s)
                    em lote.
                  </p>
                  <p className="mt-1">
                    O envio em lote é permitido exclusivamente para notificações
                    ativas que nunca tiveram e-mail enviado e possuem e-mail na
                    unidade.
                  </p>
                  {batchEmailAnalysis.eligibleItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIds(
                          batchEmailAnalysis.eligibleItems.map(
                            (item) => item.row.id,
                          ),
                        )
                      }
                      className="mt-2 cursor-pointer rounded-lg bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-600"
                    >
                      Manter na seleção apenas as elegíveis (
                      {batchEmailAnalysis.eligibleItems.length})
                    </button>
                  ) : null}
                </div>
              ) : null}

              {isSendingBatchEmail || batchEmailFinished ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2 font-semibold text-slate-800">
                    <span>
                      {isSendingBatchEmail
                        ? `Enviando e-mail ${batchEmailCurrentIndex} de ${Object.keys(batchEmailItemResults).length}...`
                        : "Processamento do lote finalizado"}
                    </span>
                    <span>
                      {
                        Object.values(batchEmailItemResults).filter(
                          (r) => r.status === "success",
                        ).length
                      }{" "}
                      enviado(s) ·{" "}
                      {
                        Object.values(batchEmailItemResults).filter(
                          (r) => r.status === "error",
                        ).length
                      }{" "}
                      falha(s)
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-slate-900 transition-all"
                      style={{
                        width: `${
                          Object.keys(batchEmailItemResults).length > 0
                            ? Math.round(
                                (batchEmailCurrentIndex /
                                  Object.keys(batchEmailItemResults).length) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Prévia das notificações
                </p>
                <ul className="max-h-60 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2 text-xs">
                  {batchEmailAnalysis.items.map((item) => {
                    const result = batchEmailItemResults[item.row.id];
                    return (
                      <li
                        key={item.row.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-800">
                            {item.row.idUnidade
                              ? (unitMap.get(item.row.idUnidade) ??
                                item.row.idUnidade)
                              : "Sem unidade"}{" "}
                            •{" "}
                            {getNotificationCategoryLabel(item.row.categoria) ??
                              `#${item.row.id}`}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            Destinatário: {item.recipient ?? "Não cadastrado"}
                          </p>
                          {result?.message ? (
                            <p
                              className={`mt-0.5 text-[11px] font-medium ${
                                result.status === "error"
                                  ? "text-rose-600"
                                  : "text-emerald-700"
                              }`}
                            >
                              {result.message}
                            </p>
                          ) : null}
                        </div>

                        {result ? (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              result.status === "success"
                                ? "bg-emerald-100 text-emerald-700"
                                : result.status === "error"
                                  ? "bg-rose-100 text-rose-700"
                                  : result.status === "sending"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {result.status === "success"
                              ? "Enviado"
                              : result.status === "error"
                                ? "Falha"
                                : result.status === "sending"
                                  ? "Enviando..."
                                  : "Na fila"}
                          </span>
                        ) : item.isEligible ? (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                            Elegível
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
                            {item.blockReason}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={closeBatchEmailModal}
                disabled={isSendingBatchEmail}
                className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-slate-300 px-3 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-xs font-semibold leading-none">
                  {batchEmailFinished ? "Fechar" : "Cancelar"}
                </span>
              </button>
              {!batchEmailFinished ? (
                <button
                  type="button"
                  onClick={() => void handleConfirmBatchEmail()}
                  disabled={
                    isSendingBatchEmail || !batchEmailAnalysis.canSendBatch
                  }
                  className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-slate-900 px-3.5 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-xs font-semibold leading-none">
                    {isSendingBatchEmail
                      ? "Enviando e-mails..."
                      : `Confirmar envio em lote (${batchEmailAnalysis.eligibleItems.length})`}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

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
              E-mail:{" "}
              {emailFilter === "enviado"
                ? "Enviados"
                : emailFilter === "pendente"
                  ? "Pendentes"
                  : "Todos"}{" "}
              · {visibleRows.length} registro(s)
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
