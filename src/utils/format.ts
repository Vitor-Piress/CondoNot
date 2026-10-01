export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatOnlyDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

export function formatOnlyDateInFull(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  const dateFormat = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
  }).format(date);

  return dateFormat.charAt(0).toUpperCase() + dateFormat.slice(1);
}

export function includesQuery(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}
