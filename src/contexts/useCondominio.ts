import { useContext } from "react";
import { CondominioContext } from "./CondominioContext";

export function useCondominio() {
  const context = useContext(CondominioContext);

  if (!context) {
    throw new Error("useCondominio deve ser usado dentro de CondominioProvider.");
  }

  return context;
}