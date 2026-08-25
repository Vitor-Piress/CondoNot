import { useEffect, useMemo, useRef, useState } from "react";
import { getUnitLabel, type Unit } from "../../types/domain";
import { includesQuery } from "../../utils/format";

interface UnitComboboxProps {
  units: Unit[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyOptionLabel?: string;
}

export function UnitCombobox({
  units,
  value,
  onChange,
  placeholder = "Digite para buscar a unidade",
  disabled = false,
  emptyOptionLabel,
}: UnitComboboxProps) {
  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === value) ?? null,
    [units, value],
  );

  const [query, setQuery] = useState(() =>
    selectedUnit ? getUnitLabel(selectedUnit) : "",
  );
  const [isOpen, setIsOpen] = useState(false);
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

    return units.filter((unit) => includesQuery(getUnitLabel(unit), query));
  }, [units, query]);

  function selectUnit(unitId: string, label: string) {
    if (blurTimeout.current) {
      window.clearTimeout(blurTimeout.current);
    }

    onChange(unitId);
    setQuery(label);
    setIsOpen(false);
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
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          blurTimeout.current = window.setTimeout(() => {
            setIsOpen(false);
            setQuery(selectedUnit ? getUnitLabel(selectedUnit) : "");
          }, 120);
        }}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-200 transition focus:ring disabled:bg-slate-100"
        placeholder={placeholder}
      />

      {isOpen && !disabled ? (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg">
          {emptyOptionLabel ? (
            <li>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectUnit("", "");
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-100"
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
            filteredUnits.map((unit) => (
              <li key={unit.id}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectUnit(unit.id, getUnitLabel(unit));
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
                >
                  {getUnitLabel(unit)}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
