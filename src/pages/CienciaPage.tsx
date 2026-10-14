import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import { formatOnlyDateInFull } from "../utils/format";

interface CienciaInfo {
  categoria: string | null;
  createdAt: string;
  cienciaEm: string | null;
  condominio: string | null;
  unidade: string | null;
  tipo: string | null;
}

async function callCiencia(
  token: string,
  action: "info" | "confirm",
): Promise<CienciaInfo> {
  if (!supabase) {
    throw new Error("Serviço indisponível no momento.");
  }

  const { data, error } = await supabase.functions.invoke("confirm-ciencia", {
    body: { token, action },
  });

  if (error || !data || data.error) {
    throw new Error(
      data?.error ?? "Link inválido ou expirado. Verifique o e-mail recebido.",
    );
  }

  return data as CienciaInfo;
}

export function CienciaPage() {
  const { token } = useParams();
  const [info, setInfo] = useState<CienciaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    // Abrir o link só consulta; a ciência exige o clique explícito no botão.
    callCiencia(token, "info")
      .then((result) => active && setInfo(result))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  async function handleConfirm() {
    if (!token) {
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      setInfo(await callCiencia(token, "confirm"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível confirmar.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Confirmação de ciência
        </h1>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Carregando...</p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        {info ? (
          <>
            <dl className="mt-4 space-y-2 text-sm">
              {info.condominio ? (
                <div>
                  <dt className="text-xs uppercase text-slate-400">
                    Condomínio
                  </dt>
                  <dd className="font-medium text-slate-800">
                    {info.condominio}
                  </dd>
                </div>
              ) : null}
              {info.unidade ? (
                <div>
                  <dt className="text-xs uppercase text-slate-400">Unidade</dt>
                  <dd className="font-medium text-slate-800">{info.unidade}</dd>
                </div>
              ) : null}
              {info.tipo ? (
                <div>
                  <dt className="text-xs uppercase text-slate-400">Assunto</dt>
                  <dd className="font-medium text-slate-800">{info.tipo}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs uppercase text-slate-400">Data</dt>
                <dd className="font-medium text-slate-800">
                  {formatOnlyDateInFull(info.createdAt)}
                </dd>
              </div>
            </dl>

            {info.cienciaEm ? (
              <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                Ciência registrada em{" "}
                {new Date(info.cienciaEm).toLocaleString("pt-BR")}. Obrigado.
              </p>
            ) : (
              <>
                <p className="mt-5 text-sm text-slate-600">
                  Ao confirmar, você registra que tomou conhecimento desta
                  notificação. Isso não significa concordância com o conteúdo.
                </p>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {confirming ? "Registrando..." : "Confirmar ciência"}
                </button>
              </>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
