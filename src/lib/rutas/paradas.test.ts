import { describe, expect, it } from "vitest";

import {
  cambiarEstado,
  entregadasDe,
  incidenciasDe,
  migrarDesdeListas,
  normalizarParadas,
  pendientesDe,
  repararEstado,
  totalesDesdeParadas,
  validarInvariantes,
} from "./paradas";
import type { Parada } from "./types";

const RUTA = "180";

function crearRuta(n: number): Parada[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${RUTA}-client-${100000 + i}`,
    estado: "pendiente" as const,
    codigo: String(100000 + i),
    nombre: `Cliente ${i + 1}`,
    direccion: "",
    ruta: RUTA,
    rutaCasa: RUTA,
    esNuevo: false,
    esPrestado: false,
    sinUbicar: false,
    orden: i + 1,
    horario: "",
    franja: "segunda" as const,
    nota_entrega: "",
    nota_hoy: "",
    telefono: "",
    cobro_obligatorio: false,
    cobro_monto: null,
    cobro_forma: null,
    cobro_cobrado: null,
  }));
}

describe("array canónico de paradas (ruta de 26 clientes)", () => {
  const base = crearRuta(26);
  const totales = totalesDesdeParadas(base);

  it("parte de 26 pendientes y 0 entregados", () => {
    expect(base).toHaveLength(26);
    expect(pendientesDe(base)).toHaveLength(26);
    expect(entregadasDe(base)).toHaveLength(0);
    expect(validarInvariantes(base, totales).ok).toBe(true);
  });

  it("marcar dos entregados deja 24 + 2 sin cambiar el total", () => {
    let p = cambiarEstado(base, base[0]!.id, "entregado");
    p = cambiarEstado(p, base[1]!.id, "entregado");
    expect(p).toHaveLength(26);
    expect(pendientesDe(p)).toHaveLength(24);
    expect(entregadasDe(p)).toHaveLength(2);
    expect(pendientesDe(p).length + entregadasDe(p).length + incidenciasDe(p).length).toBe(26);
    expect(validarInvariantes(p, totales).ok).toBe(true);
  });

  it("recuperarlos devuelve 26 + 0", () => {
    let p = cambiarEstado(base, base[0]!.id, "entregado");
    p = cambiarEstado(p, base[1]!.id, "entregado");
    p = cambiarEstado(p, base[0]!.id, "pendiente");
    p = cambiarEstado(p, base[1]!.id, "pendiente");
    expect(p).toHaveLength(26);
    expect(pendientesDe(p)).toHaveLength(26);
    expect(entregadasDe(p)).toHaveLength(0);
  });

  it("repetir la misma acción no duplica nada", () => {
    let p = base;
    for (let i = 0; i < 10; i++) p = cambiarEstado(p, base[3]!.id, "entregado");
    for (let i = 0; i < 10; i++) p = cambiarEstado(p, base[3]!.id, "pendiente");
    expect(p).toHaveLength(26);
    expect(new Set(p.map((x) => x.id)).size).toBe(26);
    expect(validarInvariantes(p, totales).ok).toBe(true);
  });

  it("deduplica registros repetidos conservando el estado avanzado", () => {
    const corrupto = [...base, { ...base[0]!, estado: "entregado" as const }, ...base.slice(0, 5)];
    const { paradas, reparado } = normalizarParadas(corrupto);
    expect(reparado).toBe(true);
    expect(paradas).toHaveLength(26);
    expect(paradas.find((x) => x.id === base[0]!.id)!.estado).toBe("entregado");
  });

  it("migra el formato antiguo de tres listas sin duplicar", () => {
    const pending = base.slice(2).map((p, i) => ({ ...p, id: `${p.codigo}_${i}` }));
    const completed = base.slice(0, 2).map((p, i) => ({ ...p, id: `${p.codigo}_${i}` }));
    const { paradas } = migrarDesdeListas(pending, completed, []);
    expect(paradas).toHaveLength(26);
    expect(new Set(paradas.map((p) => p.id)).size).toBe(26);
    expect(entregadasDe(paradas)).toHaveLength(2);
  });

  it("autorrepara descuadres respecto al total original", () => {
    const duplicado = [...base, ...base];
    const rep = repararEstado(duplicado, { [RUTA]: 26 });
    expect(rep.reparado).toBe(true);
    expect(rep.paradas).toHaveLength(26);
    expect(rep.totales[RUTA]).toBe(26);
    expect(validarInvariantes(rep.paradas, rep.totales).ok).toBe(true);
    expect(rep.mensaje).toBeTruthy();
  });
});
