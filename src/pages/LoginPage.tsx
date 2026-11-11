import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../contexts/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
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
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Entrar</h1>
          <img
            src="https://clkjgwxwjmymqctvnldf.supabase.co/storage/v1/object/public/images-app/uploads/condonot/Gemini_Generated_Image_4qszmx4qszmx4qsz-removebg-preview.png"
            alt="Condonot"
            className="h-8 w-auto object-contain"
          />
        </div>

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

        <div className="relative my-4 flex items-center justify-center pt-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-2 text-xs uppercase tracking-wider text-slate-400">
            ou
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate("/demo")}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
          Ver demonstração do sistema
        </button>
      </form>
    </main>
  );
}
