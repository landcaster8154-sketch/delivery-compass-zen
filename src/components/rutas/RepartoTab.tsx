import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Columns3,
  Eye,
  FileText,
  GripVertical,
  History,
  Map,
  Package,
  Phone,
  RotateCcw,
  StickyNote,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge, Btn, Card, EmptyState, Field, LinkBtn, Modal, TextArea } from "./primitives";
import { cn } from "@/lib/utils";
import {
  FRANJA_META,
  FRANJA_ORDEN,
  euro,
  mapsUrl,
} from "@/lib/rutas/logic";
import { useRutas } from "@/lib/rutas/store";
import type { Franja, Parada } from "@/lib/rutas/types";

const franjaAccent: Record<Franja, string> = {
  urgente: "text-destructive",
  segunda: "text-warning",
  ultima: "text-muted-foreground",
};
const franjaDot: Record<Franja, string> = {
  urgente: "bg-destructive",
  segunda: "bg-warning",
  ultima: "bg-subtle",
};

export function RepartoTab({ onIrAResumen }: { onIrAResumen: () => void }) {
  const s = useRutas();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [horarioAbierto, setHorarioAbierto] = useState<string | null>(null);
  const [obsAbierta, setObsAbierta] = useState<string | null>(null);
  const [pedidoAbierto, setPedidoAbierto] = useState<Parada | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [obsPanelAbierto, setObsPanelAbierto] = useState(false);
  const [cobroPrompt, setCobroPrompt] = useState<Parada | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const filt = (l: Parada[]) => l.filter((c) => s.currentRuta === "all" || c.ruta === s.currentRuta);
  const fp = filt(s.pending);
  const fd = filt(s.completed);
  const fi = filt(s.issues);
  const total = fp.length + fd.length + fi.length;
  const pct = total > 0 ? (fd.length / total) * 100 : 0;

  const rutas = useMemo(() => {
    const set: string[] = [];
    [...s.pending, ...s.completed, ...s.issues].forEach((c) => {
      if (!set.includes(c.ruta)) set.push(c.ruta);
    });
    return set.sort();
  }, [s.pending, s.completed, s.issues]);

  const entregar = (p: Parada) => {
    if (p.cobro_monto && !p.cobro_obligatorio) {
      setCobroPrompt(p);
      return;
    }
    s.marcarEntregado(p.id);
    setExpanded(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Panel de estado */}
      <div className="border-b border-border bg-elevated/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatCard label="Pendientes" value={fp.length} tone="text-accent" />
            <StatCard label="Entregados" value={fd.length} tone="text-success" />
            <StatCard label="Incidencias" value={fi.length} tone="text-destructive" />
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-success transition-[width] duration-500"
              style={{ width: pct + "%" }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rutas.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1">
                <span className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                  Ruta
                </span>
                {["all", ...rutas].map((r) => (
                  <button
                    key={r}
                    onClick={() => s.setCurrentRuta(r)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                      s.currentRuta === r
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {r === "all" ? "Todas" : r}
                  </button>
                ))}
              </div>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                {(
                  [
                    ["normal", Eye, "Cómoda"],
                    ["compact", Columns3, "Compacta"],
                    ["car", Truck, "Coche"],
                  ] as const
                ).map(([v, Icon, label]) => (
                  <button
                    key={v}
                    onClick={() => s.setVista(v)}
                    title={label}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      s.vista === v
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
              <Btn size="sm" onClick={() => setHistorialAbierto(true)}>
                <History className="size-3.5" /> Historial
              </Btn>
              <Btn size="sm" onClick={() => setObsPanelAbierto(true)}>
                <StickyNote className="size-3.5" /> Observaciones
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="scroll-area flex-1 px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          {total === 0 ? (
            <EmptyState
              icon={<FileText className="size-6" />}
              title="Sin ruta para hoy"
              hint="Ve a la pestaña PDF, pega el texto de la hoja de reparto y pulsa «Procesar ruta»."
            />
          ) : fp.length === 0 ? (
            <Card className="mx-auto max-w-md p-8 text-center">
              <div className="mb-3 text-5xl">🎉</div>
              <h2 className="text-xl font-bold">¡Ruta finalizada!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Todos los repartos están gestionados.
              </p>
              <Btn tone="primary" size="lg" className="mt-5 w-full" onClick={onIrAResumen}>
                Ver resumen del día
              </Btn>
            </Card>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
                <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  Siguiente
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {fp[0]!.nombre}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  #{fp[0]!.orden} · R{fp[0]!.ruta}
                </span>
              </div>

              {FRANJA_ORDEN.map((franja) => {
                const items = fp.filter((c) => c.franja === franja);
                const meta = FRANJA_META[franja];
                return (
                  <section key={franja} className="mb-6">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIdx !== null) s.moverAFranja(dragIdx, franja);
                        setDragIdx(null);
                      }}
                      className="mb-2.5 flex items-center gap-2"
                    >
                      <span className={cn("size-2 rounded-full", franjaDot[franja])} />
                      <h2
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-[0.14em]",
                          franjaAccent[franja],
                        )}
                      >
                        {meta.label}
                      </h2>
                      <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-bold tabular text-muted-foreground">
                        {items.length}
                      </span>
                      <div className="ml-2 h-px flex-1 bg-border" />
                    </div>

                    {items.length === 0 ? (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIdx !== null) s.moverAFranja(dragIdx, franja);
                          setDragIdx(null);
                        }}
                        className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-subtle"
                      >
                        Sin clientes — suelta aquí una tarjeta para moverla a esta franja
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "grid gap-2.5",
                          s.vista === "normal" && "sm:grid-cols-2 xl:grid-cols-3",
                          s.vista === "compact" && "sm:grid-cols-2 xl:grid-cols-4",
                        )}
                      >
                        {items.map((c) => (
                          <ParadaCard
                            key={c.id}
                            parada={c}
                            expandida={expanded === c.id}
                            horarioAbierto={horarioAbierto === c.id}
                            obsAbierta={obsAbierta === c.id}
                            onToggle={() =>
                              setExpanded((prev) => (prev === c.id ? null : c.id))
                            }
                            onEntregar={() => entregar(c)}
                            onIncidencia={() => {
                              s.marcarIncidencia(c.id);
                              setExpanded(null);
                            }}
                            onPedido={() => setPedidoAbierto(c)}
                            onToggleHorario={() =>
                              setHorarioAbierto((p) => (p === c.id ? null : c.id))
                            }
                            onToggleObs={() => setObsAbierta((p) => (p === c.id ? null : c.id))}
                            onCerrarHorario={() => setHorarioAbierto(null)}
                            onCerrarObs={() => setObsAbierta(null)}
                            onDragStart={() => setDragIdx(s.pending.indexOf(c))}
                            onDropOn={() => {
                              if (dragIdx !== null)
                                s.moverParada(dragIdx, s.pending.indexOf(c), c.franja);
                              setDragIdx(null);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Modal cobro opcional */}
      <Modal
        open={!!cobroPrompt}
        onClose={() => setCobroPrompt(null)}
        title="Cobro opcional"
        subtitle={cobroPrompt?.nombre}
      >
        <p className="text-sm text-muted-foreground">
          Importe de{" "}
          <strong className="text-warning">{euro(cobroPrompt?.cobro_monto || 0)}</strong>. ¿Lo has
          cobrado en efectivo o el cliente ha firmado?
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Btn
            tone="success"
            size="lg"
            className="flex-1"
            onClick={() => {
              if (cobroPrompt) s.marcarEntregado(cobroPrompt.id, true);
              setCobroPrompt(null);
              setExpanded(null);
            }}
          >
            Cobrado en efectivo
          </Btn>
          <Btn
            size="lg"
            className="flex-1"
            onClick={() => {
              if (cobroPrompt) s.marcarEntregado(cobroPrompt.id, false);
              setCobroPrompt(null);
              setExpanded(null);
            }}
          >
            Ha firmado (sin cobrar)
          </Btn>
        </div>
      </Modal>

      {/* Modal pedido */}
      <PedidoModal parada={pedidoAbierto} onClose={() => setPedidoAbierto(null)} />

      {/* Historial */}
      <HistorialModal
        open={historialAbierto}
        onClose={() => setHistorialAbierto(false)}
        completed={fd}
        issues={fi}
      />

      {/* Observaciones de pedido */}
      <ObservacionesModal open={obsPanelAbierto} onClose={() => setObsPanelAbierto(false)} />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-center shadow-card">
      <div className={cn("font-display text-2xl font-bold tabular sm:text-3xl", tone)}>
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
        {label}
      </div>
    </div>
  );
}

function ParadaCard({
  parada: c,
  expandida,
  horarioAbierto,
  obsAbierta,
  onToggle,
  onEntregar,
  onIncidencia,
  onPedido,
  onToggleHorario,
  onToggleObs,
  onCerrarHorario,
  onCerrarObs,
  onDragStart,
  onDropOn,
}: {
  parada: Parada;
  expandida: boolean;
  horarioAbierto: boolean;
  obsAbierta: boolean;
  onToggle: () => void;
  onEntregar: () => void;
  onIncidencia: () => void;
  onPedido: () => void;
  onToggleHorario: () => void;
  onToggleObs: () => void;
  onCerrarHorario: () => void;
  onCerrarObs: () => void;
  onDragStart: () => void;
  onDropOn: () => void;
}) {
  const s = useRutas();
  const compact = s.vista === "compact";
  const car = s.vista === "car";
  const obsCliente = s.incidenciasPedido.filter((o) => o.codigo === c.codigo);
  const [horario, setHorario] = useState(c.horario || "");
  const [nota, setNota] = useState(c.nota_hoy || "");
  const [textoObs, setTextoObs] = useState("");
  const [dragOver, setDragOver] = useState(false);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        onDropOn();
      }}
      className={cn(
        "group overflow-hidden rounded-xl border bg-card shadow-card transition-all",
        expandida ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
        dragOver && "border-accent ring-2 ring-accent/40",
        c.sinUbicar && "border-l-2 border-l-warning",
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-3 py-3 text-left"
      >
        <GripVertical className="mt-1 size-4 shrink-0 cursor-grab text-subtle opacity-50 transition-opacity group-hover:opacity-100" />
        <span
          className={cn(
            "shrink-0 rounded-lg border border-border bg-elevated font-mono font-bold tabular text-muted-foreground",
            car ? "px-3 py-2 text-xl" : "px-2 py-1 text-xs",
          )}
        >
          {c.orden}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "flex flex-wrap items-center gap-1.5 font-semibold leading-tight",
              car ? "text-lg" : compact ? "text-[13px]" : "text-sm",
            )}
          >
            <span className="min-w-0 break-words">{c.nombre}</span>
            {c.esNuevo && <Badge tone="warning">Nuevo</Badge>}
            {c.esPrestado && <Badge tone="primary">R{c.rutaCasa}</Badge>}
          </div>
          {!compact && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
              <span>{c.codigo}</span>
              <span className="text-subtle">·</span>
              <span>R{c.ruta}</span>
              {c.horario && (
                <>
                  <span className="text-subtle">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {c.horario}
                  </span>
                </>
              )}
              {obsCliente.length > 0 && (
                <>
                  <span className="text-subtle">·</span>
                  <span className="font-bold text-warning">{obsCliente.length} obs.</span>
                </>
              )}
            </div>
          )}
          {!compact && c.direccion && (
            <p className={cn("mt-1.5 text-muted-foreground", car ? "text-sm" : "text-xs")}>
              {c.direccion}
            </p>
          )}
          {c.nota_entrega && (
            <p className="mt-1.5 rounded-md border border-warning/25 bg-warning/10 px-2 py-1 text-[11px] text-warning">
              {c.nota_entrega}
            </p>
          )}
          {c.nota_hoy && (
            <p className="mt-1.5 rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] text-accent">
              Hoy: {c.nota_hoy}
            </p>
          )}
          {c.cobro_monto ? (
            <p
              className={cn(
                "mt-1.5 rounded-md px-2 py-1 text-[11px] font-bold",
                c.cobro_obligatorio
                  ? "border border-destructive/30 bg-destructive/12 text-destructive"
                  : "border border-warning/25 bg-warning/10 text-warning",
              )}
            >
              {c.cobro_obligatorio
                ? `COBRAR ${euro(c.cobro_monto)} (obligatorio)`
                : `${euro(c.cobro_monto)} opcional (o firma)`}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
            expandida && "rotate-180",
          )}
        />
      </button>

      {expandida && (
        <div className="space-y-2.5 border-t border-border bg-elevated/50 px-3 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Btn tone="success" onClick={onEntregar}>
              <Check className="size-4" /> Entregado
            </Btn>
            <Btn tone="danger" onClick={onIncidencia}>
              <X className="size-4" /> Incidencia
            </Btn>
            <Btn tone="primary" className="bg-primary/15 text-accent" onClick={onToggleHorario}>
              <Clock className="size-4" /> Horario
            </Btn>
            <Btn tone="warning" onClick={onToggleObs}>
              <StickyNote className="size-4" /> Observación
              {obsCliente.length ? ` (${obsCliente.length})` : ""}
            </Btn>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <LinkBtn href={mapsUrl(c.direccion)} target="_blank" rel="noreferrer">
              <Map className="size-4" /> Navegar
            </LinkBtn>
            {c.telefono ? (
              <LinkBtn href={`tel:${c.telefono}`}>
                <Phone className="size-4" /> Llamar
              </LinkBtn>
            ) : (
              <Btn disabled>
                <Phone className="size-4" /> Sin tel.
              </Btn>
            )}
            <Btn onClick={onPedido}>
              <Package className="size-4" /> Pedido
            </Btn>
          </div>

          {horarioAbierto && (
            <div className="space-y-2 rounded-lg border border-border bg-card p-3">
              <Field
                label="Horario de hoy"
                value={horario}
                placeholder="08:00-09:00"
                onChange={(e) => setHorario(e.target.value)}
              />
              <Field
                label="Nota"
                value={nota}
                placeholder="Ej: entrar por la trasera hoy"
                onChange={(e) => setNota(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Btn
                  onClick={() => {
                    s.guardarHorario(c.id, horario.trim(), nota.trim(), false);
                    onCerrarHorario();
                  }}
                >
                  Solo hoy
                </Btn>
                <Btn
                  tone="primary"
                  onClick={() => {
                    s.guardarHorario(c.id, horario.trim(), nota.trim(), true);
                    onCerrarHorario();
                  }}
                >
                  Guardar siempre
                </Btn>
              </div>
            </div>
          )}

          {obsAbierta && (
            <div className="space-y-2 rounded-lg border border-border bg-card p-3">
              <TextArea
                label={`Nueva observación · ${c.codigo}`}
                rows={3}
                value={textoObs}
                placeholder="Ej: faltó una caja de croissants"
                onChange={(e) => setTextoObs(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Btn onClick={onCerrarObs}>Cancelar</Btn>
                <Btn
                  tone="primary"
                  onClick={() => {
                    if (textoObs.trim()) s.addObservacion(c, textoObs.trim());
                    setTextoObs("");
                    onCerrarObs();
                  }}
                >
                  Guardar
                </Btn>
              </div>
              {obsCliente.length > 0 && (
                <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                  {[...obsCliente]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((o) => (
                      <p key={o.id} className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-subtle">{o.fecha}:</span> {o.texto}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function PedidoModal({ parada, onClose }: { parada: Parada | null; onClose: () => void }) {
  const s = useRutas();
  const lineas = parada ? s.pedidosData[parada.codigo] : undefined;
  const total = (lineas || []).reduce((sum, l) => sum + l.cajas, 0);
  return (
    <Modal
      open={!!parada}
      onClose={onClose}
      title="Pedido del cliente"
      subtitle={parada?.nombre}
      footer={
        lineas?.length ? (
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-muted-foreground">Total</span>
            <span className="tabular">{total} cajas</span>
          </div>
        ) : undefined
      }
    >
      {!lineas || !lineas.length ? (
        <EmptyState
          icon={<Package className="size-6" />}
          title="No hay pedido cargado"
          hint="Procesa el PDF de pedidos en la pestaña PDF para ver el detalle."
        />
      ) : (
        <ul className="space-y-1.5">
          {lineas.map((l, i) => (
            <li
              key={l.cod + i}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-mono text-sm font-bold tabular text-accent">
                {l.cajas}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.desc}</p>
                <p className="font-mono text-[11px] text-subtle">Cód. {l.cod}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function HistorialModal({
  open,
  onClose,
  completed,
  issues,
}: {
  open: boolean;
  onClose: () => void;
  completed: Parada[];
  issues: Parada[];
}) {
  const s = useRutas();
  return (
    <Modal open={open} onClose={onClose} title="Historial del día" wide>
      {!completed.length && !issues.length ? (
        <EmptyState
          icon={<History className="size-6" />}
          title="No hay clientes gestionados todavía"
        />
      ) : (
        <div className="space-y-5">
          {completed.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-success">
                <Check className="size-3.5" /> Entregados ({completed.length})
              </h4>
              <div className="space-y-1.5">
                {completed.map((c) => (
                  <HistorialRow
                    key={c.id}
                    parada={c}
                    tone="success"
                    label="Entregado"
                    onRecuperar={() => s.recuperarCliente(c.id, "done")}
                  />
                ))}
              </div>
            </section>
          )}
          {issues.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-destructive">
                <AlertTriangle className="size-3.5" /> Incidencias ({issues.length})
              </h4>
              <div className="space-y-1.5">
                {issues.map((c) => (
                  <HistorialRow
                    key={c.id}
                    parada={c}
                    tone="danger"
                    label="Incidencia"
                    onRecuperar={() => s.recuperarCliente(c.id, "issue")}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

function HistorialRow({
  parada,
  tone,
  label,
  onRecuperar,
}: {
  parada: Parada;
  tone: "success" | "danger";
  label: string;
  onRecuperar: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5",
        tone === "success" ? "border-l-2 border-l-success" : "border-l-2 border-l-destructive",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{parada.nombre}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          Ruta {parada.ruta} · {parada.direccion || "Sin dirección"}
        </p>
      </div>
      <Badge tone={tone === "success" ? "success" : "danger"}>{label}</Badge>
      <Btn size="sm" onClick={onRecuperar} title="Devolver a pendientes">
        <RotateCcw className="size-3.5" />
      </Btn>
    </div>
  );
}

function ObservacionesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useRutas();
  const [q, setQ] = useState("");
  const lista = s.incidenciasPedido
    .filter(
      (o) => !q || o.nombre.toLowerCase().includes(q.toLowerCase()) || o.codigo.includes(q),
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Modal open={open} onClose={onClose} title="Observaciones de pedido" wide>
      <Field
        placeholder="Buscar por cliente o código…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-3 space-y-1.5">
        {!lista.length ? (
          <EmptyState
            icon={<StickyNote className="size-6" />}
            title="Sin observaciones registradas"
            hint="Se conservan durante 30 días."
          />
        ) : (
          lista.map((o) => (
            <div
              key={o.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{o.nombre}</p>
                <p className="font-mono text-[11px] text-subtle">
                  {o.codigo} · Ruta {o.ruta} · {o.fecha}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">{o.texto}</p>
              </div>
              <Btn size="sm" tone="danger" onClick={() => s.deleteObservacion(o.id)}>
                <Trash2 className="size-3.5" />
              </Btn>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
