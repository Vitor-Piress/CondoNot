import { useEffect, useMemo, useRef, useState } from "react";
import { getUnitLabel, type Unit } from "../../types/domain";

interface UnitComboboxProps {
  units: Unit[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyOptionLabel?: string;
  inputClassName?: string;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function getUnitShortCode(unit: Unit): string {
  const apt = unit.apartamento === null ? "--" : String(unit.apartamento);
  return `${unit.bloco}-${apt}`;
}

function getUnitMatchScore(unit: Unit, rawQuery: string): number | null {
  const cleanQuery = normalizeText(rawQuery).replace(/^unidade\s*/i, "");
  if (!cleanQuery) {
    return 0;
  }

  const compactQuery = cleanQuery.replace(/[\s-]+/g, "");
  const code = normalizeText(getUnitShortCode(unit));
  const compactCode = code.replace(/[\s-]+/g, "");
  const bloco = normalizeText(unit.bloco);
  const apt = unit.apartamento === null ? "" : String(unit.apartamento);
  const fullLabel = normalizeText(getUnitLabel(unit));

  if (code === cleanQuery || compactCode === compactQuery) {
    return 1;
  }

  if (bloco === cleanQuery) {
    return 2;
  }

  if (code.startsWith(cleanQuery) || compactCode.startsWith(compactQuery)) {
    return 3;
  }

  if (bloco.startsWith(cleanQuery)) {
    return 4;
  }

  if (apt && apt === cleanQuery) {
    return 5;
  }

  if (apt && apt.startsWith(cleanQuery)) {
    return 6;
  }

  if (code.includes(cleanQuery) || compactCode.includes(compactQuery)) {
    return 7;
  }

  if (
    normalizeText(rawQuery).startsWith("unid") &&
    fullLabel.includes(normalizeText(rawQuery))
  ) {
    return 8;
  }

  return null;
}

export function UnitCombobox({
  units,
  value,
  onChange,
  placeholder = "Digite para buscar a unidade",
  disabled = false,
  emptyOptionLabel,
  inputClassName,
}: UnitComboboxProps) {
  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === value) ?? null,
    [units, value],
  );

  const [query, setQuery] = useState(() =>
    selectedUnit ? getUnitLabel(selectedUnit) : "",
  );
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const blurTimeout = useRef<number | null>(null);
  const [previousValue, setPreviousValue] = useState(value);

  if (previousValue !== value) {
    setPreviousValue(value);
    setQuery(selectedUnit ? getUnitLabel(selectedUnit) : "");
  }

  useEffect(() => {
    return () => {
      if (blurTimeout.current) {
        window.clearTimeout(blurTimeout.current);
      }
    };
  }, []);

  const filteredUnits = useMemo(() => {
    if (!query.trim()) {
      return units;
    }

    return units
      .map((unit, index) => ({
        unit,
        index,
        score: getUnitMatchScore(unit, query),
      }))
      .filter(
        (item): item is { unit: Unit; index: number; score: number } =>
          item.score !== null,
      )
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .map((item) => item.unit);
  }, [units, query]);

  const safeHighlightedIndex =
    filteredUnits.length > 0
      ? Math.min(highlightedIndex, filteredUnits.length - 1)
      : 0;

  function selectUnit(unitId: string, label: string) {
    if (blurTimeout.current) {
      window.clearTimeout(blurTimeout.current);
    }

    onChange(unitId);
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
            if (filteredUnits.length > 0) {
              setHighlightedIndex((current) =>
                current + 1 < filteredUnits.length ? current + 1 : 0,
              );
            }
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            if (filteredUnits.length > 0) {
              setHighlightedIndex((current) =>
                current - 1 >= 0 ? current - 1 : filteredUnits.length - 1,
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
              selectUnit("", "");
              return;
            }

            const targetUnit =
              filteredUnits[safeHighlightedIndex] ?? filteredUnits[0];
            if (targetUnit) {
              selectUnit(targetUnit.id, getUnitLabel(targetUnit));
            }
          }
        }}
        onBlur={() => {
          blurTimeout.current = window.setTimeout(() => {
            setIsOpen(false);
            setQuery(selectedUnit ? getUnitLabel(selectedUnit) : "");
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
                  selectUnit("", "");
                }}
                className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100"
              >
                {emptyOptionLabel}
              </button>
            </li>
          ) : null}

          {filteredUnits.length === 0 ? (
            <li className="px-3 py-2 text-slate-400">
              Nenhuma unidade encontrada
            </li>
          ) : (
            filteredUnits.map((unit, index) => {
              const isHighlighted = index === safeHighlightedIndex;
              return (
                <li key={unit.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectUnit(unit.id, getUnitLabel(unit));
                    }}
                    className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left transition ${
                      isHighlighted
                        ? "bg-slate-100 font-semibold text-slate-900"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {getUnitLabel(unit)}
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
