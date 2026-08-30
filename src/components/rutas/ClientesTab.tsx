import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge, Btn, Card, EmptyState, Field, Modal, Select } from "./primitives";
import { useRutas } from "@/lib/rutas/store";
import type { Cliente } from "@/lib/rutas/types";

const vacio: Cliente = {
  codigo: "",
  nombre: "",
  direccion: "",
  ruta: "180",
  orden: 1,
  telefono: "",
  horario: "",
  nota: "",
};

export function ClientesTab() {
  const s = useRutas();
  const [q, setQ] = useState("");
  const [ruta, setRuta] = useState("all");
  const [editando, setEditando] = useState<{ idx: number | null; cliente: Cliente } | null>(null);
  const [aBorrar, setABorrar] = useState<{ idx: number; nombre: string } | null>(null);

  const rutas = useMemo(
    () => [...new Set(s.baseDatos.map((c) => c.ruta))].sort(),
    [s.baseDatos],
  );

  const lista = s.baseDatos
    .map((c, idx) => ({ c, idx }))
    .filter(({ c }) => ruta === "all" || c.ruta === ruta)
    .filter(
      ({ c }) =>
        !q ||
        c.nombre.toLowerCase().includes(q.toLowerCase()) ||
        c.codigo.includes(q) ||
        c.direccion.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => a.c.ruta.localeCompare(b.c.ruta) || a.c.orden - b.c.orden);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-elevated/40 px-4 py-3 sm:px-6">
        <div className="mx-auto grid w-full max-w-6xl gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Field
            placeholder="Buscar cliente, código o dirección…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select value={ruta} onChange={(e) => setRuta(e.target.value)}>
            <option value="all">Todas las rutas</option>
            {rutas.map((r) => (
              <option key={r} value={r}>
                Ruta {r}
              </option>
            ))}
          </Select>
          <Btn tone="primary" onClick={() => setEditando({ idx: null, cliente: { ...vacio } })}>
            <Plus className="size-4" /> Nuevo
          </Btn>
        </div>
      </div>

      <div className="scroll-area flex-1 px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <p className="mb-3 text-xs text-muted-foreground">
            {lista.length} de {s.baseDatos.length} clientes en la base
          </p>
          {!lista.length ? (
            <EmptyState icon={<Users className="size-6" />} title="Sin resultados" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {lista.map(({ c, idx }) => (
                <Card key={c.codigo + idx} className="flex items-start gap-3 p-3">
                  <span className="shrink-0 rounded-lg border border-border bg-elevated px-2 py-1 font-mono text-xs font-bold tabular text-muted-foreground">
                    {c.orden}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.nombre}</p>
                    <p className="truncate font-mono text-[11px] text-subtle">
                      {c.codigo} · R{c.ruta}
                      {c.horario ? " · " + c.horario : ""}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {c.direccion || "Sin dirección"}
                    </p>
                    {c.nota && (
                      <p className="mt-1.5 rounded-md border border-warning/25 bg-warning/10 px-2 py-1 text-[11px] text-warning">
                        {c.nota}
                      </p>
                    )}
                    {c.telefono && <Badge tone="muted">{c.telefono}</Badge>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Btn size="sm" onClick={() => setEditando({ idx, cliente: { ...c } })}>
                      <Pencil className="size-3.5" />
                    </Btn>
                    <Btn
                      size="sm"
                      tone="danger"
                      onClick={() => setABorrar({ idx, nombre: c.nombre })}
                    >
                      <Trash2 className="size-3.5" />
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!editando}
        onClose={() => setEditando(null)}
        title={editando?.idx === null ? "Nuevo cliente" : "Editar cliente"}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={() => setEditando(null)}>Cancelar</Btn>
            <Btn
              tone="primary"
              onClick={() => {
                if (!editando) return;
                const c = editando.cliente;
                if (!c.codigo.trim() || !c.nombre.trim()) return;
                s.guardarCliente({ ...c, orden: Number(c.orden) || 1 }, editando.idx);
                setEditando(null);
              }}
            >
              Guardar
            </Btn>
          </div>
        }
      >
        {editando && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Código"
              value={editando.cliente.codigo}
              onChange={(e) =>
                setEditando({ ...editando, cliente: { ...editando.cliente, codigo: e.target.value } })
              }
            />
            <Field
              label="Nombre"
              value={editando.cliente.nombre}
              onChange={(e) =>
                setEditando({ ...editando, cliente: { ...editando.cliente, nombre: e.target.value } })
              }
            />
            <Field
              label="Dirección"
              className="sm:col-span-2"
              value={editando.cliente.direccion}
              onChange={(e) =>
                setEditando({
                  ...editando,
                  cliente: { ...editando.cliente, direccion: e.target.value },
                })
              }
            />
            <Field
              label="Ruta"
              value={editando.cliente.ruta}
              onChange={(e) =>
                setEditando({ ...editando, cliente: { ...editando.cliente, ruta: e.target.value } })
              }
            />
            <Field
              label="Orden"
              type="number"
              value={String(editando.cliente.orden)}
              onChange={(e) =>
                setEditando({
                  ...editando,
                  cliente: { ...editando.cliente, orden: Number(e.target.value) },
                })
              }
            />
            <Field
              label="Teléfono"
              value={editando.cliente.telefono || ""}
              onChange={(e) =>
                setEditando({
                  ...editando,
                  cliente: { ...editando.cliente, telefono: e.target.value },
                })
              }
            />
            <Field
              label="Horario"
              placeholder="08:00-09:00"
              value={editando.cliente.horario || ""}
              onChange={(e) =>
                setEditando({
                  ...editando,
                  cliente: { ...editando.cliente, horario: e.target.value },
                })
              }
            />
            <Field
              label="Nota de entrega"
              className="sm:col-span-2"
              value={editando.cliente.nota || ""}
              onChange={(e) =>
                setEditando({ ...editando, cliente: { ...editando.cliente, nota: e.target.value } })
              }
            />
          </div>
        )}
      </Modal>

      <Modal open={!!aBorrar} onClose={() => setABorrar(null)} title="Eliminar cliente">
        <p className="text-sm text-muted-foreground">
          ¿Seguro que quieres eliminar <strong className="text-foreground">{aBorrar?.nombre}</strong>{" "}
          de la base de datos?
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Btn onClick={() => setABorrar(null)}>Cancelar</Btn>
          <Btn
            tone="danger"
            onClick={() => {
              if (aBorrar) s.borrarCliente(aBorrar.idx);
              setABorrar(null);
            }}
          >
            Eliminar
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
