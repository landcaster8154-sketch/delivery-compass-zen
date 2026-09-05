export type Franja = "urgente" | "segunda" | "ultima";

export interface Cliente {
  codigo: string;
  nombre: string;
  direccion: string;
  ruta: string;
  orden: number;
  telefono?: string;
  horario?: string;
  nota?: string;
}

export type EstadoParada = "pendiente" | "entregado" | "incidencia";

/** Total original de paradas por ruta, fijado al crear/importar la ruta. */
export type TotalesRuta = Record<string, number>;

export interface Parada {
  id: string;
  estado: EstadoParada;

  codigo: string;
  nombre: string;
  direccion: string;
  ruta: string;
  rutaCasa: string;
  esNuevo: boolean;
  esPrestado: boolean;
  sinUbicar: boolean;
  orden: number;
  horario: string;
  franja: Franja;
  nota_entrega: string;
  nota_hoy: string;
  telefono: string;
  cobro_obligatorio: boolean;
  cobro_monto: number | null;
  cobro_forma: string | null;
  cobro_cobrado: boolean | null;
}

export interface LineaPedido {
  cod: string;
  desc: string;
  cajas: number;
}

export type PedidosData = Record<string, LineaPedido[]>;

export interface ObservacionPedido {
  id: string;
  codigo: string;
  nombre: string;
  ruta: string;
  fecha: string;
  texto: string;
  timestamp: number;
}

export interface RefRepaso {
  desc: string;
  total: number;
  clientes: { nombre: string; cajas: number }[];
}

export type Vista = "normal" | "compact" | "car" | "timeline";
export type Tema = "dark" | "light";

export interface SesionExport {
  fecha: string;
  /** Formato actual: array canónico + totales originales. */
  paradas?: Parada[];
  totalesRuta?: TotalesRuta;
  /** Formato heredado (se migra al importar). */
  pending?: Parada[];
  completed?: Parada[];
  issues?: Parada[];
  pedidosData: PedidosData;
  baseDatos: Cliente[];
  posicionesCruzadas: Record<string, Record<string, number>>;
  franjasManuales: Record<string, Record<string, Franja>>;
  incidenciasPedido: ObservacionPedido[];
}

