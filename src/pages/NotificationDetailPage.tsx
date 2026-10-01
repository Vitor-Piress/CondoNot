import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { useLocation } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { RegimentoView } from "../components/ui/RegimentoView";
import { getNotificationById } from "../services/notificationService";
import { getNotificationTypeById } from "../services/notificationTypeService";
import { getCondominioById } from "../services/condominioService";
import { getUnitById } from "../services/unitService";
import {
  getUnitLabel,
  type Notification,
  type NotificationType,
  type Unit,
  type Condominio,
} from "../types/domain";
import { formatDate, formatOnlyDateInFull } from "../utils/format";

interface NotificationDetailPageProps {
  notificationId: string;
  onNavigate: (to: string) => void;
}

function getSourceUnitId(state: unknown): string | null {
  if (typeof state !== "object" || state === null) {
    return null;
  }

  const sourceUnitId = (state as { fromUnitId?: unknown }).fromUnitId;
  return typeof sourceUnitId === "string" && sourceUnitId.length > 0
    ? sourceUnitId
    : null;
}

export function NotificationDetailPage({
  notificationId,
  onNavigate,
}: NotificationDetailPageProps) {
  const location = useLocation();
  const sourceUnitId = getSourceUnitId(location.state);
  const [row, setRow] = useState<Notification | null>(null);
  const [type, setType] = useState<NotificationType | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [condominio, setCondominio] = useState<Condominio | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRow() {
      try {
        const notification = await getNotificationById(notificationId);

        if (!active) {
          return;
        }

        if (!notification) {
          setRow(null);
          return;
        }

        const [typeRow, unitRow, condominioRow] = await Promise.all([
          getNotificationTypeById(notification.idTipoNotificacao),
          notification.idUnidade
            ? getUnitById(notification.idUnidade)
            : Promise.resolve(null),
          getCondominioById("1"),
        ]);

        if (!active) {
          return;
        }

        setRow(notification);
        setType(typeRow);
        setUnit(unitRow);
        setCondominio(condominioRow);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar a notificacao.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRow();

    return () => {
      active = false;
    };
  }, [notificationId]);

  const typeTitle = type?.titulo ?? `Tipo ${row?.idTipoNotificacao ?? ""}`;

  return (
    <>
      <Panel
        title="Notificacao individual"
        subtitle="Visualizacao completa do registro"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Imprimir notificacao"
              title="Imprimir notificacao"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <Printer aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigate(
                  sourceUnitId ? `/unidades/${sourceUnitId}` : "/notificacoes",
                )
              }
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
            >
              {sourceUnitId ? "Voltar para unidade" : "Voltar para lista"}
            </button>
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Carregando notificacao...</p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        {!loading && !error && !row ? (
          <EmptyState
            title="Notificacao nao encontrada"
            description="Este registro pode ter sido removido ou ainda nao existe."
          />
        ) : null}

        {!loading && !error && row ? (
          <article className="space-y-4 rounded-2xl print:border-none border border-slate-200 p-5">
            <div>
              <p className="print:hidden text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Categoria
              </p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {row.categoria ?? `Notificacao #${row.id}`}
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Tipo de notificacao
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(`/tipos-notificacao/${row.idTipoNotificacao}`)
                  }
                  className="mt-1 text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-600"
                >
                  {typeTitle}
                </button>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Unidade
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {row.idUnidade
                    ? unit
                      ? getUnitLabel(unit)
                      : `Unidade ${row.idUnidade}`
                    : "Sem unidade"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Criada em
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDate(row.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Data retroativa
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {row.dataRetroativa
                    ? formatDate(row.dataRetroativa)
                    : "Nao informada"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Motivo
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {row.motivo ?? "Sem motivo informado."}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Valor da multa
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {row.valorMulta === null ? "Nao informado" : row.valorMulta}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Texto do regimento do tipo
              </p>
              <RegimentoView textoRegimento={type?.textoRegimento ?? null} />
            </div>
          </article>
        ) : null}
      </Panel>
      {/* <ImageUpload></ImageUpload> */}
      {/* Página para impressão: */}
      {!loading && !error && row ? (
        <div className="print:break-inside-avoid print:flex hidden text-lg text-justify leading-tight px-8 flex-col justify-center font-serif">
          <header className="bg-black-900 flex flex-col items-center">
            {condominio?.logo_url ? (
              <img
                className="w-40 mb-8 object-contain"
                src={condominio.logo_url}
                alt={`Logo ${condominio.name}`}
              />
            ) : null}
            <h3 className="text-3xl mb-10 font-semibold tracking-tight text-slate-900 print:underline">
              {row.categoria
                ? `CARTA DE ${row.categoria.toUpperCase()}`
                : `Notificacao #${row.id}`}
            </h3>
            <section className="w-full mb-6 flex justify-between">
              <button
                type="button"
                onClick={() =>
                  onNavigate(`/tipos-notificacao/${row.idTipoNotificacao}`)
                }
                className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-600"
              >
                {typeTitle}
              </button>
              <p className="font-bold">{formatOnlyDateInFull(row.createdAt)}</p>
            </section>
            <section className="w-full">
              <p>
                Ao condômino(a){" "}
                <span className="font-bold underline">
                  da unidade "{unit?.apartamento}" do Bloco "{unit?.bloco}"
                </span>
                , do Condomínio Residencial Villa do Sol, situado na Rua Dom
                Helder Câmara, nº 35, Real Parque, São José/SC.
              </p>
            </section>
          </header>
          <main className="mt-8">
            <header className="main-header">
              <p className="mb-3">Prezado(a) Senhor(a),</p>
              <p>
                Na qualidade de Síndica deste Condomínio, venho{" "}
                <span className="font-bold">adverti-lo</span> por desrespeito às
                normas do <span className="font-bold">Regimento Interno</span>,
                como segue:
              </p>
            </header>
            <section className="statute">
              <RegimentoView textoRegimento={type?.textoRegimento ?? null} />
            </section>
            <section className="reason">
              <p>
                <span className="font-bold underline">
                  Motivo da Notificação:
                </span>{" "}
                {row.motivo ?? "Sem motivo informado"}.
              </p>
            </section>
          </main>
          <p className="mt-5">
            Sendo assim, solicitamos sua intervenção e orientação aos moradores
            de seu apartamento para que esse fato{" "}
            <span className="font-bold underline">não</span> mais se repita, sob
            pena de <span className="font-bold underline">multa</span> por
            desrespeito aos estatutos deste Condomínio.
          </p>
          <footer className="mt-10 flex flex-col items-end print:break-inside-avoid mx-auto">
            <div className="text-center">
              <p>Ana Paula Palmezan</p>
              <p>Síndica</p>
            </div>
          </footer>
        </div>
      ) : null}
    </>
  );
}
