import type {
  Cliente,
  Franja,
  LineaPedido,
  Parada,
  PedidosData,
  RefRepaso,
} from "./types";

export const FRANJA_ORDEN: Franja[] = ["urgente", "segunda", "ultima"];

export const FRANJA_RANK: Record<Franja, number> = {
  urgente: 0,
  segunda: 1,
  ultima: 2,
};

export const FRANJA_META: Record<
  Franja,
  { label: string; corto: string; tone: "destructive" | "warning" | "muted" }
> = {
  urgente: { label: "Primera hora · urgente", corto: "1ª hora", tone: "destructive" },
  segunda: { label: "Segunda hora", corto: "2ª hora", tone: "warning" },
  ultima: { label: "Última hora", corto: "Última", tone: "muted" },
};

export function calcularFranja(horario?: string): Franja {
  if (!horario) return "ultima";
  const m = horario.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "ultima";
  const totalMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  if (totalMin === 0) return "ultima";
  if (totalMin < 9 * 60) return "urgente";
  if (totalMin < 12 * 60) return "segunda";
  return "ultima";
}

export function franjaEfectiva(
  franjasManuales: Record<string, Record<string, Franja>>,
  ruta: string,
  codigo: string,
  horario?: string,
): Franja {
  const manual = franjasManuales[ruta]?.[codigo];
  if (manual) return manual;
  return calcularFranja(horario);
}

export function euro(n: number): string {
  return n.toFixed(2).replace(".", ",") + "€";
}

export function fechaLarga(d = new Date()): string {
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/* ─── PDF de ruta ─────────────────────────────────────────────────────── */

export interface CobroDetectado {
  obligatorio: boolean;
  monto: number;
  forma: string;
}

export function extraerCobros(texto: string): Record<string, CobroDetectado> {
  const bloqueRe = /^\d+\s+(\d{4,7})\s+.+$/gm;
  const matches: { codigo: string; blockStart: number; entryStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = bloqueRe.exec(texto)) !== null) {
    matches.push({ codigo: m[1], blockStart: bloqueRe.lastIndex, entryStart: m.index });
  }
  const cobros: Record<string, CobroDetectado> = {};
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].blockStart;
    const end = i + 1 < matches.length ? matches[i + 1].entryStart : texto.length;
    const bloque = texto.substring(start, end);

    const obligatorio = bloque.match(/(\d{5,})\s*\*\s*([\d]+,\d{2})\s+(\S.*?)\s*$/m);
    const opcional =
      !obligatorio && bloque.match(/(\d{5,})\s+([\d]+,\d{2})\s+(\S.*?)\s*$/m);

    if (obligatorio) {
      cobros[matches[i].codigo] = {
        obligatorio: true,
        monto: parseFloat(obligatorio[2].replace(",", ".")),
        forma: obligatorio[3].trim(),
      };
    } else if (opcional) {
      cobros[matches[i].codigo] = {
        obligatorio: false,
        monto: parseFloat(opcional[2].replace(",", ".")),
        forma: opcional[3].trim(),
      };
    }
  }
  return cobros;
}

export function extraerCodigosPDF(
  texto: string,
): Record<string, { nombre: string; horario: string }> {
  const codigos: Record<string, { nombre: string; horario: string }> = {};
  const re = /^\d+\s+(\d{6})\s+(.+?)\s+(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})\s*$/;
  texto.split("\n").forEach((line) => {
    const m = line.trim().match(re);
    if (m) {
      const cod = m[1];
      if (!codigos[cod]) {
        codigos[cod] = {
          nombre: (m[2] || "").trim(),
          horario: (m[3] || "").replace(/\s+/g, ""),
        };
      }
    }
  });
  return codigos;
}

