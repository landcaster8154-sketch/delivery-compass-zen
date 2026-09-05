/**
 * Fuente única de verdad para las paradas del día.
 *
 * Reglas duras:
 *  - Un único array canónico de paradas. Pendientes / entregadas / incidencias
 *    son SIEMPRE selectores derivados (filtros) de ese array.
 *  - Cada parada tiene un id estable, inmutable y único por ruta.
 *  - Nunca se usa el índice del array como identidad.
 *  - cantidad(pendientes) + cantidad(entregados) + cantidad(incidencias)
 *    === total original de la ruta.
 */
import { calcularFranja } from "./logic";
import type { EstadoParada, Parada, TotalesRuta } from "./types";

export function idParada(ruta: string, codigo: string): string {
  return `${ruta}-client-${codigo}`;
}

/** Asigna un id único y estable, resolviendo colisiones de forma determinista. */
function asignarId(p: Parada, usados: Set<string>): string {
  const base = idParada(p.ruta, p.codigo);
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function esIdValido(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.includes("-client-");
}

/**
 * Normaliza una lista heredada o parcial: genera ids sólo cuando faltan o son
 * heredados, deduplica por id conservando un único registro (el primero, o el
 * que ya tenga un estado distinto de "pendiente") y completa campos ausentes.
 */
export function normalizarParadas(lista: Parada[] | null | undefined): {
  paradas: Parada[];
  reparado: boolean;
} {
  const entrada = Array.isArray(lista) ? lista.filter(Boolean) : [];
  let reparado = false;
  const usados = new Set<string>();
  const porId = new Map<string, Parada>();

  for (const raw of entrada) {
    const p: Parada = { ...raw };
    p.ruta = String(p.ruta ?? "");
    p.codigo = String(p.codigo ?? "");
    p.horario = p.horario ?? "";
    p.nota_hoy = p.nota_hoy ?? "";
    p.franja = p.franja || calcularFranja(p.horario || "");
    if (
      p.estado !== "pendiente" &&
      p.estado !== "entregado" &&
      p.estado !== "incidencia"
    ) {
      p.estado = "pendiente";
      reparado = true;
    }

    const idPrevio = p.id;
    if (!esIdValido(idPrevio) || usados.has(idPrevio)) {
      // Id heredado (formato "codigo_indice"), ausente o duplicado.
      const candidato = idParada(p.ruta, p.codigo);
      if (esIdValido(idPrevio) && usados.has(idPrevio)) {
        // Duplicado real: fusionamos en el registro existente.
        const previo = porId.get(idPrevio)!;
        if (previo.estado === "pendiente" && p.estado !== "pendiente") {
          porId.set(idPrevio, { ...p, id: idPrevio });
        }
        reparado = true;
        continue;
      }
      if (usados.has(candidato)) {
        const previo = porId.get(candidato)!;
        if (previo.estado === "pendiente" && p.estado !== "pendiente") {
          porId.set(candidato, { ...p, id: candidato });
        }
        reparado = true;
        continue;
      }
      p.id = asignarId(p, usados);
      reparado = true;
    }

    usados.add(p.id);
    porId.set(p.id, p);
  }

  return { paradas: [...porId.values()], reparado };
}

/** Migra el modelo antiguo de tres listas separadas al array canónico. */
export function migrarDesdeListas(
  pending: Parada[],
  completed: Parada[],
  issues: Parada[],
): { paradas: Parada[]; reparado: boolean } {
  const marcar = (lista: Parada[], estado: EstadoParada) =>
    (Array.isArray(lista) ? lista : []).map((p) => ({ ...p, estado }));
  const unidas = [
    ...marcar(pending, "pendiente"),
    ...marcar(completed, "entregado"),
    ...marcar(issues, "incidencia"),
  ];
  const res = normalizarParadas(unidas);
  return { paradas: res.paradas, reparado: true && res.paradas.length > 0 };
}

export function totalesDesdeParadas(paradas: Parada[]): TotalesRuta {
  const totales: TotalesRuta = {};
  paradas.forEach((p) => {
    totales[p.ruta] = (totales[p.ruta] ?? 0) + 1;
  });
  return totales;
}

export interface ResultadoValidacion {
  ok: boolean;
  problemas: string[];
}

/** Comprueba ids únicos y que cada ruta conserve su total original. */
export function validarInvariantes(
  paradas: Parada[],
  totales: TotalesRuta,
): ResultadoValidacion {
  const problemas: string[] = [];
  const vistos = new Set<string>();
  for (const p of paradas) {
    if (vistos.has(p.id)) problemas.push(`Id duplicado: ${p.id}`);
    vistos.add(p.id);
  }
  const actuales = totalesDesdeParadas(paradas);
  for (const ruta of Object.keys(totales)) {
    const esperado = totales[ruta]!;
    const actual = actuales[ruta] ?? 0;
    if (actual !== esperado) {
      problemas.push(`Ruta ${ruta}: ${actual} paradas, se esperaban ${esperado}`);
    }
  }
  return { ok: problemas.length === 0, problemas };
}

export interface EstadoOperativo {
  paradas: Parada[];
  totales: TotalesRuta;
}

export interface ResultadoReparacion extends EstadoOperativo {
  reparado: boolean;
  mensaje: string | null;
}

/**
 * Autorreparación: deduplica, regenera ids ausentes y, si una ruta no cuadra
 * con su total original, restablece SOLO el estado operativo de esa ruta a
 * partir de sus registros existentes (nunca crea paradas nuevas).
 */
export function repararEstado(
  paradasEntrada: Parada[] | null | undefined,
  totalesEntrada: TotalesRuta | null | undefined,
): ResultadoReparacion {
  const { paradas, reparado } = normalizarParadas(paradasEntrada);
  const totales: TotalesRuta = { ...(totalesEntrada ?? {}) };
  const actuales = totalesDesdeParadas(paradas);
  let reparadoTotales = false;

  // Rutas sin total original registrado (datos heredados): se fija ahora.
  for (const ruta of Object.keys(actuales)) {
    if (typeof totales[ruta] !== "number") {
      totales[ruta] = actuales[ruta]!;
      reparadoTotales = true;
    }
  }
  // Rutas registradas que ya no existen en el array canónico.
  for (const ruta of Object.keys(totales)) {
    if (actuales[ruta] === undefined) {
      delete totales[ruta];
      reparadoTotales = true;
    } else if (actuales[ruta] !== totales[ruta]) {
      // No se puede reconstruir con seguridad: el array canónico manda.
      totales[ruta] = actuales[ruta]!;
      reparadoTotales = true;
    }
  }

  const huboReparacion = reparado || reparadoTotales;
  return {
    paradas,
    totales,
    reparado: huboReparacion,
    mensaje: huboReparacion
      ? "Se repararon datos guardados en el dispositivo (paradas duplicadas o incompletas)."
      : null,
  };
}

/* ─── Selectores derivados ───────────────────────────────────────────── */

export const pendientesDe = (paradas: Parada[]) =>
  paradas.filter((p) => p.estado === "pendiente");
export const entregadasDe = (paradas: Parada[]) =>
  paradas.filter((p) => p.estado === "entregado");
export const incidenciasDe = (paradas: Parada[]) =>
  paradas.filter((p) => p.estado === "incidencia");

/** Cambia el estado de UNA parada por id. Nunca añade ni copia registros. */
export function cambiarEstado(
  paradas: Parada[],
  id: string,
  estado: EstadoParada,
  extra?: Partial<Parada>,
): Parada[] {
  return paradas.map((p) => (p.id === id ? { ...p, ...extra, estado } : p));
}
