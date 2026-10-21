import { Building2, Mail, Phone, Repeat, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getNotificationById,
  listNotificationsByUnitId,
} from "../../services/notificationService";
import { getNotificationTypeById } from "../../services/notificationTypeService";
import { getUnitById } from "../../services/unitService";
import {
  getPersonEmail,
  getPersonName,
  getPersonPhone,
  getUnitLabel,
  type NotificationType,
  type ResidentInfo,
  type Unit,
} from "../../types/domain";

interface NotificationUnitSidebarCardProps {
  notificationId?: string;
  unitId?: string;
  typeId?: string;
  isDraft?: boolean;
  condominioId: string;
  onNavigate: (to: string) => void;
}

interface LoadedUnitContext {
  unit: Unit | null;
  type: NotificationType | null;
  hasTypeSelected: boolean;
  totalSameTypeCount: number;
  activeSameTypeCount: number;
  cancelledSameTypeCount: number;
}

function ResidentBlock({
  title,
  resident,
}: {
  title: string;
  resident: ResidentInfo | null;
}) {
  return (
    <div className="animate-slide-down rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {title}
      </p>
      <div className="mt-2 space-y-1.5 text-xs text-slate-700">
        <p className="flex items-start gap-2 font-semibold text-slate-900">
          <User
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <span className="min-w-0 wrap-break-word">
            {getPersonName(resident)}
          </span>
        </p>
        <p className="flex items-start gap-2 text-slate-600">
          <Phone
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <span className="min-w-0 wrap-break-word">
            {getPersonPhone(resident)}
          </span>
        </p>
        <p className="flex items-start gap-2 text-slate-600">
          <Mail
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <span className="min-w-0 break-all">{getPersonEmail(resident)}</span>
        </p>
      </div>
    </div>
  );
}

export function NotificationUnitSidebarCard({
  notificationId,
  unitId,
  typeId,
  isDraft = false,
  condominioId,
  onNavigate,
}: NotificationUnitSidebarCardProps) {
  const [data, setData] = useState<LoadedUnitContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUnitContext() {
      setLoading(true);

      try {
        let resolvedUnitId = unitId ?? "";
        let resolvedTypeId = typeId ?? "";

        if (notificationId) {
          const notification = await getNotificationById(
            notificationId,
            condominioId,
          );

          if (!active) {
            return;
          }

          if (!notification || !notification.idUnidade) {
            setData(null);
            return;
          }

          resolvedUnitId = notification.idUnidade;
          resolvedTypeId = notification.idTipoNotificacao;
        }

        if (!resolvedUnitId) {
          setData(null);
          return;
        }

        const [unit, unitNotifications, type] = await Promise.all([
          getUnitById(resolvedUnitId, condominioId),
          listNotificationsByUnitId(resolvedUnitId, condominioId),
          resolvedTypeId
            ? getNotificationTypeById(resolvedTypeId, condominioId)
            : Promise.resolve(null),
        ]);

        if (!active) {
          return;
        }

        const sameTypeNotifications = resolvedTypeId
          ? unitNotifications.filter(
              (item) => item.idTipoNotificacao === resolvedTypeId,
            )
          : [];
        const activeSameTypeCount = sameTypeNotifications.filter(
          (item) => item.status === "ativa",
        ).length;
        const cancelledSameTypeCount = sameTypeNotifications.filter(
          (item) => item.status === "baixada",
        ).length;

        setData({
          unit,
          type,
          hasTypeSelected: Boolean(resolvedTypeId),
          totalSameTypeCount: sameTypeNotifications.length,
          activeSameTypeCount,
          cancelledSameTypeCount,
        });
      } catch {
        if (active) {
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadUnitContext();

    return () => {
      active = false;
    };
  }, [notificationId, unitId, typeId, condominioId]);

  if (loading && (!data?.unit || (unitId && data.unit.id !== unitId))) {
    return (
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs text-slate-500">Carregando dados da unidade...</p>
      </aside>
    );
  }

  if (!data?.unit) {
    return null;
  }

  const {
    unit,
    type,
    hasTypeSelected,
    totalSameTypeCount,
    activeSameTypeCount,
    cancelledSameTypeCount,
  } = data;

  return (
    <aside
      aria-label="Informações da unidade"
      className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Unidade
          </h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
            unit.alugado
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {unit.alugado === null
            ? "Status n/i"
            : unit.alugado
              ? "Alugada"
              : "Própria"}
        </span>
      </div>

      <div
        key={`unit-${unit.id}`}
        className="animate-slide-down rounded-xl border border-slate-200 px-3 py-2.5"
      >
        <button
          type="button"
          onClick={() => onNavigate(`/unidades/${unit.id}`)}
          className="text-left text-base font-bold text-slate-900 underline-offset-4 transition hover:text-slate-700 hover:underline cursor-pointer"
        >
          {getUnitLabel(unit)}
        </button>
        <p className="mt-0.5 text-xs text-slate-500">
          Alugada:{" "}
          <span className="font-medium text-slate-700">
            {unit.alugado === null
              ? "Não informado"
              : unit.alugado
                ? "Sim"
                : "Não"}
          </span>
        </p>
      </div>

      {hasTypeSelected ? (
        <div
          key={`type-${unit.id}-${type?.id ?? "selected-type"}`}
          className="animate-slide-down rounded-xl border border-slate-200 bg-slate-50/60 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <Repeat
                className="h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              {isDraft ? "Reincidência na unidade" : "Incidência na unidade"}
            </span>
            <span
              className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                isDraft && activeSameTypeCount === 0
                  ? "bg-slate-200 text-slate-700"
                  : "bg-slate-900 text-white"
              }`}
            >
              {activeSameTypeCount}
            </span>
          </div>
          <p className="mt-1.5 text-xs font-medium text-slate-800 wrap-break-word">
            {type?.titulo ?? "Mesmo modelo de notificação"}
          </p>
          {isDraft ? (
            <>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {activeSameTypeCount > 0
                  ? `Há reincidência · ${activeSameTypeCount} ativa(s)${
                      cancelledSameTypeCount > 0
                        ? ` e ${cancelledSameTypeCount} baixada(s)`
                        : ""
                    }`
                  : cancelledSameTypeCount > 0
                    ? `Sem ativas · ${cancelledSameTypeCount} baixada(s) anterior(es)`
                    : "Sem reincidência registrada nesta unidade"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Não considera a notificação em emissão.
              </p>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {activeSameTypeCount} ativa(s)
                {cancelledSameTypeCount > 0
                  ? ` · ${cancelledSameTypeCount} baixada(s) (${totalSameTypeCount} no total)`
                  : " registrada(s) nesta unidade"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Já considera a notificação atual.
              </p>
            </>
          )}
        </div>
      ) : null}

      <ResidentBlock
        key={`prop-${unit.id}`}
        title="Proprietário"
        resident={unit.proprietario}
      />

      {unit.alugado ? (
        <ResidentBlock
          key={`inq-${unit.id}`}
          title="Inquilino"
          resident={unit.inquilino}
        />
      ) : null}
    </aside>
  );
}
