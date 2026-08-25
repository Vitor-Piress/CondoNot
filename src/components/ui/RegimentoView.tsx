import type { RegimentoTexto } from "../../types/domain";

interface RegimentoViewProps {
  textoRegimento: RegimentoTexto | null;
}

export function RegimentoView({ textoRegimento }: RegimentoViewProps) {
  if (!textoRegimento || textoRegimento.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Sem texto de regimento cadastrado.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {textoRegimento.map((escopo, escopoIndex) => (
        <div
          key={escopoIndex}
          className="rounded-xl border border-slate-200 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Escopo {escopoIndex + 1}
          </p>
          <h4 className="mt-1 text-sm font-semibold text-slate-900">
            {escopo.titulo || "Sem titulo"}
          </h4>

          {escopo.paragrafos.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Sem paragrafos cadastrados.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {escopo.paragrafos.map((paragrafo, paragrafoIndex) => (
                <div
                  key={paragrafoIndex}
                  className="rounded-lg bg-slate-50 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                    {paragrafo.artigo || `Paragrafo ${paragrafoIndex + 1}`}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {paragrafo.texto}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
