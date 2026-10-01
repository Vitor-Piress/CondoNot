import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { getCondominios } from "../services/condominioService";
import type { Condominio } from "../types/domain";
import { CondominioContext } from "./CondominioContext";

const STORAGE_KEY = "condonoti.activeCondominioId";

export function CondominioProvider({ children }: PropsWithChildren) {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [activeCondominioId, setActiveCondominioIdState] = useState<string | null>(null);
  const [loadingCondominios, setLoadingCondominios] = useState(true);
  const [condominioError, setCondominioError] = useState<string | null>(null);

  async function reloadCondominios(preferredId?: string) {
    setLoadingCondominios(true);
    setCondominioError(null);

    try {
      const rows = await getCondominios();
      setCondominios(rows);

      const savedId = window.localStorage.getItem(STORAGE_KEY);
      const nextId = [preferredId, savedId, activeCondominioId].find(
        (candidate) => rows.some((condominio) => condominio.id === candidate),
      ) ?? rows[0]?.id ?? null;

      setActiveCondominioIdState(nextId);
      if (nextId) {
        window.localStorage.setItem(STORAGE_KEY, nextId);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      setCondominioError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os condomínios.",
      );
    } finally {
      setLoadingCondominios(false);
    }
  }

  function setActiveCondominioId(id: string) {
    setActiveCondominioIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  useEffect(() => {
    let active = true;

    async function loadInitialCondominios() {
      try {
        const rows = await getCondominios();
        if (!active) return;

        setCondominios(rows);
        const savedId = window.localStorage.getItem(STORAGE_KEY);
        const nextId = savedId && rows.some((row) => row.id === savedId)
          ? savedId
          : rows[0]?.id ?? null;
        setActiveCondominioIdState(nextId);
        if (nextId) {
          window.localStorage.setItem(STORAGE_KEY, nextId);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        if (!active) return;
        setCondominioError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os condomínios.",
        );
      } finally {
        if (active) setLoadingCondominios(false);
      }
    }

    void loadInitialCondominios();
    return () => {
      active = false;
    };
  }, []);

  const activeCondominio =
    condominios.find((condominio) => condominio.id === activeCondominioId) ??
    null;

  return (
    <CondominioContext.Provider
      value={{
        condominios,
        activeCondominioId,
        activeCondominio,
        loadingCondominios,
        condominioError,
        setActiveCondominioId,
        reloadCondominios,
      }}
    >
      {children}
    </CondominioContext.Provider>
  );
}