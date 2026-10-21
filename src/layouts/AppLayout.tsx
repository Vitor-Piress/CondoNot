import { Building2, KeyRound, Loader2, LogOut, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { PropsWithChildren } from "react";
import { useMatch } from "react-router-dom";
import { NotificationUnitSidebarCard } from "../components/ui/NotificationUnitSidebarCard";
import { SidebarNav } from "../components/ui/SidebarNav";
import { useCondominio } from "../contexts/useCondominio";
import { useAuth } from "../contexts/useAuth";

const CONDOMINIO_SWITCH_FEEDBACK_MS = 600;

interface AppLayoutProps extends PropsWithChildren {
  currentPath: string;
  onNavigate: (to: string) => void;
  supabaseConfigError: string | null;
  draftNotificationSelection?: { unitId: string; typeId: string };
}

export function AppLayout({
  currentPath,
  onNavigate,
  supabaseConfigError,
  draftNotificationSelection,
  children,
}: AppLayoutProps) {
  const {
    condominios,
    activeCondominioId,
    activeCondominio,
    isAdmin,
    loadingCondominios,
    condominioError,
    setActiveCondominioId,
  } = useCondominio();
  const { session, updatePassword, signOut } = useAuth();
  const [isSwitchingCondominio, setIsSwitchingCondominio] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const notificationDetailMatch = useMatch("/notificacoes/:notificationId");
  const activeNotificationId =
    notificationDetailMatch?.params.notificationId &&
    notificationDetailMatch.params.notificationId !== "nova"
      ? notificationDetailMatch.params.notificationId
      : null;

  function handleCondominioChange(id: string) {
    setActiveCondominioId(id);
    onNavigate("/");
    setIsSwitchingCondominio(true);
    window.setTimeout(
      () => setIsSwitchingCondominio(false),
      CONDOMINIO_SWITCH_FEEDBACK_MS,
    );
  }

  function closePasswordModal() {
    setIsPasswordModalOpen(false);
    setNewPasswordInput("");
    setConfirmPasswordInput("");
    setPasswordError(null);
    setPasswordSuccess(null);
  }

  useEffect(() => {
    if (!isPasswordModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isUpdatingPassword) {
        closePasswordModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPasswordModalOpen, isUpdatingPassword]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPasswordInput.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError("A confirmação de senha não confere.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPasswordInput);
      setNewPasswordInput("");
      setConfirmPasswordInput("");
      setPasswordSuccess("Senha alterada com sucesso!");
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "Não foi possível alterar a senha.",
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  return (
    <div className="app-background flex min-h-screen w-full max-w-full flex-col overflow-x-clip print:min-h-0 print:overflow-visible print:border-0 print:p-0">
      <header className="print:hidden border-b border-black/10 bg-slate-900 px-4 py-3 text-slate-100 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate("/")}
            aria-label="Ir para o início"
            title="Ir para o início"
            className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-white p-1 transition hover:opacity-90"
          >
            <img
              src="https://clkjgwxwjmymqctvnldf.supabase.co/storage/v1/object/public/images-app/uploads/condonot/Gemini_Generated_Image_4qszmx4qszmx4qsz-removebg-preview.png"
              alt="Condonot"
              className="h-full w-auto max-w-36 object-contain"
            />
          </button>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium text-slate-300 sm:flex-none">
              <select
                value={activeCondominioId ?? ""}
                onChange={(event) => handleCondominioChange(event.target.value)}
                disabled={loadingCondominios || condominios.length <= 1}
                aria-label="Selecionar condomínio"
                className="h-9 w-full min-w-0 cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-80 sm:w-auto sm:max-w-60"
              >
                {loadingCondominios ? (
                  <option value="">Carregando...</option>
                ) : condominios.length === 0 ? (
                  <option value="">Sem condomínio</option>
                ) : null}
                {condominios.map((condominio) => (
                  <option key={condominio.id} value={condominio.id}>
                    {condominio.name}
                  </option>
                ))}
              </select>
            </label>
            <span
              className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-white"
              title={activeCondominio?.name ?? "Condomínio selecionado"}
            >
              {activeCondominio?.logo_url ? (
                <img
                  src={activeCondominio.logo_url}
                  alt={`Logo de ${activeCondominio.name}`}
                  className="size-full object-contain p-0.5"
                />
              ) : (
                <Building2
                  aria-hidden="true"
                  className="text-slate-500"
                  size={19}
                />
              )}
            </span>
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate("/condominios")}
                  aria-label="Gerenciar condomínios"
                  title="Gerenciar condomínios"
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-100 transition hover:bg-slate-800"
                >
                  <Building2 aria-hidden="true" size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("/acessos")}
                  aria-label="Gerenciar acessos por condomínio"
                  title="Gerenciar acessos por condomínio"
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-100 transition hover:bg-slate-800"
                >
                  <Users aria-hidden="true" size={17} />
                </button>
              </>
            ) : null}
            {session ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordError(null);
                    setPasswordSuccess(null);
                    setIsPasswordModalOpen(true);
                  }}
                  aria-label="Alterar senha"
                  title="Alterar senha"
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-100 transition hover:bg-slate-800"
                >
                  <KeyRound aria-hidden="true" size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  aria-label="Sair"
                  title="Sair"
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-100 transition hover:bg-slate-800"
                >
                  <LogOut aria-hidden="true" size={17} />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 print:mx-0 print:block print:max-w-none print:px-0 print:py-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <div className="print:hidden space-y-4 lg:sticky lg:top-6 lg:self-start">
          <SidebarNav currentPath={currentPath} onNavigate={onNavigate} />
          {activeNotificationId && activeCondominioId ? (
            <NotificationUnitSidebarCard
              notificationId={activeNotificationId}
              condominioId={activeCondominioId}
              onNavigate={onNavigate}
            />
          ) : currentPath === "/notificacoes/nova" &&
            draftNotificationSelection?.unitId &&
            activeCondominioId ? (
            <NotificationUnitSidebarCard
              unitId={draftNotificationSelection.unitId}
              typeId={draftNotificationSelection.typeId}
              isDraft
              condominioId={activeCondominioId}
              onNavigate={onNavigate}
            />
          ) : null}
        </div>

        <main className="min-w-0 space-y-6 print:w-full print:space-y-0">
          {condominioError ? (
            <section className="animate-slide-down rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {condominioError}
            </section>
          ) : null}
          {supabaseConfigError ? (
            <section className="animate-slide-down rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {supabaseConfigError}. O sistema segue com dados de demonstração
              enquanto o ambiente não é configurado.
            </section>
          ) : null}
          {loadingCondominios &&
          currentPath !== "/condominios" &&
          currentPath !== "/acessos" ? (
            <p className="text-sm text-slate-500">Carregando condomínios...</p>
          ) : !activeCondominioId &&
            currentPath !== "/condominios" &&
            currentPath !== "/acessos" ? (
            <section className="animate-slide-down rounded-xl border border-slate-200 bg-white p-5">
              {isAdmin ? (
                <>
                  <p className="text-sm text-slate-700">
                    Cadastre um condomínio para começar.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate("/condominios")}
                    className="mt-3 cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Gerenciar condomínios
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-700">
                  Seu usuário ainda não possui condomínios vinculados. Solicite
                  a liberação de acesso ao administrador do sistema.
                </p>
              )}
            </section>
          ) : (
            children
          )}
        </main>
      </div>

      <footer className="print:hidden border-t bg-white border-slate-200/80 px-4 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Condonot. Vitor Pires. Todos os direitos
        reservados.
      </footer>

      <footer className="fixed inset-x-0 bottom-[6mm] z-9998 hidden text-center text-[8px] text-slate-400 print:block">
        © {new Date().getFullYear()} Condonot. Vitor Pires. Todos os direitos
        reservados.
      </footer>

      {isSwitchingCondominio ? (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-lg">
            <Loader2 className="animate-spin" aria-hidden="true" size={18} />
            Trocando de condomínio...
          </div>
        </div>
      ) : null}

      {isPasswordModalOpen ? (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget && !isUpdatingPassword) {
              closePasswordModal();
            }
          }}
          className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="animate-slide-down w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Alterar senha
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {session?.user?.email
                ? `Conta conectada: ${session.user.email}`
                : "Defina uma nova senha para o seu acesso."}
            </p>

            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3">
              <label className="block space-y-1 text-sm">
                <span className="font-medium text-slate-700">Nova senha</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPasswordInput}
                  onChange={(event) => {
                    setPasswordError(null);
                    setPasswordSuccess(null);
                    setNewPasswordInput(event.target.value);
                  }}
                  disabled={isUpdatingPassword}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 transition focus:ring disabled:bg-slate-100"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-medium text-slate-700">
                  Confirmar nova senha
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPasswordInput}
                  onChange={(event) => {
                    setPasswordError(null);
                    setPasswordSuccess(null);
                    setConfirmPasswordInput(event.target.value);
                  }}
                  disabled={isUpdatingPassword}
                  placeholder="Repita a nova senha"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 transition focus:ring disabled:bg-slate-100"
                />
              </label>

              {passwordError ? (
                <p className="animate-slide-down text-xs font-medium text-rose-600">
                  {passwordError}
                </p>
              ) : null}

              {passwordSuccess ? (
                <p className="animate-slide-down text-xs font-medium text-emerald-700">
                  {passwordSuccess}
                </p>
              ) : null}

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={isUpdatingPassword}
                  className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passwordSuccess ? "Fechar" : "Cancelar"}
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="cursor-pointer rounded-lg bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdatingPassword ? "Salvando..." : "Salvar nova senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
