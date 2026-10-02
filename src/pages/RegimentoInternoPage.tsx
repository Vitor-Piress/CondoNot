import { useEffect, useState, type ChangeEvent } from "react";
import { ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { Panel } from "../components/ui/Panel";
import { useCondominio } from "../contexts/useCondominio";
import { updateCondominio } from "../services/condominioService";
import {
  createCondominioRegimentoSignedUrl,
  deleteCondominioRegimento,
  MAX_REGIMENTO_SIZE_BYTES,
  uploadCondominioRegimento,
} from "../services/storageService";

interface SignedDocument {
  path: string;
  url: string;
}

interface PreviewError {
  path: string;
  message: string;
}

function formatFileSize(sizeBytes: number | null | undefined): string {
  if (sizeBytes === null || sizeBytes === undefined)
    return "Tamanho não informado";
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RegimentoInternoPage() {
  const { activeCondominio, activeCondominioId, reloadCondominios } =
    useCondominio();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedDocument, setSignedDocument] = useState<SignedDocument | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<PreviewError | null>(null);

  const documentPath = activeCondominio?.regimento_pdf_path ?? null;
  const previewUrl =
    signedDocument?.path === documentPath ? signedDocument.url : null;
  const currentPreviewError =
    previewError?.path === documentPath ? previewError.message : null;

  useEffect(() => {
    if (!documentPath) return;

    let active = true;
    void createCondominioRegimentoSignedUrl(documentPath)
      .then((url) => {
        if (active) setSignedDocument({ path: documentPath, url });
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setPreviewError({
          path: documentPath,
          message:
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível abrir o PDF.",
        });
      });

    return () => {
      active = false;
    };
  }, [documentPath]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError(null);
    setMessage(null);
  }

  async function handleUpload() {
    if (!activeCondominioId || !file) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    let uploadedPath: string | null = null;

    try {
      uploadedPath = await uploadCondominioRegimento(activeCondominioId, file);
      try {
        await updateCondominio(activeCondominioId, {
          regimento_pdf_path: uploadedPath,
          regimento_pdf_filename: file.name,
          regimento_pdf_uploaded_at: new Date().toISOString(),
          regimento_pdf_size_bytes: file.size,
        });
      } catch (saveError) {
        await deleteCondominioRegimento(uploadedPath).catch(() => undefined);
        throw saveError;
      }

      const previousPath = documentPath;
      if (previousPath && previousPath !== uploadedPath) {
        await deleteCondominioRegimento(previousPath).catch(() => undefined);
      }

      await reloadCondominios(activeCondominioId);
      setFile(null);
      setMessage("Regimento interno enviado e salvo.");
    } catch (uploadError) {
      if (uploadedPath && documentPath !== uploadedPath) {
        await deleteCondominioRegimento(uploadedPath).catch(() => undefined);
      }
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível enviar o regimento interno.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!activeCondominioId || !documentPath) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateCondominio(activeCondominioId, {
        regimento_pdf_path: null,
        regimento_pdf_filename: null,
        regimento_pdf_uploaded_at: null,
        regimento_pdf_size_bytes: null,
      });
      const storageRemoved = await deleteCondominioRegimento(documentPath)
        .then(() => true)
        .catch(() => false);
      await reloadCondominios(activeCondominioId);
      setMessage(
        storageRemoved
          ? "Regimento interno removido."
          : "O vínculo foi removido, mas não foi possível excluir o arquivo do Storage.",
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Não foi possível remover o regimento interno.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Regimento interno"
      subtitle={activeCondominio?.name ?? "Documento do condomínio selecionado"}
    >
      <div className="space-y-5">
        <section className="border-b border-slate-200 pb-5">
          <label className="block space-y-2 text-sm">
            <span className="font-medium text-slate-700">PDF do regimento</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              disabled={saving}
              aria-label="Selecionar PDF do regimento interno"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
            <span className="block text-xs text-slate-500">
              Arquivo PDF de até {MAX_REGIMENTO_SIZE_BYTES / (1024 * 1024)} MB.
              Enviar outro arquivo substitui o atual.
            </span>
          </label>
          {file ? (
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <FileText aria-hidden="true" size={15} />
              {file.name} · {formatFileSize(file.size)}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={saving || !file || !activeCondominioId}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload aria-hidden="true" size={16} />
              {saving ? "Salvando..." : "Enviar regimento"}
            </button>
            {documentPath ? (
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 aria-hidden="true" size={16} />
                Remover PDF
              </button>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p
              role="status"
              className="mt-3 text-sm font-medium text-emerald-700"
            >
              {message}
            </p>
          ) : null}
        </section>

        {documentPath ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileText
                  aria-hidden="true"
                  className="shrink-0 text-slate-500"
                  size={18}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {activeCondominio?.regimento_pdf_filename ??
                      "Regimento.pdf"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(activeCondominio?.regimento_pdf_size_bytes)}
                    {activeCondominio?.regimento_pdf_uploaded_at
                      ? ` · Enviado em ${new Date(
                          activeCondominio.regimento_pdf_uploaded_at,
                        ).toLocaleDateString("pt-BR")}`
                      : ""}
                  </p>
                </div>
              </div>
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <ExternalLink aria-hidden="true" size={16} />
                  Abrir em nova aba
                </a>
              ) : null}
            </div>
            {currentPreviewError ? (
              <p role="alert" className="text-sm text-rose-700">
                {currentPreviewError}
              </p>
            ) : previewUrl ? (
              <iframe
                title="Visualização do regimento interno"
                src={previewUrl}
                className="h-[78vh] min-h-130 w-full rounded-lg border border-slate-200 bg-slate-100"
              />
            ) : (
              <p className="text-sm text-slate-500">Carregando PDF...</p>
            )}
          </section>
        ) : (
          <div className="border-t border-slate-200 pt-5 text-sm text-slate-500">
            Nenhum regimento interno foi enviado para este condomínio.
          </div>
        )}
      </div>
    </Panel>
  );
}
