import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
} from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { listNotificationsByUnitId } from "../services/notificationService";
import { getUnitById } from "../services/unitService";
import {
  getNotificationCategoryLabel,
  getPersonEmail,
  getPersonName,
  getPersonPhone,
  getUnitLabel,
  type Notification,
  type Unit,
} from "../types/domain";
import { formatDate } from "../utils/format";
import { useCondominio } from "../contexts/useCondominio";

function getNotificationBadgeClass(category: string | null): string {
  const normalizedCategory = category?.toLocaleLowerCase() ?? "";

  if (normalizedCategory.includes("multa")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (normalizedCategory.includes("advert")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-teal-200 bg-teal-50 text-teal-800";
}

interface UnitDetailPageProps {
  unitId: string;
  onNavigate: (to: string) => void;
}

export function UnitDetailPage({ unitId, onNavigate }: UnitDetailPageProps) {
  const { activeCondominioId } = useCondominio();
  const routerNavigate = useNavigate();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    async function loadUnit() {
      if (!activeCondominioId) {
        return;
      }

      try {
        const data = await getUnitById(unitId, activeCondominioId);

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
            : "Não foi possível carregar a unidade.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    async function loadNotifications() {
      if (!activeCondominioId) {
        return;
      }

      setNotificationsLoading(true);
      setNotificationsError(null);
      setNotifications([]);

      try {
        const rows = await listNotificationsByUnitId(
          unitId,
          activeCondominioId,
        );

        if (!active) {
          return;
        }

        setNotifications(rows);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar as notificações da unidade.";
        setNotificationsError(message);
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    }

    void loadUnit();
    void loadNotifications();

    return () => {
      active = false;
    };
  }, [activeCondominioId, unitId]);

  return (
    <Panel
      title="Unidade individual"
      subtitle="Visualização dedicada para cada unidade"
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
          title="Unidade não encontrada"
          description="Confira se o identificador está correto e tente novamente."
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
                {unit.apartamento ?? "Não informado"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Alugado
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {unit.alugado === null
                  ? "Não informado"
                  : unit.alugado
                    ? "Sim"
                    : "Não"}
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
              Proprietário
            </p>
            <div className="mt-1 space-y-1 text-sm leading-7 text-slate-700">
              <p>Nome: {getPersonName(unit.proprietario)}</p>
              <p>Telefone: {getPersonPhone(unit.proprietario)}</p>
              <p>E-mail: {getPersonEmail(unit.proprietario)}</p>
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
                <p>E-mail: {getPersonEmail(unit.inquilino)}</p>
              </div>
            </div>
          ) : null}
        </article>
      ) : null}

      {!loading && !error && unit ? (
        <section className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <BellRing aria-hidden="true" size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  Notificações aplicadas
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Histórico vinculado a esta unidade
                </p>
              </div>
            </div>
            {!notificationsLoading && !notificationsError ? (
              <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-700">
                {notifications.length}
              </span>
            ) : null}
          </div>

          {notificationsLoading ? (
            <p className="text-sm text-slate-500">Carregando notificações...</p>
          ) : null}

          {notificationsError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {notificationsError}
            </p>
          ) : null}

          {!notificationsLoading &&
          !notificationsError &&
          notifications.length === 0 ? (
            <EmptyState
              title="Nenhuma notificação vinculada"
              description="As notificações registradas para esta unidade aparecerão aqui."
            />
          ) : null}

          {!notificationsLoading &&
          !notificationsError &&
          notifications.length > 0 ? (
            <ul className="space-y-2.5">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() =>
                      routerNavigate(`/notificacoes/${notification.id}`, {
                        state: { fromUnitId: unitId },
                      })
                    }
                    className="group grid w-full grid-cols-1 gap-y-2.5 rounded-lg border border-slate-200 bg-white p-3.5 text-left transition hover:border-teal-300 hover:bg-teal-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:grid-cols-[minmax(0,1fr)_auto_1rem] sm:items-center sm:gap-x-5 sm:gap-y-0 sm:p-4"
                  >
                    <span className="col-start-1 row-start-1 flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition group-hover:bg-teal-100 group-hover:text-teal-800">
                        <BellRing aria-hidden="true" size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-slate-900">
                            {notification.motivo ??
                              `Notificação #${notification.id}`}
                          </span>
                          <span
                            className={`inline-flex max-w-full rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getNotificationBadgeClass(notification.categoria)}`}
                          >
                            {getNotificationCategoryLabel(
                              notification.categoria,
                            ) ?? "Notificação"}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          Registro #{notification.id}
                        </span>
                      </span>
                    </span>
                    <span className="col-start-1 row-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-11 text-xs text-slate-500 sm:col-start-2 sm:row-start-1 sm:flex-col sm:items-start sm:gap-1.5 sm:pl-0">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays
                          aria-hidden="true"
                          className="shrink-0 text-slate-400"
                          size={14}
                        />
                        {formatDate(notification.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CircleDollarSign
                          aria-hidden="true"
                          className="shrink-0 text-slate-400"
                          size={14}
                        />
                        {notification.valorMulta === null
                          ? "Sem multa"
                          : new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(notification.valorMulta)}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="hidden text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700 sm:col-start-3 sm:row-start-1 sm:block"
                      size={17}
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </Panel>
  );
}
