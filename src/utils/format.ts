export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatOnlyDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

export function formatOnlyDateInFull(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  const dateFormat = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
  }).format(date);

  return dateFormat.charAt(0).toUpperCase() + dateFormat.slice(1);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function includesQuery(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  const ddd = `(${digits.slice(0, 2)}) `;
  if (digits.length <= 6) return `${ddd}${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `${ddd}${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `${ddd}${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}
