import { createContext } from "react";
import type { Condominio } from "../types/domain";

export interface CondominioContextValue {
  condominios: Condominio[];
  activeCondominioId: string | null;
  activeCondominio: Condominio | null;
  loadingCondominios: boolean;
  condominioError: string | null;
  setActiveCondominioId: (id: string) => void;
  reloadCondominios: (preferredId?: string) => Promise<void>;
}

export const CondominioContext =
  createContext<CondominioContextValue | null>(null);
