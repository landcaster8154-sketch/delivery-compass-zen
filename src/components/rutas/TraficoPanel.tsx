import { Gauge, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  TRAFICO_META,
  fechaTrafico,
  traficoDesactualizado,
  useDum,
  type EstadoTrafico,
} from "@/lib/rutas/dum";

const ORDEN: EstadoTrafico[] = ["fluido", "retencion", "atasco"];

/** Mini-notificación de tráfico para una ruta, basada solo en el último dato guardado. */
export function TraficoBadge({
  ruta,
  grande,
  className,
}: {
  ruta: string;
  grande?: boolean;
  className?: string;
}) {
  const d = useDum();
  const dato = d.trafico[ruta];

  if (!dato) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border bg-elevated px-2.5 py-1 font-semibold text-muted-foreground",
          grande ? "text-lg" : "text-[11px]",
          className,
        )}
      >
        <WifiOff className={grande ? "size-6" : "size-3.5"} />
        Sin dato de tráfico
      </span>
    );
  }

  const meta = TRAFICO_META[dato.estado];
  const viejo = traficoDesactualizado(dato.ts);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 font-bold",
        meta.clase,
        grande ? "text-lg" : "text-[11px]",
        viejo && "opacity-70",
        className,
      )}
    >
      <span className={cn("rounded-full", meta.punto, grande ? "size-3.5" : "size-2")} />
      {meta.label}
      <span className="font-medium opacity-80">
        · {viejo ? "desactualizado " : ""}
        {fechaTrafico(dato.ts)}
      </span>
    </span>
  );
}

/** Panel offline para fijar a mano el estado de tráfico de cada ruta. */
export function TraficoPanel({ rutas }: { rutas: string[] }) {
  const d = useDum();
  if (!rutas.length) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rutas.map((r) => (
        <div
          key={r}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Gauge className="size-4" /> Ruta {r}
          </span>
          <TraficoBadge ruta={r} />
          <div className="ml-auto flex gap-1">
            {ORDEN.map((e) => (
              <button
                key={e}
                onClick={() => d.setTrafico(r, e)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-bold transition-colors",
                  d.trafico[r]?.estado === e
                    ? TRAFICO_META[e].clase
                    : "border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                {TRAFICO_META[e].label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
