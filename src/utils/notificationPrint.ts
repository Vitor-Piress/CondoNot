import { getNotificationCategoryLabel } from "../types/domain";

export type NotificationPrintKind = "warning" | "guidance" | "fine";

export function getNotificationPrintCopy(category: string | null): {
  kind: NotificationPrintKind;
  title: string | null;
} {
  const normalizedCategory = category
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");

  if (normalizedCategory === "multa") {
    return { kind: "fine", title: "AVISO DE MULTA" };
  }

  if (normalizedCategory === "orientacao") {
    return { kind: "guidance", title: "CARTA DE ORIENTAÇÃO" };
  }

  if (normalizedCategory === "advertencia") {
    return { kind: "warning", title: "CARTA DE ADVERTÊNCIA" };
  }

  return {
    kind: "warning",
    title: category
      ? `CARTA DE ${(getNotificationCategoryLabel(category) ?? category).toUpperCase()}`
      : null,
  };
}
