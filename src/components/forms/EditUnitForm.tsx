import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useCondominio } from "../../contexts/useCondominio";
import {
  getPersonEmail,
  getPersonName,
  getPersonPhone,
  type ResidentInfo,
} from "../../types/domain";
import { formatPhone } from "../../utils/format";
import { getUnitById, updateUnit } from "../../services/unitService";

const phoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{11}$/.test(value.replace(/\D/g, "")),
    "Informe o telefone no formato (00) 0 0000-0000.",
  );

const editUnitSchema = z.object({
  bloco: z.string().trim().min(1, "Informe o bloco."),
  apartamento: z.string().trim().min(1, "Informe o apartamento."),
  alugado: z.enum(["sim", "nao", "nao_informado"]),
  proprietarioNome: z.string().trim().min(2, "Informe o nome do proprietário."),
  proprietarioContatoTelefone: phoneSchema,
  proprietarioContatoEmail: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Informe um e-mail válido.",
    ),
  inquilinoNome: z.string().trim(),
  inquilinoContatoTelefone: phoneSchema,
  inquilinoContatoEmail: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Informe um e-mail válido.",
    ),
});

type EditUnitValues = z.infer<typeof editUnitSchema>;

interface EditUnitFormProps {
  unitId: string;
  onSuccess: () => void;
}

function toNullableApartment(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableRented(value: EditUnitValues["alugado"]): boolean | null {
  if (value === "sim") {
    return true;
  }

  if (value === "nao") {
    return false;
  }

  return null;
}

function toResidentInfo(input: {
  nome: string;
  contatoTelefone: string;
  contatoEmail: string;
}): ResidentInfo | null {
  const nome = input.nome.trim();

  if (!nome) {
    return null;
  }

  return {
    nome,
    contatoTelefone: input.contatoTelefone.trim() || null,
    contatoEmail: input.contatoEmail.trim() || null,
  };
}

function toFormValue(value: string): string {
  return value === "Não informado" ? "" : value;
}

export function EditUnitForm({ unitId, onSuccess }: EditUnitFormProps) {
  const { activeCondominioId } = useCondominio();
  const [loading, setLoading] = useState(true);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditUnitValues>({
    resolver: zodResolver(editUnitSchema),
    defaultValues: {
      bloco: "",
      apartamento: "",
      alugado: "nao_informado",
      proprietarioNome: "",
      proprietarioContatoTelefone: "",
      proprietarioContatoEmail: "",
      inquilinoNome: "",
      inquilinoContatoTelefone: "",
      inquilinoContatoEmail: "",
    },
  });

  const rentedState = useWatch({
    control,
    name: "alugado",
  });

  useEffect(() => {
    let active = true;

    async function loadUnit() {
      if (!activeCondominioId) {
        return;
      }

      try {
        const unit = await getUnitById(unitId, activeCondominioId);

        if (!active) {
          return;
        }

        if (!unit) {
          setServerMessage("Unidade não encontrada.");
          return;
        }

        reset({
          bloco: unit.bloco,
          apartamento:
            unit.apartamento === null ? "" : String(unit.apartamento),
          alugado:
            unit.alugado === null
              ? "nao_informado"
              : unit.alugado
                ? "sim"
                : "nao",
          proprietarioNome: toFormValue(getPersonName(unit.proprietario)),
          proprietarioContatoTelefone: formatPhone(
            toFormValue(getPersonPhone(unit.proprietario)),
          ),
          proprietarioContatoEmail: toFormValue(
            getPersonEmail(unit.proprietario),
          ),
          inquilinoNome: toFormValue(getPersonName(unit.inquilino)),
          inquilinoContatoTelefone: formatPhone(
            toFormValue(getPersonPhone(unit.inquilino)),
          ),
          inquilinoContatoEmail: toFormValue(getPersonEmail(unit.inquilino)),
        });
      } catch (error) {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a unidade.";
        setServerMessage(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadUnit();

    return () => {
      active = false;
    };
  }, [activeCondominioId, unitId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setServerMessage(null);

    if (!activeCondominioId) {
      setServerMessage("Selecione um condomínio antes de editar a unidade.");
      return;
    }

    try {
      await updateUnit(unitId, activeCondominioId, {
        bloco: values.bloco,
        apartamento: toNullableApartment(values.apartamento),
        alugado: toNullableRented(values.alugado),
        proprietario: toResidentInfo({
          nome: values.proprietarioNome,
          contatoTelefone: values.proprietarioContatoTelefone,
          contatoEmail: values.proprietarioContatoEmail,
        }),
        inquilino:
          values.alugado === "sim"
            ? toResidentInfo({
                nome: values.inquilinoNome,
                contatoTelefone: values.inquilinoContatoTelefone,
                contatoEmail: values.inquilinoContatoEmail,
              })
            : null,
      });
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a unidade.";
      setServerMessage(message);
    }
  });

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando unidade...</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Bloco</span>
          <input
            {...register("bloco")}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
          />
          {errors.bloco ? (
            <p className="text-xs font-medium text-rose-600">
              {errors.bloco.message}
            </p>
          ) : null}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Apartamento</span>
          <input
            type="number"
            min={1}
            step={1}
            {...register("apartamento")}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
          />
          {errors.apartamento ? (
            <p className="text-xs font-medium text-rose-600">
              {errors.apartamento.message}
            </p>
          ) : null}
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Alugado</span>
        <select
          {...register("alugado")}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-200 transition focus:ring"
        >
          <option value="nao_informado">Não informado</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </label>

      <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800">Proprietário</h3>
        <p className="mt-1 text-xs text-slate-500">
          Os campos abaixo serão convertidos automaticamente para JSON no banco.
        </p>

        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Nome</span>
            <input
              {...register("proprietarioNome")}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
            />
            {errors.proprietarioNome ? (
              <p className="text-xs font-medium text-rose-600">
                {errors.proprietarioNome.message}
              </p>
            ) : null}
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">
              Contato por telefone
            </span>
            <input
              {...register("proprietarioContatoTelefone", {
                onChange: (event) => {
                  event.target.value = formatPhone(event.target.value);
                },
              })}
              inputMode="tel"
              maxLength={16}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
              placeholder="(00) 0 0000-0000"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">
              Contato por e-mail
            </span>
            <input
              {...register("proprietarioContatoEmail")}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
              placeholder="nome@email.com"
            />
            {errors.proprietarioContatoEmail ? (
              <p className="text-xs font-medium text-rose-600">
                {errors.proprietarioContatoEmail.message}
              </p>
            ) : null}
          </label>
        </div>
      </section>

      {rentedState === "sim" ? (
        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Inquilino</h3>
          <p className="mt-1 text-xs text-slate-500">
            Como o imóvel está alugado, preencha os dados do inquilino.
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">Nome</span>
              <input
                {...register("inquilinoNome")}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">
                Contato por telefone
              </span>
              <input
                {...register("inquilinoContatoTelefone", {
                  onChange: (event) => {
                    event.target.value = formatPhone(event.target.value);
                  },
                })}
                inputMode="tel"
                maxLength={16}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
                placeholder="(00) 0 0000-0000"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">
                Contato por e-mail
              </span>
              <input
                {...register("inquilinoContatoEmail")}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-slate-200 transition focus:ring"
                placeholder="nome@email.com"
              />
              {errors.inquilinoContatoEmail ? (
                <p className="text-xs font-medium text-rose-600">
                  {errors.inquilinoContatoEmail.message}
                </p>
              ) : null}
            </label>
          </div>
        </section>
      ) : null}

      {serverMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {serverMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Salvando..." : "Salvar unidade"}
      </button>
    </form>
  );
}
