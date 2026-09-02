import { Copy, Mail, MessageCircle, Send } from "lucide-react";
import { useMemo, useState } from "react";

import { Btn, Card, LinkBtn } from "./primitives";
import {
  calcularLiquidacion,
  construirResumenTexto,
  euro,
  urlExportacion,
} from "@/lib/rutas/logic";
import { useRutas } from "@/lib/rutas/store";
import { useDum } from "@/lib/rutas/dum";
import { cn } from "@/lib/utils";

export function ResumenTab() {
  const s = useRutas();
  const d = useDum();
  const [copiado, setCopiado] = useState(false);
  const liq = useMemo(
    () => calcularLiquidacion(s.pending, s.completed, s.issues),
    [s.pending, s.completed, s.issues],
  );
  const txt = useMemo(
    () => construirResumenTexto(s.pending, s.completed, s.issues),
    [s.pending, s.completed, s.issues],
  );
  const total = s.pending.length + s.completed.length + s.issues.length;
  const ef = total ? ((s.completed.length / total) * 100).toFixed(1) : "0";

  return (
    <div className="scroll-area flex-1 px-4 py-5 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-2">
        <Realizadas />
        <Card className="p-4 sm:p-5">
          <h2 className="font-display text-base font-bold">Resultados del día</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="Total paradas" value={String(total)} />
            <Metric label="Efectividad" value={ef + "%"} tone="text-accent" />
            <Metric label="Entregados" value={String(s.completed.length)} tone="text-success" />
            <Metric label="Incidencias" value={String(s.issues.length)} tone="text-destructive" />
          </div>

          {liq.hayCobros && (
            <div className="mt-5">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Liquidación de cobros
              </h3>
              <div className="space-y-1.5 text-sm">
                <Row label="Obligatorios cobrados" value={euro(liq.obligatorioCobrado)} />
                <Row label="Opcionales cobrados" value={euro(liq.opcionalCobrado)} />
                <Row label="Firmado (no cobrado)" value={euro(liq.firmado)} />
                {liq.pendienteCobro > 0 && (
                  <Row label="Pendiente de ruta" value={euro(liq.pendienteCobro)} />
                )}
                <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 font-bold text-success">
                  <span>Efectivo a llevar</span>
                  <span className="tabular">{euro(liq.totalEfectivo)}</span>
                </div>
              </div>
              {liq.detalleFirmado.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {liq.detalleFirmado.map((c) => (
                    <li key={c.id}>
                      Firmó · {c.nombre} — {euro(c.cobro_monto || 0)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        <Card className="flex flex-col p-4 sm:p-5">
          <h2 className="font-display text-base font-bold">Enviar resumen</h2>
          <pre className="scroll-area mt-3 max-h-72 flex-1 whitespace-pre-wrap rounded-lg border border-border bg-elevated p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {txt}
          </pre>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <LinkBtn href={urlExportacion("whatsapp", txt)} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" /> WhatsApp
            </LinkBtn>
            <LinkBtn href={urlExportacion("telegram", txt)} target="_blank" rel="noreferrer">
              <Send className="size-4" /> Telegram
            </LinkBtn>
            <LinkBtn href={urlExportacion("email", txt)}>
              <Mail className="size-4" /> Correo
            </LinkBtn>
            <Btn
              tone="primary"
              onClick={() => {
                void navigator.clipboard.writeText(txt);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1800);
              }}
            >
              <Copy className="size-4" /> {copiado ? "Copiado" : "Copiar"}
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Realizadas() {
  const s = useRutas();
  const d = useDum();

  const porRuta = useMemo(() => {
    const acc: Record<string, { hechas: number; total: number; cajas: number }> = {};
    [...s.pending, ...s.completed, ...s.issues].forEach((p) => {
      const r = (acc[p.ruta] ||= { hechas: 0, total: 0, cajas: 0 });
      r.total += 1;
      const lineas = s.pedidosData[p.codigo] || [];
      r.cajas += lineas.reduce((n, l) => n + l.cajas, 0);
    });
    s.completed.forEach((p) => {
      const r = (acc[p.ruta] ||= { hechas: 0, total: 0, cajas: 0 });
      r.hechas += 1;
    });
    return Object.entries(acc).sort(([a], [b]) => a.localeCompare(b));
  }, [s.pending, s.completed, s.issues, s.pedidosData]);

  const tiempos = s.completed
    .map((p) => ({ p, ts: d.tiempos[p.id] }))
    .filter((x): x is { p: (typeof s.completed)[number]; ts: number } => !!x.ts)
    .sort((a, b) => a.ts - b.ts);

  const duracionMedia = (() => {
    if (tiempos.length < 2) return null;
    const primero = tiempos[0]!.ts;
    const ultimo = tiempos[tiempos.length - 1]!.ts;
    return Math.round((ultimo - primero) / 60000 / (tiempos.length - 1));
  })();

  return (
    <Card className="p-4 sm:p-5 lg:col-span-2">
      <h2 className="font-display text-base font-bold">Realizadas</h2>
      <p className="text-xs text-muted-foreground">
        Resumen diario calculado con los datos guardados en el dispositivo.
      </p>

      <div className="mt-4 space-y-3">
        {porRuta.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay paradas cargadas.</p>
        ) : (
          porRuta.map(([ruta, r]) => {
            const pct = r.total ? Math.round((r.hechas / r.total) * 100) : 0;
            return (
              <div key={ruta} className="rounded-xl border border-border bg-elevated p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  <span>Ruta {ruta}</span>
                  <span className="text-muted-foreground">
                    {r.hechas}/{r.total} paradas · {r.cajas} paquetes
                  </span>
                  <span className={cn("ml-auto tabular", pct === 100 ? "text-success" : "text-accent")}>
                    {pct}%
                  </span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-success transition-[width] duration-500"
                    style={{ width: pct + "%" }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Entregas registradas" value={String(tiempos.length)} />
        <Metric
          label="Min./parada"
          value={duracionMedia !== null ? String(duracionMedia) : "—"}
          tone="text-accent"
        />
        <Metric
          label="Última entrega"
          value={
            tiempos.length
              ? new Date(tiempos[tiempos.length - 1]!.ts).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
        />
      </div>

      {tiempos.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {tiempos
            .slice(-8)
            .reverse()
            .map(({ p, ts }) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{p.nombre}</span>
                <span className="tabular">
                  {new Date(ts).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
        </ul>
      )}
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-elevated px-3 py-3 text-center">
      <div className={"font-display text-2xl font-bold tabular " + (tone || "")}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
        {label}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-elevated px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular">{value}</span>
    </div>
  );
}
