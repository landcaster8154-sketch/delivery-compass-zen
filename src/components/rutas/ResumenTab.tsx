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

export function ResumenTab() {
  const s = useRutas();
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
