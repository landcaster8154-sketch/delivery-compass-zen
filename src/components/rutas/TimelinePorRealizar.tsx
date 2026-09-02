import { Check, Clock, MapPin, Navigation, X } from "lucide-react";

import { DumBadge } from "./DumAlert";
import { TraficoBadge } from "./TraficoPanel";
import { Btn, LinkBtn } from "./primitives";
import { cn } from "@/lib/utils";
import { FRANJA_META, euro, mapsUrl } from "@/lib/rutas/logic";
import type { Parada } from "@/lib/rutas/types";

/** Vista «Por realizar»: línea temporal de alta legibilidad para cabina. */
export function TimelinePorRealizar({
  paradas,
  onEntregar,
  onIncidencia,
}: {
  paradas: Parada[];
  onEntregar: (p: Parada) => void;
  onIncidencia: (p: Parada) => void;
}) {
  return (
    <ol className="relative space-y-4 border-l-4 border-border pl-4 sm:pl-6">
      {paradas.map((p, i) => (
        <li key={p.id} className="relative">
          <span
            className={cn(
              "absolute -left-[2.05rem] top-4 flex size-10 items-center justify-center rounded-full border-4 border-background font-black tabular sm:-left-[2.55rem]",
              i === 0
                ? "bg-primary text-primary-foreground"
                : "bg-elevated text-muted-foreground",
            )}
          >
            {p.orden}
          </span>
          <article
            className={cn(
              "rounded-2xl border bg-card p-4 shadow-card",
              i === 0 ? "border-primary/60 ring-2 ring-primary/25" : "border-border",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {i === 0 && (
                <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-black uppercase tracking-wider text-primary-foreground">
                  Siguiente
                </span>
              )}
              <span className="text-sm font-bold text-muted-foreground">R{p.ruta}</span>
              <span className="text-sm font-bold text-muted-foreground">
                {FRANJA_META[p.franja].label}
              </span>
              <TraficoBadge ruta={p.ruta} />
            </div>

            <h3 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">
              {p.nombre}
            </h3>
            {p.direccion ? (
              <p className="mt-1 flex items-start gap-2 text-lg text-muted-foreground">
                <MapPin className="mt-1 size-5 shrink-0" /> {p.direccion}
              </p>
            ) : null}
            {p.horario ? (
              <p className="mt-1 flex items-center gap-2 text-lg font-bold text-warning">
                <Clock className="size-5" /> {p.horario}
              </p>
            ) : null}
            {p.cobro_monto ? (
              <p className="mt-1 text-lg font-black text-destructive">
                Cobrar {euro(p.cobro_monto)}
                {p.cobro_obligatorio ? " (obligatorio)" : " (o firma)"}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DumBadge id={p.id} />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Btn
                tone="success"
                onClick={() => onEntregar(p)}
                className="h-16 rounded-2xl text-xl font-black sm:col-span-1"
              >
                <Check className="size-7" /> Entregado
              </Btn>
              <LinkBtn
                href={mapsUrl(p.direccion)}
                target="_blank"
                rel="noreferrer"
                className="h-16 rounded-2xl text-lg font-bold"
              >
                <Navigation className="size-6" /> Navegar
              </LinkBtn>
              <Btn
                tone="danger"
                onClick={() => onIncidencia(p)}
                className="h-16 rounded-2xl text-lg font-bold"
              >
                <X className="size-6" /> Incidencia
              </Btn>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
