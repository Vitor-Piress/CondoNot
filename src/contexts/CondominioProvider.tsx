import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { checkIsAdmin } from "../services/accessService";
import { getCondominios } from "../services/condominioService";
import { isDemoMode } from "../services/demoMode";
import type { Condominio } from "../types/domain";
import { CondominioContext } from "./CondominioContext";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "condonoti.activeCondominioId";
const DEMO_STORAGE_KEY = "condonoti.demo.activeCondominioId";

function getActiveStorage() {
  if (typeof window === "undefined") return null;
  return isDemoMode() ? window.sessionStorage : window.localStorage;
}

function getStorageKey() {
  return isDemoMode() ? DEMO_STORAGE_KEY : STORAGE_KEY;
}

function getStoredCondominioId(): string | null {
  const storage = getActiveStorage();
  return storage?.getItem(getStorageKey()) ?? null;
}

function setStoredCondominioId(id: string | null): void {
  const storage = getActiveStorage();
  if (!storage) return;
  const key = getStorageKey();
  if (id) {
    storage.setItem(key, id);
  } else {
    storage.removeItem(key);
  }
}

export function CondominioProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? null;
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [activeCondominioId, setActiveCondominioIdState] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingCondominios, setLoadingCondominios] = useState(true);
  const [condominioError, setCondominioError] = useState<string | null>(null);

  async function reloadCondominios(preferredId?: string) {
    setLoadingCondominios(true);
    setCondominioError(null);

    try {
      const [rows, adminStatus] = await Promise.all([
        getCondominios(),
        checkIsAdmin(),
      ]);
      setCondominios(rows);
      setIsAdmin(adminStatus);

      const savedId = getStoredCondominioId();
      const nextId = [preferredId, savedId, activeCondominioId].find(
        (candidate) => rows.some((condominio) => condominio.id === candidate),
      ) ?? rows[0]?.id ?? null;

      setActiveCondominioIdState(nextId);
      setStoredCondominioId(nextId);
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
    setStoredCondominioId(id);
  }

  useEffect(() => {
    let active = true;

    async function loadInitialCondominios() {
      setLoadingCondominios(true);
      setCondominioError(null);
      try {
        const [rows, adminStatus] = await Promise.all([
          getCondominios(),
          checkIsAdmin(),
        ]);
        if (!active) return;

        setCondominios(rows);
        setIsAdmin(adminStatus);
        const savedId = getStoredCondominioId();
        const nextId = savedId && rows.some((row) => row.id === savedId)
          ? savedId
          : rows[0]?.id ?? null;
        setActiveCondominioIdState(nextId);
        setStoredCondominioId(nextId);
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
  }, [currentUserId]);

  const activeCondominio =
    condominios.find((condominio) => condominio.id === activeCondominioId) ??
    null;

  return (
    <CondominioContext.Provider
      value={{
        condominios,
        activeCondominioId,
        activeCondominio,
        isAdmin,
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