export function detectarRuta(texto: string): string | null {
  const tiene180 = texto.includes("180");
  const tiene186 = texto.includes("186");
  if (tiene180 && !tiene186) return "180";
  if (tiene186 && !tiene180) return "186";
  if (tiene180 && tiene186) {
    const c180 = (texto.match(/180/g) || []).length;
    const c186 = (texto.match(/186/g) || []).length;
    return c180 >= c186 ? "180" : "186";
  }
  return null;
}

export function maxOrdenRuta(baseDatos: Cliente[], ruta: string): number {
  return baseDatos.reduce((max, c) => (c.ruta === ruta && c.orden > max ? c.orden : max), 0);
}

export interface ResultadoRuta {
  ok: boolean;
  error?: string;
  ruta?: string;
  pending?: Parada[];
  baseDatos?: Cliente[];
  nuevos?: number;
  prestados?: number;
  totalCobros?: number;
}

export function procesarTextoRuta(
  texto: string,
  baseInput: Cliente[],
  posicionesCruzadas: Record<string, Record<string, number>>,
  franjasManuales: Record<string, Record<string, Franja>>,
): ResultadoRuta {
  const numRuta = detectarRuta(texto);
  if (!numRuta) return { ok: false, error: "No se detectó la ruta 180 ni 186 en el PDF." };

  const codigosPDF = extraerCodigosPDF(texto);
  const codigos = Object.keys(codigosPDF);
  if (!codigos.length) {
    return {
      ok: false,
      error: "No se detectaron códigos de cliente (6 dígitos) en el PDF.",
    };
  }

  const baseDatos = baseInput.map((c) => ({ ...c }));
  let nuevosClientes = 0;
  let prestados = 0;
  let siguienteOrdenNuevo = maxOrdenRuta(baseDatos, numRuta) + 1;

  interface ItemBase {
    codigo: string;
    esNuevo: boolean;
    esPrestado: boolean;
    sinUbicar: boolean;
    rutaCasa: string;
    ordenEfectivo: number;
    horario: string;
    franja?: Franja;
  }
  const itemsBase: ItemBase[] = [];

  codigos.forEach((codigo) => {
    const info = codigosPDF[codigo];
    const horarioDetectado = info.horario || "";
    const idx = baseDatos.findIndex((c) => c.codigo === codigo);
    if (idx === -1) {
      const nuevo: Cliente = {
        codigo,
        nombre: info.nombre || "Cliente " + codigo,
        direccion: "",
        ruta: numRuta,
        orden: siguienteOrdenNuevo,
        telefono: "",
        nota: "",
        horario: "",
      };
      baseDatos.push(nuevo);
      siguienteOrdenNuevo++;
      nuevosClientes++;
      itemsBase.push({
        codigo,
        esNuevo: true,
        esPrestado: false,
        sinUbicar: true,
        rutaCasa: numRuta,
        ordenEfectivo: nuevo.orden,
        horario: horarioDetectado,
      });
    } else {
      const c = baseDatos[idx];
      const horarioUtil =
        horarioDetectado && horarioDetectado !== "00:00-00:00" ? horarioDetectado : "";
      const horarioEf = horarioUtil || c.horario || "";
      if (c.ruta === numRuta) {
        itemsBase.push({
          codigo,
          esNuevo: false,
          esPrestado: false,
          sinUbicar: false,
          rutaCasa: c.ruta,
          ordenEfectivo: c.orden,
          horario: horarioEf,
        });
      } else {
        const guardado = posicionesCruzadas[numRuta]?.[codigo];
        const sinUbicar = guardado === undefined || guardado === null;
        const ordenEf = sinUbicar ? siguienteOrdenNuevo++ : guardado;
        prestados++;
        itemsBase.push({
          codigo,
          esNuevo: false,
          esPrestado: true,
          sinUbicar,
          rutaCasa: c.ruta,
          ordenEfectivo: ordenEf,
          horario: horarioEf,
        });
      }
    }
  });

  itemsBase.sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);
  itemsBase.forEach((item) => {
    item.franja = franjaEfectiva(franjasManuales, numRuta, item.codigo, item.horario);
  });
  itemsBase.sort((a, b) => FRANJA_RANK[a.franja!] - FRANJA_RANK[b.franja!]);

  const cobros = extraerCobros(texto);

  const pending: Parada[] = itemsBase.map((item, i) => {
    const c = baseDatos.find((b) => b.codigo === item.codigo)!;
    const cobro = cobros[item.codigo] || null;
    return {
      id: item.codigo + "_" + i,
      codigo: item.codigo,
      nombre: c.nombre,
      direccion: c.direccion,
      ruta: numRuta,
      rutaCasa: item.rutaCasa,
      esNuevo: item.esNuevo,
      esPrestado: item.esPrestado,
      sinUbicar: item.sinUbicar,
      orden: i + 1,
      horario: item.horario,
      franja: item.franja!,
      nota_entrega: c.nota || "",
      nota_hoy: "",
      telefono: c.telefono || "",
      cobro_obligatorio: cobro ? cobro.obligatorio : false,
      cobro_monto: cobro ? cobro.monto : null,
      cobro_forma: cobro ? cobro.forma : null,
      cobro_cobrado: null,
    };
  });

  const totalCobros = Object.keys(cobros)
    .filter((k) => cobros[k].obligatorio)
    .reduce((s, k) => s + cobros[k].monto, 0);

  return {
    ok: true,
    ruta: numRuta,
    pending,
    baseDatos,
    nuevos: nuevosClientes,
    prestados,
    totalCobros,
  };
}

