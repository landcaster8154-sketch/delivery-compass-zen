import { AlertTriangle, ExternalLink, MapPinOff, ShieldCheck, Ticket, X } from "lucide-react";

import { Btn } from "./primitives";
import { cn } from "@/lib/utils";
import { useDum } from "@/lib/rutas/dum";

export function DumBadge({ id, className }: { id: string; className?: string }) {
  const d = useDum();
  const requiere = d.requiereDum(id);
  const activo = d.estadoDum(id) === "activo";

  if (!requiere) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted-foreground",
          className,
        )}
        style={{ borderColor: "#2A2F3D", color: "#94A3B8" }}
      >
        <MapPinOff className="size-4 shrink-0" />
        Zona libre / Extrarradio
      </span>
    );
  }

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
      {activo ? "TIQUE DUM ACTIVO" : "DUM cerrado"}
    </button>
  );
}

/** Interruptor táctil grande (>=44px) para marcar si la parada está en zona DUM. */
export function DumSwitch({ id, className }: { id: string; className?: string }) {
  const d = useDum();
  const requiere = d.requiereDum(id);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={requiere}
      aria-label="Zona DUM para esta parada"
      onClick={() => d.setRequiereDum(id, !requiere)}
      className={cn(
        "flex min-h-[3rem] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
        requiere ? "border-warning/50 bg-warning/10" : "border-border bg-card",
        className,
      )}
    >
      <span
        className={cn(
          "relative inline-flex h-11 w-[4.5rem] shrink-0 items-center rounded-full border transition-colors",
          requiere ? "border-warning/60 bg-warning/30" : "border-border bg-elevated",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-9 rounded-full transition-all",
            requiere ? "left-[2rem] bg-warning" : "left-1 bg-muted-foreground",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black uppercase tracking-wide">
          {requiere ? "DUM activado" : "DUM desactivado"}
        </span>
        <span className="block text-xs font-semibold text-muted-foreground">
          {requiere ? "Se pedirá cerrar el tique" : "Zona libre / Extrarradio"}
        </span>
      </span>
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
