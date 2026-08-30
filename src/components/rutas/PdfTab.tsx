import { FileText, ListChecks, Trash2 } from "lucide-react";
import { useState } from "react";

import { Btn, Card, TextArea } from "./primitives";
import { useRutas } from "@/lib/rutas/store";

export function PdfTab({ onProcesado }: { onProcesado: () => void }) {
  const s = useRutas();
  const [textoRuta, setTextoRuta] = useState("");
  const [textoPedidos, setTextoPedidos] = useState("");
  const [msgRuta, setMsgRuta] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [msgPed, setMsgPed] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const procesarRuta = () => {
    if (!textoRuta.trim()) {
      setMsgRuta({ tone: "err", text: "Pega primero el texto del PDF de la ruta." });
      return;
    }
    const r = s.procesarRuta(textoRuta);
    if (!r.ok) {
      setMsgRuta({ tone: "err", text: r.error || "No se pudo procesar el texto." });
      return;
    }
    setMsgRuta({
      tone: "ok",
      text: `Ruta ${r.ruta} cargada: ${r.pending?.length ?? 0} paradas · ${r.nuevos} nuevos · ${r.prestados} prestados · ${r.totalCobros} cobros.`,
    });
    setTextoRuta("");
    onProcesado();
  };

  const procesarPedidos = () => {
    if (!textoPedidos.trim()) {
      setMsgPed({ tone: "err", text: "Pega primero el texto de la hoja de pedidos." });
      return;
    }
    const n = s.procesarPedidos(textoPedidos);
    setMsgPed(
      n > 0
        ? { tone: "ok", text: `${n} clientes con pedido cargados correctamente.` }
        : { tone: "err", text: "No se detectó ningún pedido en el texto pegado." },
    );
    if (n > 0) setTextoPedidos("");
  };

  return (
    <div className="scroll-area flex-1 px-4 py-5 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <header className="mb-3 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-accent">
              <FileText className="size-4.5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold">Hoja de reparto</h2>
              <p className="text-xs text-muted-foreground">
                Detecta ruta 180/186, horarios y cobros
              </p>
            </div>
          </header>
          <TextArea
            rows={12}
            className="font-mono text-xs"
            placeholder="Pega aquí el texto copiado del PDF de la ruta…"
            value={textoRuta}
            onChange={(e) => setTextoRuta(e.target.value)}
          />
          {msgRuta && <Aviso tone={msgRuta.tone}>{msgRuta.text}</Aviso>}
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <Btn tone="primary" size="lg" onClick={procesarRuta}>
              Procesar ruta
            </Btn>
            <Btn size="lg" onClick={() => setTextoRuta("")} title="Limpiar">
              <Trash2 className="size-4" />
            </Btn>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <header className="mb-3 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-warning/15 text-warning">
              <ListChecks className="size-4.5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold">Hoja de pedidos</h2>
              <p className="text-xs text-muted-foreground">
                Alimenta el detalle por cliente y el repaso de carga
              </p>
            </div>
          </header>
          <TextArea
            rows={12}
            className="font-mono text-xs"
            placeholder="Pega aquí el texto copiado del PDF de pedidos…"
            value={textoPedidos}
            onChange={(e) => setTextoPedidos(e.target.value)}
          />
          {msgPed && <Aviso tone={msgPed.tone}>{msgPed.text}</Aviso>}
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <Btn tone="warning" size="lg" onClick={procesarPedidos}>
              Procesar pedidos
            </Btn>
            <Btn size="lg" onClick={() => setTextoPedidos("")} title="Limpiar">
              <Trash2 className="size-4" />
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Aviso({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p
      className={
        "mt-3 rounded-lg border px-3 py-2 text-xs font-medium " +
        (tone === "ok"
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive")
      }
    >
      {children}
    </p>
  );
}
