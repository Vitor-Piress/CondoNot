import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../contexts/useAuth";

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Entrar</h1>
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          E-mail
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Senha
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </label>
        {error ? (
          <p className="animate-slide-down rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full cursor-pointer rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