/* ─── PDF de pedidos (hoja de carga) ──────────────────────────────────── */

export function procesarTextoPedidos(texto: string): PedidosData {
  const pedidosData: PedidosData = {};
  const lines = texto.split("\n");
  let currentCli: string | null = null;
  let currentLineas: LineaPedido[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const cliMatch = line.match(/^Cli:\s*(\d+)/);
    if (cliMatch) {
      if (currentCli && currentLineas.length) pedidosData[currentCli] = currentLineas;
      currentCli = cliMatch[1].trim();
      currentLineas = [];
      continue;
    }

    if (currentCli) {
      const prodMatch = line.match(/^(\d{4,6})\s+(.+?)\s+(\d+)\s*$/);
      if (prodMatch) {
        const cod = prodMatch[1].trim();
        if (cod !== "9998") {
          currentLineas.push({
            cod,
            desc: prodMatch[2].trim(),
            cajas: parseInt(prodMatch[3], 10),
          });
        }
      }
    }
  }
  if (currentCli && currentLineas.length) pedidosData[currentCli] = currentLineas;
  return pedidosData;
}

/* ─── Repaso de carga ─────────────────────────────────────────────────── */

export function construirRefs(
  pedidosData: PedidosData,
  baseDatos: Cliente[],
): Record<string, RefRepaso> {
  const refs: Record<string, RefRepaso> = {};
  const clienteNombre: Record<string, string> = {};
  baseDatos.forEach((c) => {
    clienteNombre[c.codigo] = c.nombre;
  });

  Object.keys(pedidosData).forEach((codCliente) => {
    const lineas = pedidosData[codCliente] || [];
    const nombre = clienteNombre[codCliente] || "Cliente " + codCliente;
    lineas.forEach((l) => {
      if (!refs[l.cod]) refs[l.cod] = { desc: l.desc, total: 0, clientes: [] };
      refs[l.cod].total += l.cajas;
      refs[l.cod].clientes.push({ nombre, cajas: l.cajas });
    });
  });
  return refs;
}

export type EstadoRef = "pending" | "partial" | "ok" | "over";

export function estadoRef(need: number, got: number): EstadoRef {
  if (got === 0) return "pending";
  if (got < need) return "partial";
  if (got === need) return "ok";
  return "over";
}

/* ─── Liquidación ─────────────────────────────────────────────────────── */

