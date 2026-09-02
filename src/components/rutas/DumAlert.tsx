import { AlertTriangle, ExternalLink, ShieldCheck, Ticket, X } from "lucide-react";

import { Btn } from "./primitives";
import { cn } from "@/lib/utils";
import { useDum } from "@/lib/rutas/dum";

export function DumBadge({ id, className }: { id: string; className?: string }) {
  const d = useDum();
  const activo = d.estadoDum(id) === "activo";
  return (
    <button
      type="button"
      onClick={() => d.setEstadoDum(id, activo ? "cerrado" : "activo")}
      title="Pulsa para cambiar el estado del tique DUM"
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-extrabold uppercase tracking-wide transition-colors",
        activo
          ? "animate-pulse border-warning/60 bg-warning/20 text-warning"
          : "border-success/50 bg-success/15 text-success",
        className,
      )}
    >
      <Ticket className="size-5 shrink-0" />
      {activo ? "Tique DUM Activo" : "DUM cerrado"}
    </button>
  );
}

/**
 * Aviso de altísima visibilidad antes de finalizar una parada.
 * Nunca finaliza la parada por sí solo: solo el botón «Ya lo he cerrado».
 */
export function DumAlertModal({
  open,
  nombre,
  onOmitirYFinalizar,
  onCancelar,
}: {
  open: boolean;
  nombre?: string | undefined;
  onOmitirYFinalizar: () => void;
  onCancelar: () => void;
}) {
  const d = useDum();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border-4 border-warning bg-card shadow-panel">
        <div className="flex items-start gap-3 bg-warning/20 px-5 py-4">
          <AlertTriangle className="size-9 shrink-0 text-warning" />
          <div className="min-w-0">
            <h2 className="text-2xl font-black leading-tight text-warning sm:text-3xl">
              ¡ATENCIÓN! ¿Has cerrado el tique en Madrid DUM 360?
            </h2>
            {nombre ? (
              <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">
                Parada: {nombre}
              </p>
            ) : null}
          </div>
          <button
            onClick={onCancelar}
            aria-label="Cancelar"
            className="ml-auto rounded-xl border border-border p-2 text-muted-foreground hover:bg-secondary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <Btn
            tone="primary"
            onClick={() => d.abrirDum()}
            className="h-24 w-full rounded-2xl text-2xl font-black sm:h-28 sm:text-3xl"
          >
            <ExternalLink className="size-8" /> Ir a cerrar DUM 360
          </Btn>
          <Btn
            tone="success"
            onClick={onOmitirYFinalizar}
            className="h-24 w-full rounded-2xl text-2xl font-black sm:h-28 sm:text-3xl"
          >
            <ShieldCheck className="size-8" /> Ya lo he cerrado / Omitir
          </Btn>
          <Btn
            tone="ghost"
            onClick={onCancelar}
            className="h-14 w-full rounded-2xl text-base font-bold"
          >
            Cancelar — no finalizar la parada
          </Btn>
          <p className="text-center text-xs text-muted-foreground">
            Si el deep link no abre la app, se abrirá {d.dumUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
