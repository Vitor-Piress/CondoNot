import { BellPlus, Building2, Eye, Layers2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listRecentNotifications } from "../services/notificationService";
import { listNotificationTypes } from "../services/notificationTypeService";
import { listUnits } from "../services/unitService";
import {
  getNotificationCategoryLabel,
  getUnitLabel,
  type Notification,
  type NotificationType,
  type Unit,
} from "../types/domain";
import { formatOnlyDate } from "../utils/format";
import { ActionCard } from "../components/ui/ActionCard";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { useCondominio } from "../contexts/useCondominio";

interface HomePageProps {
  onNavigate: (to: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { activeCondominioId } = useCondominio();
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

      try {
        const [notifications, typeRows, unitRows] = await Promise.all([
          listRecentNotifications(8, activeCondominioId),
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
            : "Não foi possível carregar os registros recentes.";
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
  }, [activeCondominioId]);

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

  function formatHomeUnitLabel(label: string): string {
    return label.replace(/^Unidade\s+/i, "");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <Panel
          title="Centro de ações"
          subtitle="Atalhos para as operações principais"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ActionCard
              title="Inserir notificação"
              description="Cadastro principal de novas notificações"
              icon={BellPlus}
              highlight
              onClick={() => onNavigate("/notificacoes/nova")}
            />

            <ActionCard
              title="Inserir modelo de notificação"
              description="Adicionar novos modelos de notificação"
              icon={Layers2}
              onClick={() => onNavigate("/tipos-notificacao/novo")}
            />

            <ActionCard
              title="Editar unidade"
              description="Abrir fluxo para atualizar unidade"
              icon={Building2}
              onClick={() => onNavigate("/unidades")}
            />

            <ActionCard
              title="Visualizar notificações"
              description="Acessar lista completa com filtros"
              icon={Eye}
              onClick={() => onNavigate("/notificacoes")}
            />
          </div>
        </Panel>
      </div>

      <Panel
        title="Últimas notificações"
        subtitle="Resumo inicial com acesso ao detalhe"
        action={
          <button
            type="button"
            onClick={() => onNavigate("/notificacoes")}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
          >
            Ver tudo
          </button>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <EmptyState
            title="Nenhuma notificação registrada"
            description="Novas notificações aparecerão aqui automaticamente."
          />
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <ul className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(`/notificacoes/${row.id}`)}
                  className="flex w-full items-start justify-between rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {getNotificationCategoryLabel(row.categoria) ??
                        `Notificação #${row.id}`}{" "}
                      {row.idUnidade
                        ? ` • ${formatHomeUnitLabel(unitMap.get(row.idUnidade) ?? row.idUnidade)}`
                        : " • Sem unidade"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {row.motivo ?? "Sem motivo informado"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-slate-400">
                      {typeMap.get(row.idTipoNotificacao) ??
                        `Modelo ${row.idTipoNotificacao}`}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatOnlyDate(row.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
    </div>
  );
}
