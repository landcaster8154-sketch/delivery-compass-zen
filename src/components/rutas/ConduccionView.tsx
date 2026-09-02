import { Check, LogOut, MapPin, Navigation, Phone } from "lucide-react";
import { useState } from "react";

import { DumAlertModal, DumBadge } from "./DumAlert";
import { TraficoBadge } from "./TraficoPanel";
import { Btn, LinkBtn } from "./primitives";
import { mapsUrl } from "@/lib/rutas/logic";
import { useDum } from "@/lib/rutas/dum";
import { useRutas } from "@/lib/rutas/store";

export function ConduccionView({ onSalir }: { onSalir: () => void }) {
  const s = useRutas();
  const d = useDum();
  const [dumAbierto, setDumAbierto] = useState(false);

  const cola = s.pending.filter((p) => s.currentRuta === "all" || p.ruta === s.currentRuta);
  const actual = cola[0];

  const finalizar = () => {
    if (!actual) return;
    d.setEstadoDum(actual.id, "cerrado");
    d.registrarEntrega(actual.id);
    s.marcarEntregado(actual.id, actual.cobro_obligatorio ? true : false);
    setDumAbierto(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border bg-elevated px-4 py-2">
        <span className="text-sm font-black uppercase tracking-[0.2em] text-accent">
          Modo conducción
        </span>
        <span className="ml-auto text-sm font-bold tabular text-muted-foreground">
          {cola.length} pendientes
        </span>
        <Btn tone="danger" size="lg" onClick={onSalir} className="font-bold">
          <LogOut className="size-5" /> Salir
        </Btn>
      </div>

      {!actual ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-4xl font-black">Ruta finalizada</p>
          <Btn tone="primary" size="lg" onClick={onSalir}>
            Volver a la app
          </Btn>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 landscape:flex-row landscape:items-stretch">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 rounded-3xl border border-border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-primary px-3 py-1 text-lg font-black tabular text-primary-foreground">
                #{actual.orden}
              </span>
              <span className="text-lg font-bold text-muted-foreground">R{actual.ruta}</span>
              <TraficoBadge ruta={actual.ruta} grande />
            </div>
            <h2 className="break-words text-4xl font-black leading-tight sm:text-6xl">
              {actual.nombre}
            </h2>
            <p className="flex items-start gap-2 text-2xl font-semibold text-muted-foreground sm:text-3xl">
              <MapPin className="mt-1 size-7 shrink-0" />
              {actual.direccion || "Sin dirección"}
            </p>
            {actual.horario ? (
              <p className="text-2xl font-bold text-warning">Horario: {actual.horario}</p>
            ) : null}
            <DumBadge id={actual.id} className="self-start px-5 py-4 text-xl" />
          </div>

          <div className="flex shrink-0 flex-col gap-3 landscape:w-[38%]">
            <Btn
              tone="success"
              onClick={() => setDumAbierto(true)}
              className="min-h-[45vh] w-full rounded-3xl border-4 text-5xl font-black landscape:min-h-0 landscape:flex-1"
            >
              <Check className="size-14" /> ENTREGADO
            </Btn>
            <div className="grid grid-cols-2 gap-3">
              <LinkBtn
                href={mapsUrl(actual.direccion)}
                target="_blank"
                rel="noreferrer"
                className="h-20 rounded-2xl text-xl font-bold"
              >
                <Navigation className="size-7" /> Navegar
              </LinkBtn>
              {actual.telefono ? (
                <LinkBtn
                  href={`tel:${actual.telefono}`}
                  className="h-20 rounded-2xl text-xl font-bold"
                >
                  <Phone className="size-7" /> Llamar
                </LinkBtn>
              ) : (
                <Btn disabled className="h-20 rounded-2xl text-xl font-bold">
                  <Phone className="size-7" /> Sin tel.
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}

      <DumAlertModal
        open={dumAbierto}
        nombre={actual?.nombre}
        onOmitirYFinalizar={finalizar}
        onCancelar={() => setDumAbierto(false)}
      />
    </div>
  );
}