export interface Liquidacion {
  obligatorioCobrado: number;
  opcionalCobrado: number;
  firmado: number;
  pendienteCobro: number;
  totalEfectivo: number;
  detalleFirmado: Parada[];
  hayCobros: boolean;
}

export function calcularLiquidacion(
  pending: Parada[],
  completed: Parada[],
  issues: Parada[],
): Liquidacion {
  let obligatorioCobrado = 0;
  let opcionalCobrado = 0;
  let firmado = 0;
  let pendienteCobro = 0;
  const detalleFirmado: Parada[] = [];

  completed.forEach((c) => {
    if (!c.cobro_monto) return;
    if (c.cobro_obligatorio) obligatorioCobrado += c.cobro_monto;
    else if (c.cobro_cobrado) opcionalCobrado += c.cobro_monto;
    else {
      firmado += c.cobro_monto;
      detalleFirmado.push(c);
    }
  });

  pending.forEach((c) => {
    if (c.cobro_monto) pendienteCobro += c.cobro_monto;
  });
  issues.forEach((c) => {
    if (c.cobro_monto) pendienteCobro += c.cobro_monto;
  });

  return {
    obligatorioCobrado,
    opcionalCobrado,
    firmado,
    pendienteCobro,
    totalEfectivo: obligatorioCobrado + opcionalCobrado,
    detalleFirmado,
    hayCobros: [...pending, ...completed, ...issues].some((c) => !!c.cobro_monto),
  };
}

export function construirResumenTexto(
  pending: Parada[],
  completed: Parada[],
  issues: Parada[],
): string {
  const total = pending.length + completed.length + issues.length;
  const ef = total > 0 ? ((completed.length / total) * 100).toFixed(1) : "0";
  const fecha = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  let txt =
    "📋 *RESUMEN DE REPARTO - " + fecha + "*\n--------------------------------------\n";
  txt +=
    "📦 Total: " +
    total +
    "\n✅ Entregados: " +
    completed.length +
    "\n❌ Incidencias: " +
    issues.length +
    "\n⏳ Pendientes: " +
    pending.length +
    "\n📈 Efectividad: " +
    ef +
    "%\n";

  const liq = calcularLiquidacion(pending, completed, issues);
  if (liq.hayCobros) {
    txt += "\n💶 *LIQUIDACIÓN DE COBROS:*\n";
    txt += "Obligatorios cobrados: " + euro(liq.obligatorioCobrado) + "\n";
    txt += "Opcionales cobrados: " + euro(liq.opcionalCobrado) + "\n";
    txt += "Firmado (no cobrado): " + euro(liq.firmado) + "\n";
    if (liq.pendienteCobro > 0)
      txt += "Pendiente (rutas sin acabar): " + euro(liq.pendienteCobro) + "\n";
    txt += "💰 EFECTIVO A LLEVAR: " + euro(liq.totalEfectivo) + "\n";
  }

  if (issues.length) {
    txt += "\n⚠️ *INCIDENCIAS:*\n";
    issues.forEach((c) => {
      txt += "- Cód. " + c.codigo + ": " + c.nombre + " (Ruta " + c.ruta + ")\n";
    });
  } else {
    txt += "\n🎉 ¡Día limpio sin incidencias!";
  }
  return txt;
}

export function urlExportacion(plataforma: "whatsapp" | "telegram" | "email", txt: string) {
  const fecha = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  if (plataforma === "whatsapp")
    return "https://api.whatsapp.com/send?text=" + encodeURIComponent(txt);
  if (plataforma === "telegram")
    return "https://t.me/share/url?url=&text=" + encodeURIComponent(txt);
  return (
    "mailto:?subject=" +
    encodeURIComponent("Resumen Reparto " + fecha) +
    "&body=" +
    encodeURIComponent(txt.replace(/\*/g, ""))
  );
}

export function mapsUrl(direccion: string) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(direccion);
}
