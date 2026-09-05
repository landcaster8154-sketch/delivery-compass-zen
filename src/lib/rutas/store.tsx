import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import baseInicial from "@/data/clientes.json";
import {
  FRANJA_RANK,
  calcularFranja,
  procesarTextoPedidos,
  procesarTextoRuta,
  type ResultadoRuta,
} from "./logic";
import {
  cambiarEstado,
  entregadasDe,
  incidenciasDe,
  migrarDesdeListas,
  pendientesDe,
  repararEstado,
  totalesDesdeParadas,
  validarInvariantes,
} from "./paradas";
import type {
  Cliente,
  Franja,
  ObservacionPedido,
  Parada,
  PedidosData,
  SesionExport,
  Tema,
  TotalesRuta,
  Vista,
} from "./types";

const BASE_INICIAL = baseInicial as Cliente[];

const K = {
  base: "rr_base",
  paradas: "rr_paradas",
  totales: "rr_totales_ruta",
  pending: "rr_pending",
  completed: "rr_completed",
  issues: "rr_issues",
  cruzadas: "rr_posiciones_cruzadas",
  franjas: "rr_franjas_manuales",
  obs: "rr_incidencias_pedido",
  fecha: "rr_fecha",
  pedidos: "rr_pedidos",
  vista: "rr_vista",
  tema: "rr_tema",
  barcodes: "rr_barcodeMap",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function limpiarAntiguas(obs: ObservacionPedido[]): ObservacionPedido[] {
  const LIMITE = 30 * 24 * 60 * 60 * 1000;
  const ahora = Date.now();
  return obs.filter((o) => ahora - o.timestamp < LIMITE);
}

export interface RutasStore {
  hidratado: boolean;
  baseDatos: Cliente[];
  /** Array canónico: única fuente de verdad de las paradas del día. */
  paradas: Parada[];
  totalesRuta: TotalesRuta;
  /** Selectores derivados del array canónico (nunca listas independientes). */
  pending: Parada[];
  completed: Parada[];
  issues: Parada[];
  pedidosData: PedidosData;
  incidenciasPedido: ObservacionPedido[];
  barcodeMap: Record<string, string>;
  repasoCounted: Record<string, number>;
  currentRuta: string;
  vista: Vista;
  tema: Tema;
  avisoReparacion: string | null;
  descartarAviso: () => void;

  setCurrentRuta: (r: string) => void;
  setVista: (v: Vista) => void;
  setTema: (t: Tema) => void;

  procesarRuta: (texto: string) => ResultadoRuta;
  procesarPedidos: (texto: string) => number;

  marcarEntregado: (id: string, cobrado?: boolean) => void;
  marcarIncidencia: (id: string) => void;
  recuperarCliente: (id: string, origen: "done" | "issue") => void;
  guardarHorario: (id: string, horario: string, nota: string, siempre: boolean) => void;
  moverParada: (fromIdx: number, toIdx: number, franjaDestino: Franja) => void;
  moverAFranja: (fromIdx: number, franjaDestino: Franja) => void;

  addObservacion: (parada: Parada, texto: string) => void;
  deleteObservacion: (id: string) => void;

  guardarCliente: (cliente: Cliente, idx: number | null) => void;
  borrarCliente: (idx: number) => void;

  setRepasoCount: (codigo: string, valor: number) => void;
  resetRepaso: (codigos: string[]) => void;
  aprenderCodigo: (raw: string, codigo: string) => void;
  importarCodigos: (map: Record<string, string>) => number;

  exportarSesion: () => void;
  importarSesion: (file: File) => Promise<string>;
}

const Ctx = createContext<RutasStore | null>(null);

export function useRutas() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRutas debe usarse dentro de <RutasProvider>");
  return ctx;
}

function repasoKey() {
  return "rr_repaso_" + new Date().toISOString().slice(0, 10);
}

