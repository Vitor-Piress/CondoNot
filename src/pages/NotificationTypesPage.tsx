import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { listNotifications } from "../services/notificationService";
import { listNotificationTypes } from "../services/notificationTypeService";
import { includesQuery } from "../utils/format";
import { formatDate } from "../utils/format";
import type { Notification, NotificationType } from "../types/domain";

interface NotificationTypesPageProps {
  onNavigate: (to: string) => void;
}

export function NotificationTypesPage({
  onNavigate,
}: NotificationTypesPageProps) {
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [typeRows, notificationRows] = await Promise.all([
          listNotificationTypes(),
          listNotifications({ query: "", typeId: "", unitId: "" }),
        ]);

        if (!active) {
          return;
        }

        setTypes(typeRows);
        setNotifications(notificationRows);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar os tipos de notificacao.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const typeUsageMap = useMemo(() => {
    const usage = new Map<string, number>();

    for (const row of notifications) {
      usage.set(
        row.idTipoNotificacao,
        (usage.get(row.idTipoNotificacao) ?? 0) + 1,
      );
    }

    return usage;
  }, [notifications]);

  const filteredTypes = useMemo(
    () =>
      types.filter((type) => {
        const title = type.titulo ?? "";
        const text = type.textoPadrao ?? "";
        return query.trim() === "" || includesQuery(`${title} ${text}`, query);
      }),
    [types, query],
  );

  return (
    <Panel
      title="Relatorio de tipos de notificacao"
      subtitle="Visualizacao dedicada dos tipos cadastrados e sua utilizacao"
      action={
        <button
          type="button"
          onClick={() => onNavigate("/tipos-notificacao/novo")}
          className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-slate-700"
        >
          Inserir tipo_notificacao
        </button>
      }
    >
      <label className="relative mb-5 block">
        <Search
          className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none ring-slate-200 transition focus:ring"
          placeholder="Buscar por titulo ou texto padrao"
        />
      </label>

      {loading ? <p className="text-sm text-slate-500">Carregando...</p> : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && filteredTypes.length === 0 ? (
        <EmptyState
          title="Nenhum tipo encontrado"
          description="Cadastre um tipo novo ou ajuste os filtros de busca."
        />
      ) : null}

      {!loading && !error && filteredTypes.length > 0 ? (
        <ul className="space-y-3">
          {filteredTypes.map((type) => (
            <li key={type.id}>
              <article className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {type.titulo ?? `Tipo ${type.id}`}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {type.textoPadrao ?? "Sem texto padrao"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                      Uso em notificacoes
                    </p>
                    <p className="text-base font-semibold text-slate-700">
                      {typeUsageMap.get(type.id) ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>ID {type.id}</span>
                  <span>Criado em {formatDate(type.createdAt)}</span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
