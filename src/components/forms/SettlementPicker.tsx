"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/Field";

export type SettlementOption = { id: number; postal_code: string; name: string; county: string | null };

/**
 * Irányítószám / település választó. Két rejtett mezőt ír: `${name}_id` (settlement_id) és `${name}_postal` (irányítószám).
 */
export function SettlementPicker({
  name,
  defaultValue,
  placeholder = "Irányítószám vagy település",
  required,
  id,
}: {
  name: string;
  defaultValue?: SettlementOption | null;
  placeholder?: string;
  required?: boolean;
  id?: string;
}) {
  const [selected, setSelected] = useState<SettlementOption | null>(defaultValue ?? null);
  const [text, setText] = useState(defaultValue ? `${defaultValue.postal_code} ${defaultValue.name}` : "");
  const [options, setOptions] = useState<SettlementOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = text.trim();
    if (selected && text === `${selected.postal_code} ${selected.name}`) return;
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/telepulesek?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = res.ok ? ((await res.json()) as SettlementOption[]) : [];
        setOptions(data);
        setActive(0);
        setOpen(true);
      } catch {
        /* megszakított kérés */
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [text, selected]);

  function choose(option: SettlementOption) {
    setSelected(option);
    setText(`${option.postal_code} ${option.name}`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        required={required}
        onChange={(e) => {
          setText(e.target.value);
          setSelected(null);
          if (e.target.value.trim().length < 2) {
            setOptions([]);
            setOpen(false);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !options.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(options[active]);
          }
        }}
      />
      <input type="hidden" name={`${name}_id`} value={selected?.id ?? ""} />
      <input type="hidden" name={`${name}_postal`} value={selected?.postal_code ?? ""} />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-line bg-white py-1 shadow-lg">
          {options.length === 0 && <li className="px-4 py-3 text-sm text-muted">Nincs találat</li>}
          {options.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              className={`cursor-pointer px-4 py-3 ${i === active ? "bg-soft" : ""}`}
            >
              <span className="font-semibold">{o.postal_code}</span> {o.name}
              {o.county && <span className="ml-1 text-sm text-muted">· {o.county}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
