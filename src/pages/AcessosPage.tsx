import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";
import { Panel } from "../components/ui/Panel";
import { useAuth } from "../contexts/useAuth";
import { useCondominio } from "../contexts/useCondominio";
import { listUsersAccess, updateUserAccess } from "../services/accessService";
import type { Condominio, UserAccess } from "../types/domain";
import { formatDate, includesQuery } from "../utils/format";

interface AcessosPageProps {
  onNavigate: (to: string) => void;
}

interface UserDraftState {
  nome: string;
  isAdmin: boolean;
  condominioIds: string[];
}

function areArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

interface UserAccessCardProps {
  user: UserAccess;
  condominios: Condominio[];
  isCurrentUser: boolean;
  onSaved: () => Promise<void>;
}

function UserAccessCard({
  user,
  condominios,
  isCurrentUser,
  onSaved,
}: UserAccessCardProps) {
  const [draft, setDraft] = useState<UserDraftState>(() => ({
    nome: user.nome ?? "",
    isAdmin: user.isAdmin,
    condominioIds: user.condominioIds,
  }));
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const isDirty = useMemo(() => {
    const normalizedDraftName = draft.nome.trim();
    const normalizedUserName = (user.nome ?? "").trim();
    return (
      normalizedDraftName !== normalizedUserName ||
      draft.isAdmin !== user.isAdmin ||
      !areArraysEqual(draft.condominioIds, user.condominioIds)
    );
  }, [draft, user]);

  function toggleCondominio(condominioId: string) {
    setFeedback(null);
    setDraft((prev) => {
      const exists = prev.condominioIds.includes(condominioId);
      return {
        ...prev,
        condominioIds: exists
          ? prev.condominioIds.filter((id) => id !== condominioId)
          : [...prev.condominioIds, condominioId],
      };
    });
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);

    try {
      await updateUserAccess({
        userId: user.userId,
        nome: draft.nome.trim() || null,
        isAdmin: draft.isAdmin,
        condominioIds: draft.condominioIds,
      });
      await onSaved();
      setFeedback({
        type: "success",
        message: "Permissões e vínculos atualizados com sucesso.",
      });
    } catch (saveError) {
      setFeedback({
        type: "error",
        message:
          saveError instanceof Error
            ? saveError.message
            : "Não foi possível salvar os acessos deste usuário.",
      });
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = draft.condominioIds.length;

  return (
    <li className="animate-slide-down rounded-2xl border border-slate-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl p-5 text-left transition hover:bg-slate-50/70"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-slate-900">
              {user.email || "Sem e-mail"}
            </p>
            {isCurrentUser ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                Você
              </span>
            ) : null}
            {draft.isAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                <ShieldCheck aria-hidden="true" size={13} />
                Administrador
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  selectedCount === 0
                    ? "bg-rose-100 text-rose-700"
                    : selectedCount === 1
                      ? "bg-teal-100 text-teal-800"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                <UserCheck aria-hidden="true" size={13} />
                {selectedCount === 0
                  ? "Sem condomínio vinculado"
                  : selectedCount === 1
                    ? "Acesso a 1 condomínio"
                    : `Acesso a ${selectedCount} condomínios`}
              </span>
            )}
            {isDirty ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                Não salvo
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Criado em {formatDate(user.createdAt)} ·{" "}
            {user.lastSignInAt
              ? `Último login em ${formatDate(user.lastSignInAt)}`
              : "Nunca realizou login"}
          </p>
        </div>

        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div className="animate-slide-down border-t border-slate-100 px-5 pb-5 pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">
                Nome / Identificação do acesso
              </span>
              <input
                type="text"
                value={draft.nome}
                onChange={(event) => {
                  setFeedback(null);
                  setDraft((prev) => ({ ...prev, nome: event.target.value }));
                }}
                disabled={saving}
                placeholder="Ex.: Portaria Goiabinha, Síndico João..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 transition focus:ring disabled:bg-slate-100"
              />
              <span className="block text-xs text-slate-500">
                Nome gravado nas notificações emitidas por este acesso.
              </span>
            </label>

            <div className="space-y-1 text-sm">
              <span className="block font-medium text-slate-700">
                Tipo de permissão no sistema
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={saving || isCurrentUser}
                  onClick={() => {
                    setFeedback(null);
                    setDraft((prev) => ({ ...prev, isAdmin: false }));
                  }}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    !draft.isAdmin
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Building2 aria-hidden="true" size={15} />
                  Operador por condomínio
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setFeedback(null);
                    setDraft((prev) => ({ ...prev, isAdmin: true }));
                  }}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    draft.isAdmin
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Shield aria-hidden="true" size={15} />
                  Administrador total
                </button>
              </div>
              <span className="block text-xs text-slate-500">
                {isCurrentUser
                  ? "Seu próprio perfil de administrador permanece ativo por segurança."
                  : draft.isAdmin
                    ? "Acessa todos os condomínios e gerencia cadastros e permissões."
                    : "Opera apenas os condomínios selecionados abaixo (sem gerenciar condomínios)."}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">
                Condomínios liberados para este acesso
              </span>
              {!draft.isAdmin && condominios.length > 0 ? (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setFeedback(null);
                      setDraft((prev) => ({
                        ...prev,
                        condominioIds: condominios.map((c) => c.id),
                      }));
                    }}
                    className="cursor-pointer font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  >
                    Marcar todos
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setFeedback(null);
                      setDraft((prev) => ({
                        ...prev,
                        condominioIds: [],
                      }));
                    }}
                    className="cursor-pointer font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  >
                    Desmarcar todos
                  </button>
                </div>
              ) : null}
            </div>

            {draft.isAdmin ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
                Como <strong>Administrador total</strong>, este usuário possui
                acesso automático a todos os {condominios.length} condomínio(s)
                cadastrados.
              </div>
            ) : condominios.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhum condomínio cadastrado ainda.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {condominios.map((condominio) => {
                  const checked = draft.condominioIds.includes(condominio.id);
                  return (
                    <label
                      key={condominio.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition ${
                        checked
                          ? "border-slate-900 bg-slate-900/5 text-slate-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving}
                        onChange={() => toggleCondominio(condominio.id)}
                        className="mt-0.5 size-4 shrink-0 accent-slate-900"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {condominio.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {condominio.location}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div>
              {feedback ? (
                <p
                  className={`text-xs font-medium ${
                    feedback.type === "success"
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {feedback.message}
                </p>
              ) : isDirty ? (
                <p className="text-xs font-medium text-amber-700">
                  Alterações não salvas para este usuário.
                </p>
              ) : (
                <span className="text-xs text-slate-400">
                  Permissões sincronizadas.
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !isDirty}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check aria-hidden="true" size={15} />
              {saving ? "Salvando..." : "Salvar acesso"}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function AcessosPage({ onNavigate }: AcessosPageProps) {
  const { session } = useAuth();
  const { condominios, isAdmin, loadingCondominios, reloadCondominios } =
    useCondominio();
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  async function reloadUsers(resetCards = false) {
    setLoading(true);
    setError(null);
    try {
      const rows = await listUsersAccess();
      setUsers(rows);
      if (resetCards) {
        setRefreshVersion((v) => v + 1);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a lista de acessos.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loadingCondominios || !isAdmin) {
      return;
    }

    let active = true;

    async function loadInitialUsers() {
      try {
        const rows = await listUsersAccess();
        if (!active) return;
        setUsers(rows);
        setError(null);
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar a lista de acessos.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialUsers();

    return () => {
      active = false;
    };
  }, [isAdmin, loadingCondominios]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    return users.filter((u) =>
      includesQuery(`${u.email} ${u.nome ?? ""}`, searchQuery),
    );
  }, [users, searchQuery]);

  if (!loadingCondominios && !isAdmin) {
    return (
      <Panel
        title="Acesso restrito"
        subtitle="Gerenciamento exclusivo para administradores"
      >
        <EmptyState
          title="Você não tem permissão para acessar esta página"
          description="Este acesso é exclusivo para operação do(s) condomínio(s) vinculado(s)."
        />
        <div className="mt-4">
          <button
            type="button"
            onClick={() => onNavigate("/")}
            className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Voltar ao início
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
        <button
          type="button"
          onClick={() => onNavigate("/condominios")}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Building2 aria-hidden="true" size={16} />
          Condomínios
        </button>
        <button
          type="button"
          onClick={() => onNavigate("/acessos")}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition"
        >
          <Users aria-hidden="true" size={16} />
          Acessos por Condomínio
        </button>
      </div>

      <Panel
        title="Acessos por Condomínio"
        subtitle="Defina quais condomínios cada usuário criado pode acessar e operar"
        action={
          <button
            type="button"
            onClick={() => void reloadUsers(true)}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              aria-hidden="true"
              size={14}
              className={loading ? "animate-spin" : ""}
            />
            Atualizar lista
          </button>
        }
      >
        <div className="mb-5">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar usuário por e-mail ou nome de identificação..."
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none ring-slate-200 transition focus:ring"
            />
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando usuários...</p>
        ) : null}

        {error ? (
          <p className="animate-slide-down rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        {!loading && !error && filteredUsers.length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            description="Verifique o termo buscado ou cadastre um novo usuário no painel do Supabase."
          />
        ) : null}

        {!loading && !error && filteredUsers.length > 0 ? (
          <ul className="space-y-4">
            {filteredUsers.map((user) => (
              <UserAccessCard
                key={`${user.userId}-${refreshVersion}`}
                user={user}
                condominios={condominios}
                isCurrentUser={session?.user?.id === user.userId}
                onSaved={async () => {
                  await Promise.all([reloadUsers(false), reloadCondominios()]);
                }}
              />
            ))}
          </ul>
        ) : null}
      </Panel>
    </div>
  );
}
