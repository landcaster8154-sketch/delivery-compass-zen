import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type EstadoDum = "activo" | "cerrado";
export type EstadoTrafico = "fluido" | "retencion" | "atasco";

export interface TraficoDato {
  estado: EstadoTrafico;
  ts: number;
}

const K_DUM = "rr_dum_estados";
const K_DUM_URL = "rr_dum_url";
const K_TRAFICO = "rr_trafico";

export const DUM_DEEP_LINK = "madrid360dum://";
export const DUM_URL_DEFECTO = "https://dum.madrid.es/";

function leer<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function escribir(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export const TRAFICO_META: Record<
  EstadoTrafico,
  { label: string; clase: string; punto: string }
> = {
  fluido: {
    label: "Fluido",
    clase: "border-success/40 bg-success/12 text-success",
    punto: "bg-success",
  },
  retencion: {
    label: "Retención",
    clase: "border-warning/40 bg-warning/12 text-warning",
    punto: "bg-warning",
  },
  atasco: {
    label: "Atasco grave",
    clase: "border-destructive/40 bg-destructive/12 text-destructive",
    punto: "bg-destructive",
  },
};

export function traficoDesactualizado(ts: number) {
  return Date.now() - ts > 3 * 60 * 60 * 1000;
}

export function fechaTrafico(ts: number) {
  return new Date(ts).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DumStore {
  estados: Record<string, EstadoDum>;
  dumUrl: string;
  trafico: Record<string, TraficoDato>;
  estadoDum: (id: string) => EstadoDum;
  setEstadoDum: (id: string, estado: EstadoDum) => void;
  setDumUrl: (url: string) => void;
  setTrafico: (ruta: string, estado: EstadoTrafico) => void;
  abrirDum: () => void;
}

const Ctx = createContext<DumStore | null>(null);

export function useDum() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDum debe usarse dentro de <DumProvider>");
  return ctx;
}

export function DumProvider({ children }: { children: ReactNode }) {
  const [estados, setEstados] = useState<Record<string, EstadoDum>>(() =>
    leer<Record<string, EstadoDum>>(K_DUM, {}),
  );
  const [trafico, setTraficoState] = useState<Record<string, TraficoDato>>(() =>
    leer<Record<string, TraficoDato>>(K_TRAFICO, {}),
  );
  const [dumUrl, setDumUrlState] = useState<string>(() =>
    leer<string>(K_DUM_URL, DUM_URL_DEFECTO),
  );

  // Rehidratación en cliente (por si el primer render fue en servidor).
  useEffect(() => {
    setEstados(leer<Record<string, EstadoDum>>(K_DUM, {}));
    setTraficoState(leer<Record<string, TraficoDato>>(K_TRAFICO, {}));
    setDumUrlState(leer<string>(K_DUM_URL, DUM_URL_DEFECTO));
  }, []);

  const setEstadoDum = useCallback((id: string, estado: EstadoDum) => {
    setEstados((prev) => {
      const next = { ...prev, [id]: estado };
      escribir(K_DUM, next);
      return next;
    });
  }, []);

  const setTrafico = useCallback((ruta: string, estado: EstadoTrafico) => {
    setTraficoState((prev) => {
      const next = { ...prev, [ruta]: { estado, ts: Date.now() } };
      escribir(K_TRAFICO, next);
      return next;
    });
  }, []);

  const setDumUrl = useCallback((url: string) => {
    setDumUrlState(url);
    escribir(K_DUM_URL, url);
  }, []);

  const abrirDum = useCallback(() => {
    const destino = dumUrl.trim() || DUM_URL_DEFECTO;
    let volvio = false;
    const marcar = () => (volvio = true);
    document.addEventListener("visibilitychange", marcar, { once: true });
    try {
      window.location.href = DUM_DEEP_LINK;
    } catch {
      /* deep link no soportado */
    }
    // Fallback: si el deep link no abrió nada, abrimos la web oficial/configurable.
    window.setTimeout(() => {
      document.removeEventListener("visibilitychange", marcar);
      if (!volvio && !document.hidden) window.open(destino, "_blank", "noopener");
    }, 1200);
  }, [dumUrl]);

  const value = useMemo<DumStore>(
    () => ({
      estados,
      trafico,
      dumUrl,
      estadoDum: (id: string) => estados[id] ?? "activo",
      setEstadoDum,
      setDumUrl,
      setTrafico,
      abrirDum,
    }),
    [estados, trafico, dumUrl, setEstadoDum, setDumUrl, setTrafico, abrirDum],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
