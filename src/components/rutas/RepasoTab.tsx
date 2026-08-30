import { Camera, CameraOff, Download, Minus, Plus, RotateCcw, ScanBarcode, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge, Btn, Card, EmptyState, Field, Modal } from "./primitives";
import { cn } from "@/lib/utils";
import { construirRefs, estadoRef, type EstadoRef } from "@/lib/rutas/logic";
import { useRutas } from "@/lib/rutas/store";

const estadoTone: Record<EstadoRef, string> = {
  pending: "border-border",
  partial: "border-l-2 border-l-warning",
  ok: "border-l-2 border-l-success",
  over: "border-l-2 border-l-destructive",
};

export function RepasoTab() {
  const s = useRutas();
  const refs = useMemo(
    () => construirRefs(s.pedidosData, s.baseDatos),
    [s.pedidosData, s.baseDatos],
  );
  const codigos = Object.keys(refs).sort((a, b) => a.localeCompare(b));
  const [q, setQ] = useState("");
  const [manual, setManual] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [aprender, setAprender] = useState<{ raw: string } | null>(null);
  const [aprenderCod, setAprenderCod] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const visibles = codigos.filter(
    (c) => !q || c.includes(q) || refs[c]!.desc.toLowerCase().includes(q.toLowerCase()),
  );
  const listos = codigos.filter(
    (c) => estadoRef(refs[c]!.total, s.repasoCounted[c] || 0) === "ok",
  ).length;

  const registrar = (raw: string) => {
    const limpio = raw.trim();
    if (!limpio) return;
    const mapeado = s.barcodeMap[limpio];
    const codigo = mapeado || codigos.find((c) => c === limpio || limpio.endsWith(c));
    if (!codigo || !refs[codigo]) {
      setAprender({ raw: limpio });
      setAprenderCod("");
      return;
    }
    s.setRepasoCount(codigo, (s.repasoCounted[codigo] || 0) + 1);
    setAviso(`+1 · ${refs[codigo]!.desc}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-elevated/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2">
          <div className="mr-auto flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tabular text-success">{listos}</span>
            <span className="text-xs text-muted-foreground">
              de {codigos.length} referencias completas
            </span>
          </div>
          <Btn
            tone={scanning ? "danger" : "primary"}
            onClick={() => setScanning((v) => !v)}
          >
            {scanning ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
            {scanning ? "Parar cámara" : "Escanear"}
          </Btn>
          <Btn onClick={() => s.resetRepaso(codigos)}>
            <RotateCcw className="size-4" /> Reiniciar
          </Btn>
          <Btn
            onClick={() => {
              const blob = new Blob([JSON.stringify(s.barcodeMap, null, 2)], {
                type: "application/json",
              });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "codigos_barras.json";
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            <Download className="size-4" /> Códigos
          </Btn>
          <Btn onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Importar
          </Btn>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const n = s.importarCodigos(JSON.parse(await f.text()));
                setAviso(`${n} códigos de barras importados.`);
              } catch {
                setAviso("El archivo no es un JSON válido.");
              }
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {scanning && <Scanner onCode={registrar} onError={(m) => setAviso(m)} />}

      <div className="scroll-area flex-1 px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Field
              placeholder="Buscar referencia o descripción…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Field
              placeholder="Introducir código a mano…"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  registrar(manual);
                  setManual("");
                }
              }}
            />
            <Btn
              tone="primary"
              onClick={() => {
                registrar(manual);
                setManual("");
              }}
            >
              <ScanBarcode className="size-4" /> Contar
            </Btn>
          </div>

          {aviso && (
            <p className="mb-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-accent">
              {aviso}
            </p>
          )}

          {!codigos.length ? (
            <EmptyState
              icon={<ScanBarcode className="size-6" />}
              title="No hay pedidos cargados"
              hint="Procesa la hoja de pedidos para generar el repaso de carga."
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibles.map((cod) => {
                const ref = refs[cod]!;
                const got = s.repasoCounted[cod] || 0;
                const est = estadoRef(ref.total, got);
                return (
                  <Card key={cod} className={cn("p-3", estadoTone[est])}>
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => setDetalle(cod)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold">{ref.desc}</p>
                        <p className="font-mono text-[11px] text-subtle">
                          Cód. {cod} · {ref.clientes.length} clientes
                        </p>
                      </button>
                      <Badge
                        tone={
                          est === "ok"
                            ? "success"
                            : est === "over"
                              ? "danger"
                              : est === "partial"
                                ? "warning"
                                : "muted"
                        }
                      >
                        {got}/{ref.total}
                      </Badge>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Btn
                        size="sm"
                        onClick={() => s.setRepasoCount(cod, Math.max(0, got - 1))}
                      >
                        <Minus className="size-3.5" />
                      </Btn>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width]",
                            est === "over" ? "bg-destructive" : "bg-success",
                          )}
                          style={{
                            width: Math.min(100, (got / Math.max(1, ref.total)) * 100) + "%",
                          }}
                        />
                      </div>
                      <Btn size="sm" tone="primary" onClick={() => s.setRepasoCount(cod, got + 1)}>
                        <Plus className="size-3.5" />
                      </Btn>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!detalle}
        onClose={() => setDetalle(null)}
        title="Reparto de la referencia"
        subtitle={detalle ? refs[detalle]?.desc : undefined}
      >
        <ul className="space-y-1.5">
          {(detalle ? refs[detalle]?.clientes || [] : []).map((c, i) => (
            <li
              key={c.nombre + i}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="truncate">{c.nombre}</span>
              <span className="font-mono font-bold tabular text-accent">{c.cajas}</span>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={!!aprender}
        onClose={() => setAprender(null)}
        title="Código desconocido"
        subtitle={aprender?.raw}
      >
        <p className="text-sm text-muted-foreground">
          Asócialo a una referencia del pedido para reconocerlo la próxima vez.
        </p>
        <Field
          label="Código de referencia"
          className="mt-3"
          value={aprenderCod}
          placeholder="Ej: 1043"
          onChange={(e) => setAprenderCod(e.target.value)}
        />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Btn onClick={() => setAprender(null)}>Cancelar</Btn>
          <Btn
            tone="primary"
            onClick={() => {
              const cod = aprenderCod.trim();
              if (aprender && refs[cod]) {
                s.aprenderCodigo(aprender.raw, cod);
                s.setRepasoCount(cod, (s.repasoCounted[cod] || 0) + 1);
                setAviso(`Aprendido: ${aprender.raw} → ${refs[cod]!.desc}`);
                setAprender(null);
              } else {
                setAviso("Ese código no está en el pedido de hoy.");
              }
            }}
          >
            Aprender y contar
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

function Scanner({
  onCode,
  onError,
}: {
  onCode: (raw: string) => void;
  onError: (msg: string) => void;
}) {
  const [id] = useState(() => "scan-" + Math.random().toString(36).slice(2));
  const ultimo = useRef<{ txt: string; t: number }>({ txt: "", t: 0 });

  useEffect(() => {
    let instancia: { stop: () => Promise<void>; clear: () => void } | null = null;
    let cancelado = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const h = new Html5Qrcode(id);
        if (cancelado) return;
        instancia = h as unknown as { stop: () => Promise<void>; clear: () => void };
        await h.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 160 } },
          (txt) => {
            const ahora = Date.now();
            if (ultimo.current.txt === txt && ahora - ultimo.current.t < 1500) return;
            ultimo.current = { txt, t: ahora };
            onCode(txt);
          },
          () => {},
        );
      } catch {
        if (!cancelado) onError("No se pudo abrir la cámara en este dispositivo.");
      }
    })();
    return () => {
      cancelado = true;
      instancia?.stop().then(() => instancia?.clear()).catch(() => {});
    };
  }, [id, onCode, onError]);

  return (
    <div className="border-b border-border bg-black/60 px-4 py-3 sm:px-6">
      <div id={id} className="mx-auto w-full max-w-md overflow-hidden rounded-xl" />
    </div>
  );
}
