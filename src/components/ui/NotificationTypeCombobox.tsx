import { useEffect, useMemo, useRef, useState } from "react";
import type { NotificationType } from "../../types/domain";

interface NotificationTypeComboboxProps {
  types: NotificationType[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyOptionLabel?: string;
  inputClassName?: string;
}

function getTypeLabel(type: NotificationType): string {
  return type.titulo ?? `Modelo ${type.id}`;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function getTypeMatchScore(
  type: NotificationType,
  rawQuery: string,
): number | null {
  const cleanQuery = normalizeText(rawQuery);
  if (!cleanQuery) {
    return 0;
  }

  const label = normalizeText(getTypeLabel(type));

  if (label === cleanQuery) {
    return 1;
  }

  if (label.startsWith(cleanQuery)) {
    return 2;
  }

  const words = label.split(/[\s-]+/);
  if (words.some((word) => word.startsWith(cleanQuery))) {
    return 3;
  }

  if (label.includes(cleanQuery)) {
    return 4;
  }

  return null;
}

export function NotificationTypeCombobox({
  types,
  value,
  onChange,
  placeholder = "Digite para buscar o modelo",
  disabled = false,
  emptyOptionLabel,
  inputClassName,
}: NotificationTypeComboboxProps) {
  const selectedType = useMemo(
    () => types.find((type) => type.id === value) ?? null,
    [types, value],
  );

  const [query, setQuery] = useState(() =>
    selectedType ? getTypeLabel(selectedType) : "",
  );
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const blurTimeout = useRef<number | null>(null);
  const [previousValue, setPreviousValue] = useState(value);

  if (previousValue !== value) {
    setPreviousValue(value);
    setQuery(selectedType ? getTypeLabel(selectedType) : "");
  }

  useEffect(() => {
    return () => {
      if (blurTimeout.current) {
        window.clearTimeout(blurTimeout.current);
      }
    };
  }, []);

  const filteredTypes = useMemo(() => {
    if (!query.trim()) {
      return types;
    }

    return types
      .map((type, index) => ({
        type,
        index,
        score: getTypeMatchScore(type, query),
      }))
      .filter(
        (item): item is { type: NotificationType; index: number; score: number } =>
          item.score !== null,
      )
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .map((item) => item.type);
  }, [types, query]);

  const safeHighlightedIndex =
    filteredTypes.length > 0
      ? Math.min(highlightedIndex, filteredTypes.length - 1)
      : 0;

  function selectType(typeId: string, label: string) {
    if (blurTimeout.current) {
      window.clearTimeout(blurTimeout.current);
    }

    onChange(typeId);
    setQuery(label);
    setIsOpen(false);
    setHighlightedIndex(0);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            if (filteredTypes.length > 0) {
              setHighlightedIndex((current) =>
                current + 1 < filteredTypes.length ? current + 1 : 0,
              );
            }
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            if (filteredTypes.length > 0) {
              setHighlightedIndex((current) =>
                current - 1 >= 0 ? current - 1 : filteredTypes.length - 1,
              );
            }
            return;
          }

          if (event.key === "Escape") {
            setIsOpen(false);
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            if (!query.trim() && emptyOptionLabel) {
              selectType("", "");
              return;
            }

            const targetType =
              filteredTypes[safeHighlightedIndex] ?? filteredTypes[0];
            if (targetType) {
              selectType(targetType.id, getTypeLabel(targetType));
            }
          }
        }}
        onBlur={() => {
          blurTimeout.current = window.setTimeout(() => {
            setIsOpen(false);
            setQuery(selectedType ? getTypeLabel(selectedType) : "");
          }, 120);
        }}
        className={
          inputClassName ??
          "block h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none ring-slate-200 transition focus:ring disabled:bg-slate-100"
        }
        placeholder={placeholder}
      />

      {isOpen && !disabled ? (
        <ul className="animate-slide-down absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg">
          {emptyOptionLabel ? (
            <li>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectType("", "");
                }}
                className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100"
              >
                {emptyOptionLabel}
              </button>
            </li>
          ) : null}

          {filteredTypes.length === 0 ? (
            <li className="px-3 py-2 text-slate-400">
              Nenhum modelo encontrado
            </li>
          ) : (
            filteredTypes.map((type, index) => {
              const isHighlighted = index === safeHighlightedIndex;
              return (
                <li key={type.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectType(type.id, getTypeLabel(type));
                    }}
                    className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left transition ${
                      isHighlighted
                        ? "bg-slate-100 font-semibold text-slate-900"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {getTypeLabel(type)}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