export function RutasProvider({ children }: { children: ReactNode }) {
  const [hidratado, setHidratado] = useState(false);
  const [baseDatos, setBaseDatos] = useState<Cliente[]>(BASE_INICIAL);
  const [paradas, setParadasState] = useState<Parada[]>([]);
  const [totalesRuta, setTotalesRuta] = useState<TotalesRuta>({});
  const [avisoReparacion, setAviso] = useState<string | null>(null);
  const [pedidosData, setPedidosData] = useState<PedidosData>({});
  const [incidenciasPedido, setIncidencias] = useState<ObservacionPedido[]>([]);
  const [barcodeMap, setBarcodeMap] = useState<Record<string, string>>({});
  const [repasoCounted, setRepasoCounted] = useState<Record<string, number>>({});
  const [currentRuta, setCurrentRuta] = useState("all");
  const [vista, setVistaState] = useState<Vista>("normal");
  const [tema, setTemaState] = useState<Tema>("dark");

  const posicionesCruzadas = useRef<Record<string, Record<string, number>>>({});
  const franjasManuales = useRef<Record<string, Record<string, Franja>>>({});
  const totalesRef = useRef<TotalesRuta>({});
  totalesRef.current = totalesRuta;

  /**
   * Toda escritura del array canónico pasa por aquí: valida invariantes antes
   * y después, y autorrepara si detecta ids duplicados o descuadres.
   */
  const setParadas = useCallback(
    (updater: (prev: Parada[]) => Parada[]) => {
      setParadasState((prev) => {
        const siguiente = updater(prev);
        const check = validarInvariantes(siguiente, totalesRef.current);
        if (check.ok) return siguiente;
        const rep = repararEstado(siguiente, totalesRef.current);
        setTotalesRuta(rep.totales);
        setAviso(rep.mensaje);
        return rep.paradas;
      });
    },
    [],
  );

  /* ── Carga inicial (instantánea, sin red) ── */
  useEffect(() => {
    const base = read<Cliente[] | null>(K.base, null);
    setBaseDatos(base && base.length ? base : BASE_INICIAL);
    posicionesCruzadas.current = read(K.cruzadas, {});
    franjasManuales.current = read(K.franjas, {});
    setIncidencias(limpiarAntiguas(read<ObservacionPedido[]>(K.obs, [])));

    const fecha = localStorage.getItem(K.fecha);
    if (fecha === new Date().toDateString()) {
      const guardadas = read<Parada[] | null>(K.paradas, null);
      let inicial: Parada[];
      let migrado = false;
      if (guardadas && Array.isArray(guardadas)) {
        inicial = guardadas;
      } else {
        // Estructura antigua: tres listas separadas → array canónico.
        const mig = migrarDesdeListas(
          read<Parada[]>(K.pending, []),
          read<Parada[]>(K.completed, []),
          read<Parada[]>(K.issues, []),
        );
        inicial = mig.paradas;
        migrado = mig.paradas.length > 0;
      }
      const rep = repararEstado(inicial, read<TotalesRuta>(K.totales, {}));
      setParadasState(rep.paradas);
      setTotalesRuta(rep.totales);
      totalesRef.current = rep.totales;
      if (rep.reparado || migrado) {
        setAviso(
          rep.mensaje ??
            "Se actualizaron y repararon los datos guardados en el dispositivo.",
        );
      }
      // Las claves antiguas ya no son fuente de verdad.
      try {
        localStorage.removeItem(K.pending);
        localStorage.removeItem(K.completed);
        localStorage.removeItem(K.issues);
      } catch {
        /* noop */
      }
    }
    setPedidosData(read<PedidosData>(K.pedidos, {}));
    setBarcodeMap(read<Record<string, string>>(K.barcodes, {}));
    setRepasoCounted(
      read<{ counted: Record<string, number> }>(repasoKey(), { counted: {} }).counted || {},
    );

    const v = localStorage.getItem(K.vista) as Vista | null;
    if (v === "compact" || v === "car" || v === "timeline") setVistaState(v);
    const t = localStorage.getItem(K.tema) as Tema | null;
    setTemaState(t === "light" ? "light" : "dark");
    setHidratado(true);
  }, []);

  /* ── Persistencia (valida invariantes antes de escribir) ── */
  useEffect(() => {
    if (!hidratado) return;
    write(K.base, baseDatos);
    write(K.paradas, paradas);
    write(K.totales, totalesRuta);
    write(K.obs, incidenciasPedido);
    write(K.cruzadas, posicionesCruzadas.current);
    write(K.franjas, franjasManuales.current);
    try {
      localStorage.setItem(K.fecha, new Date().toDateString());
    } catch {
      /* quota */
    }
  }, [hidratado, baseDatos, paradas, totalesRuta, incidenciasPedido]);

  useEffect(() => {
    if (hidratado) write(K.pedidos, pedidosData);
  }, [hidratado, pedidosData]);
  useEffect(() => {
    if (hidratado) write(K.barcodes, barcodeMap);
  }, [hidratado, barcodeMap]);
  useEffect(() => {
    if (hidratado) write(repasoKey(), { counted: repasoCounted });
  }, [hidratado, repasoCounted]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", tema === "light");
    root.classList.toggle("dark", tema === "dark");
    root.style.backgroundColor = tema === "dark" ? "#0c0d12" : "#f6f7fb";
    if (hidratado) {
      try {
        localStorage.setItem(K.tema, tema);
      } catch {
        /* quota */
      }
    }
  }, [tema, hidratado]);

  const setVista = useCallback((v: Vista) => {
    setVistaState(v);
    try {
      localStorage.setItem(K.vista, v);
    } catch {
      /* quota */
    }
  }, []);

  /* ── Selectores derivados ── */
  const pending = useMemo(() => pendientesDe(paradas), [paradas]);
  const completed = useMemo(() => entregadasDe(paradas), [paradas]);
  const issues = useMemo(() => incidenciasDe(paradas), [paradas]);

  /* ── Orden aprendido ── */
  const persistirOrden = useCallback((lista: Parada[], base: Cliente[]) => {
    const nuevaBase = base.map((c) => ({ ...c }));
    lista.forEach((item) => {
      if (item.esPrestado) {
        if (!posicionesCruzadas.current[item.ruta]) posicionesCruzadas.current[item.ruta] = {};
        posicionesCruzadas.current[item.ruta]![item.codigo] = item.orden;
        item.sinUbicar = false;
      } else {
        const idx = nuevaBase.findIndex((b) => b.codigo === item.codigo);
        if (idx > -1) nuevaBase[idx]!.orden = item.orden;
        if (item.esNuevo) item.sinUbicar = false;
      }
      if (!franjasManuales.current[item.ruta]) franjasManuales.current[item.ruta] = {};
      franjasManuales.current[item.ruta]![item.codigo] = item.franja;
    });
    return nuevaBase;
  }, []);

  const procesarRuta = useCallback(
    (texto: string): ResultadoRuta => {
      const res = procesarTextoRuta(
        texto,
        baseDatos,
        posicionesCruzadas.current,
        franjasManuales.current,
      );
      if (res.ok) {
        const nuevas = res.pending!;
        const totales = totalesDesdeParadas(nuevas);
        setBaseDatos(res.baseDatos!);
        totalesRef.current = totales;
        setTotalesRuta(totales);
        setParadasState(nuevas);
        setAviso(null);
      }
      return res;
    },
    [baseDatos],
  );

  const procesarPedidos = useCallback((texto: string) => {
    const data = procesarTextoPedidos(texto);
    setPedidosData(data);
    return Object.keys(data).length;
  }, []);

  const marcarEntregado = useCallback(
    (id: string, cobrado?: boolean) => {
      setParadas((prev) =>
        prev.map((p) => {
          if (p.id !== id || p.estado === "entregado") return p;
          const cobro_cobrado = p.cobro_monto
            ? p.cobro_obligatorio
              ? true
              : !!cobrado
            : p.cobro_cobrado;
          return { ...p, estado: "entregado", cobro_cobrado };
        }),
      );
    },
    [setParadas],
  );

  const marcarIncidencia = useCallback(
    (id: string) => {
      setParadas((prev) => cambiarEstado(prev, id, "incidencia"));
    },
    [setParadas],
  );

  const recuperarCliente = useCallback(
    (id: string, _origen: "done" | "issue") => {
      void _origen;
      setParadas((prev) => cambiarEstado(prev, id, "pendiente"));
    },
    [setParadas],
  );

  const indiceFinFranja = (lista: Parada[], franja: Franja) => {
    const rank = FRANJA_RANK[franja];
    let idx = 0;
    for (let i = 0; i < lista.length; i++) {
      if (FRANJA_RANK[lista[i]!.franja] <= rank) idx = i + 1;
      else break;
    }
    return idx;
  };

  const guardarHorario = useCallback(
    (id: string, horario: string, nota: string, siempre: boolean) => {
      setParadas((prev) => {
        const actual = prev.find((p) => p.id === id);
        if (!actual) return prev;
        const item: Parada = { ...actual, horario, franja: calcularFranja(horario) };

        if (siempre) {
          setBaseDatos((base) =>
            base.map((b) =>
              b.codigo === item.codigo
                ? { ...b, horario, nota: nota ? nota : (b.nota ?? "") }
                : b,
            ),
          );
          if (nota) item.nota_entrega = nota;
          item.nota_hoy = "";
        } else {
          item.nota_hoy = nota;
        }

        // Reordena sólo el subconjunto pendiente, sin duplicar registros.
        const otros = prev.filter((p) => p.id !== id);
        const pend = otros.filter((p) => p.estado === "pendiente");
        pend.splice(indiceFinFranja(pend, item.franja), 0, item);
        pend.forEach((c, i) => (c.orden = i + 1));

        if (!franjasManuales.current[item.ruta]) franjasManuales.current[item.ruta] = {};
        franjasManuales.current[item.ruta]![item.codigo] = item.franja;

        const restantes = otros.filter((p) => p.estado !== "pendiente");
        return [...pend, ...restantes];
      });
    },
    [setParadas],
  );

  /** Reordena por id: los índices recibidos son posiciones en la lista pendiente. */
  const reordenar = useCallback(
    (fromIdx: number, toIdx: number | null, franjaDestino: Franja) => {
      setParadas((prev) => {
        const pend = prev.filter((p) => p.estado === "pendiente").map((c) => ({ ...c }));
        const otros = prev.filter((p) => p.estado !== "pendiente");
        if (fromIdx < 0 || fromIdx >= pend.length) return prev;
        const [moved] = pend.splice(fromIdx, 1);
        if (!moved) return prev;
        moved.franja = franjaDestino;
        const destino =
          toIdx === null
            ? indiceFinFranja(pend, franjaDestino)
            : Math.max(0, Math.min(toIdx, pend.length));
        pend.splice(destino, 0, moved);
        pend.forEach((c, i) => (c.orden = i + 1));
        setBaseDatos((base) => persistirOrden(pend, base));
        return [...pend, ...otros];
      });
    },
    [persistirOrden, setParadas],
  );

  const moverParada = useCallback(
    (fromIdx: number, toIdx: number, franjaDestino: Franja) => {
      if (fromIdx === toIdx) return;
      reordenar(fromIdx, toIdx, franjaDestino);
    },
    [reordenar],
  );

  const moverAFranja = useCallback(
    (fromIdx: number, franjaDestino: Franja) => reordenar(fromIdx, null, franjaDestino),
    [reordenar],
  );

  const addObservacion = useCallback((parada: Parada, texto: string) => {
    setIncidencias((prev) => [
      ...prev,
      {
        id: "obs_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        codigo: parada.codigo,
        nombre: parada.nombre,
        ruta: parada.ruta,
        fecha: new Date().toLocaleDateString("es-ES"),
        texto,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const deleteObservacion = useCallback((id: string) => {
    setIncidencias((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const guardarClienteFn = useCallback((cliente: Cliente, idx: number | null) => {
    setBaseDatos((prev) => {
      if (idx === null || idx < 0 || idx >= prev.length) return [...prev, cliente];
      const copia = [...prev];
      copia[idx] = cliente;
      return copia;
    });
  }, []);

  const borrarCliente = useCallback((idx: number) => {
    setBaseDatos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const setRepasoCount = useCallback((codigo: string, valor: number) => {
    setRepasoCounted((prev) => ({ ...prev, [codigo]: Math.max(0, valor) }));
  }, []);

  const resetRepaso = useCallback((codigos: string[]) => {
    setRepasoCounted((prev) => {
      const next = { ...prev };
      codigos.forEach((c) => (next[c] = 0));
      return next;
    });
  }, []);

  const aprenderCodigo = useCallback((raw: string, codigo: string) => {
    setBarcodeMap((prev) => ({ ...prev, [raw]: codigo }));
  }, []);

  const importarCodigos = useCallback((map: Record<string, string>) => {
    let total = 0;
    setBarcodeMap((prev) => {
      const next = { ...prev, ...map };
      total = Object.keys(next).length;
      return next;
    });
    return Object.keys(map).length + total;
  }, []);

  const exportarSesion = useCallback(() => {
    const sesion: SesionExport = {
      fecha: new Date().toDateString(),
      paradas,
      totalesRuta,
      pedidosData,
      baseDatos,
      posicionesCruzadas: posicionesCruzadas.current,
      franjasManuales: franjasManuales.current,
      incidenciasPedido,
    };
    const blob = new Blob([JSON.stringify(sesion)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "sesion_reparto_" + new Date().toLocaleDateString("es-ES").replace(/\//g, "-") + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [paradas, totalesRuta, pedidosData, baseDatos, incidenciasPedido]);

  const importarSesion = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const sesion = JSON.parse(String(e.target?.result)) as SesionExport;
          if (!sesion.fecha) throw new Error("Archivo no válido");
          const origen = sesion.paradas?.length
            ? { paradas: sesion.paradas }
            : migrarDesdeListas(
                sesion.pending ?? [],
                sesion.completed ?? [],
                sesion.issues ?? [],
              );
          const rep = repararEstado(origen.paradas, sesion.totalesRuta ?? null);
          setParadasState(rep.paradas);
          setTotalesRuta(rep.totales);
          totalesRef.current = rep.totales;
          setAviso(rep.mensaje);
          setPedidosData(sesion.pedidosData || {});
          if (sesion.baseDatos?.length) setBaseDatos(sesion.baseDatos);
          if (sesion.posicionesCruzadas) posicionesCruzadas.current = sesion.posicionesCruzadas;
          if (sesion.franjasManuales) franjasManuales.current = sesion.franjasManuales;
          if (sesion.incidenciasPedido) setIncidencias(limpiarAntiguas(sesion.incidenciasPedido));
          resolve(
            `${pendientesDe(rep.paradas).length} pendientes · ${
              entregadasDe(rep.paradas).length
            } entregados · ${incidenciasDe(rep.paradas).length} incidencias`,
          );
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Error al importar"));
        }
      };
      reader.readAsText(file);
    });
  }, []);

  const descartarAviso = useCallback(() => setAviso(null), []);

  const value = useMemo<RutasStore>(
    () => ({
      hidratado,
      baseDatos,
      paradas,
      totalesRuta,
      pending,
      completed,
      issues,
      pedidosData,
      incidenciasPedido,
      barcodeMap,
      repasoCounted,
      currentRuta,
      vista,
      tema,
      avisoReparacion,
      descartarAviso,
      setCurrentRuta,
      setVista,
      setTema: setTemaState,
      procesarRuta,
      procesarPedidos,
      marcarEntregado,
      marcarIncidencia,
      recuperarCliente,
      guardarHorario,
      moverParada,
      moverAFranja,
      addObservacion,
      deleteObservacion,
      guardarCliente: guardarClienteFn,
      borrarCliente,
      setRepasoCount,
      resetRepaso,
      aprenderCodigo,
      importarCodigos,
      exportarSesion,
      importarSesion,
    }),
    [
      hidratado,
      baseDatos,
      paradas,
      totalesRuta,
      pending,
      completed,
      issues,
      pedidosData,
      incidenciasPedido,
      barcodeMap,
      repasoCounted,
      currentRuta,
      vista,
      tema,
      avisoReparacion,
      descartarAviso,
      setVista,
      procesarRuta,
      procesarPedidos,
      marcarEntregado,
      marcarIncidencia,
      recuperarCliente,
      guardarHorario,
      moverParada,
      moverAFranja,
      addObservacion,
      deleteObservacion,
      guardarClienteFn,
      borrarCliente,
      setRepasoCount,
      resetRepaso,
      aprenderCodigo,
      importarCodigos,
      exportarSesion,
      importarSesion,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
