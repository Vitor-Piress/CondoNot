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
    <div className="min-w-0 space-y-4 print:space-y-2">
      {textoRegimento.map((escopo, escopoIndex) => (
        <div
          key={escopoIndex}
          className="min-w-0 print:ml-3 rounded-xl print:rounded-none print:border-none print:p-0 border border-slate-200 p-4"
        >
          <p className="print:hidden  text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Escopo {escopoIndex + 1}
          </p>
          <h4 className="mt-1 wrap-break-word text-sm font-semibold print:text-base text-slate-900">
            {escopo.titulo || "Sem título"}
          </h4>

          {escopo.paragrafos.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Sem parágrafos cadastrados.
            </p>
          ) : (
            <div className="mt-3 min-w-0 print:mt-1 print:ml-3 space-y-3 print:space-y-1">
              {escopo.paragrafos.map((paragrafo, paragrafoIndex) => (
                <div
                  key={paragrafoIndex}
                  className="min-w-0 rounded-lg print:rounded-none print:bg-transparent print:p-0 bg-slate-50 p-3"
                >
                  <p className="text-xs font-semibold uppercase print:capitalize tracking-widest print:text-base print:text-black text-slate-400">
                    {paragrafo.artigo
                      ? `Art. ${paragrafo.artigo}`
                      : `Parágrafo ${paragrafoIndex + 1}`}
                  </p>
                  <p className="mt-1 print:ml-3 whitespace-pre-wrap wrap-break-word text-sm print:text-base print:text-justify leading-6 print:leading-snug text-slate-700">
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
