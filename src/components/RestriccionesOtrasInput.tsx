import { useState } from "react";
import { X } from "lucide-react";
import { MAX_RESTRICCIONES_OTRAS } from "@/lib/condiciones";

/** Chip input for up to MAX_RESTRICCIONES_OTRAS free-text dietary restrictions. */
export function RestriccionesOtrasInput({
  value,
  onChange,
  compact,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  compact?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const lleno = value.length >= MAX_RESTRICCIONES_OTRAS;

  function agregar() {
    const t = texto.trim();
    if (!t || lleno) return;
    onChange([...value, t]);
    setTexto("");
  }

  const inputClass = compact
    ? "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
    : "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/40";
  const btnClass = compact
    ? "shrink-0 rounded-lg border border-primary bg-primary-soft px-3 text-sm font-medium text-primary disabled:opacity-40"
    : "shrink-0 rounded-xl border border-primary bg-primary-soft px-4 text-sm font-medium text-primary disabled:opacity-40";

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-3 py-1 text-xs text-primary"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                aria-label={`Quitar ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {lleno ? (
        <p className="text-xs text-muted-foreground">
          Máximo {MAX_RESTRICCIONES_OTRAS} restricciones adicionales.
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
            placeholder="¿Cuál? Ej. Nueces, aguacate…"
            maxLength={60}
            className={inputClass}
          />
          <button type="button" onClick={agregar} disabled={!texto.trim()} className={btnClass}>
            Agregar
          </button>
        </div>
      )}
    </div>
  );
}
