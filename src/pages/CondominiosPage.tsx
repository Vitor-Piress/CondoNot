import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Building2, ImageUp, Trash2 } from "lucide-react";
import { Panel } from "../components/ui/Panel";
import { useCondominio } from "../contexts/useCondominio";
import {
  createCondominio,
  updateCondominio,
} from "../services/condominioService";
import {
  deleteCondominioLogoFromStorage,
  uploadCondominioLogo,
} from "../services/storageService";

function getFormValues(form: HTMLFormElement) {
  const values = new FormData(form);
  return {
    name: String(values.get("name") ?? "").trim(),
    location: String(values.get("location") ?? "").trim(),
    logo_url: String(values.get("logo_url") ?? "").trim() || null,
  };
}

export function CondominiosPage() {
  const {
    condominios,
    activeCondominio,
    activeCondominioId,
    loadingCondominios,
    reloadCondominios,
  } = useCondominio();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);
    setLogoPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const created = await createCondominio(getFormValues(form));
      await reloadCondominios(created.id);
      form.reset();
      setMessage("Condomínio cadastrado e selecionado.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível cadastrar o condomínio.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeCondominioId) {
      return;
    }

    const previousLogoUrl = activeCondominio?.logo_url ?? null;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const formValues = getFormValues(event.currentTarget);
      let uploadedLogo: { publicUrl: string; path: string } | null = null;

      if (logoFile) {
        uploadedLogo = await uploadCondominioLogo(activeCondominioId, logoFile);
      }

      try {
        await updateCondominio(activeCondominioId, {
          name: formValues.name,
          location: formValues.location,
          ...(uploadedLogo ? { logo_url: uploadedLogo.publicUrl } : {}),
        });
      } catch (updateError) {
        if (uploadedLogo) {
          await deleteCondominioLogoFromStorage(uploadedLogo.publicUrl).catch(
            () => undefined,
          );
        }
        throw updateError;
      }

      if (uploadedLogo) {
        await deleteCondominioLogoFromStorage(previousLogoUrl).catch(
          () => undefined,
        );
      }

      setLogoFile(null);
      setLogoPreviewUrl(null);
      await reloadCondominios(activeCondominioId);
      setMessage("Dados do condomínio atualizados.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível atualizar o condomínio.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveLogo() {
    if (!activeCondominioId || !activeCondominio?.logo_url) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await updateCondominio(activeCondominioId, { logo_url: null });
      await deleteCondominioLogoFromStorage(activeCondominio.logo_url).catch(
        () => undefined,
      );
      setLogoFile(null);
      setLogoPreviewUrl(null);
      await reloadCondominios(activeCondominioId);
      setMessage("Logo removida do condomínio.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Não foi possível remover a logo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Condomínios"
        subtitle="Cadastre e mantenha os dados de cada condomínio"
      >
        {loadingCondominios ? (
          <p className="text-sm text-slate-500">Carregando condomínios...</p>
        ) : condominios.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum condomínio cadastrado. Adicione o primeiro abaixo.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {condominios.map((condominio) => (
              <li
                key={condominio.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Building2
                    aria-hidden="true"
                    className="shrink-0 text-slate-400"
                    size={18}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {condominio.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {condominio.location}
                    </p>
                  </div>
                </div>
                {condominio.id === activeCondominioId ? (
                  <span className="shrink-0 text-xs font-semibold text-emerald-700">
                    Selecionado
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {activeCondominio ? (
        <Panel
          title="Editar condomínio selecionado"
          subtitle={activeCondominio.name}
        >
          <form
            key={activeCondominio.id}
            onSubmit={handleUpdate}
            className="space-y-4"
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">Nome</span>
              <input
                name="name"
                required
                defaultValue={activeCondominio.name}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">Endereço</span>
              <input
                name="location"
                required
                defaultValue={activeCondominio.location}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">
                Logo do condomínio
              </span>
              {logoPreviewUrl || activeCondominio.logo_url ? (
                <img
                  src={logoPreviewUrl ?? activeCondominio.logo_url ?? ""}
                  alt={`Logo de ${activeCondominio.name}`}
                  className="mb-2 h-28 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain p-3"
                />
              ) : (
                <span className="mb-2 flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                  Nenhuma logo cadastrada
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={saving}
                aria-label="Selecionar arquivo de logo"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
              <span className="block text-xs text-slate-500">
                A imagem será enviada ao Storage. Tamanho máximo: 5 MB.
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImageUp aria-hidden="true" size={16} />
                {saving
                  ? logoFile
                    ? "Enviando e salvando..."
                    : "Salvando..."
                  : logoFile
                    ? "Enviar logo e salvar"
                    : "Salvar alterações"}
              </button>
              {activeCondominio.logo_url ? (
                <button
                  type="button"
                  onClick={() => void handleRemoveLogo()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 aria-hidden="true" size={16} />
                  Remover logo
                </button>
              ) : null}
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel
        title="Adicionar condomínio"
        subtitle="O novo condomínio será selecionado após o cadastro"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Nome</span>
            <input
              name="name"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Endereço</span>
            <input
              name="location"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cadastrar condomínio
          </button>
        </form>
      </Panel>

      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
