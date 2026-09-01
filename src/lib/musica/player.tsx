/**
 * Estado global del reproductor (ChromeBox Jukebox).
 * Vive a nivel de aplicación: el elemento <audio> lo renderiza el propio provider,
 * de modo que cambiar de pestaña NO desmonta el reproductor ni reinicia la reproducción.
 */
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

import {
  borrarCarpeta,
  borrarPista,
  guardarEstado,
  guardarPista,
  leerEstado,
  listarPistas,
  vaciarBiblioteca,
  type EstadoReproduccion,
  type Pista,
} from "./db";
import { extraerCaratula } from "./id3";

const AUDIO_RE = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

function limpiarNombre(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim();
}

export interface MusicaCtx {
  pistas: Pista[];
  cargando: boolean;
  importando: string | null;
  carpeta: string;
  setCarpeta: (c: string) => void;
  carpetas: [string, number][];
  cola: Pista[];
  pista: Pista | null;
  actual: string | null;
  sonando: boolean;
  pos: number;
  dur: number;
  aleatorio: boolean;
  setAleatorio: React.Dispatch<React.SetStateAction<boolean>>;
  repeticion: EstadoReproduccion["repeticion"];
  ciclarRepeticion: () => void;
  volumen: number;
  setVolumen: (v: number) => void;
  coverUrls: Map<string, string>;
  coverActual: string | null;
  importar: (files: FileList | null, carpetaForzada?: string) => Promise<void>;
  reproducir: (id: string) => void;
  togglePlay: () => void;
  saltar: (dir: 1 | -1) => void;
  buscar: (segundo: number) => void;
  eliminarPista: (id: string) => Promise<void>;
  eliminarCarpeta: (nombre: string) => Promise<void>;
  vaciar: () => Promise<void>;
}

const Ctx = createContext<MusicaCtx | null>(null);

export function useMusica() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMusica debe usarse dentro de MusicaProvider");
  return v;
}

export function MusicaProvider({ children }: { children: ReactNode }) {
  const [pistas, setPistas] = useState<Pista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [importando, setImportando] = useState<string | null>(null);
  const [carpeta, setCarpeta] = useState<string>("__todas__");
  const [actual, setActual] = useState<string | null>(null);
  const [sonando, setSonando] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [aleatorio, setAleatorio] = useState(false);
  const [repeticion, setRepeticion] = useState<EstadoReproduccion["repeticion"]>("off");
  const [volumen, setVolumen] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const restaurado = useRef(false);
  const inicial = useRef<number>(0);

  /* ---------- carga inicial ---------- */
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [lista, estado] = await Promise.all([listarPistas(), leerEstado()]);
        if (!vivo) return;
        setPistas(lista);
        if (estado) {
          setAleatorio(estado.aleatorio);
          setRepeticion(estado.repeticion);
          setVolumen(estado.volumen ?? 1);
          if (estado.trackId && lista.some((p) => p.id === estado.trackId)) {
            inicial.current = estado.tiempo || 0;
            setPos(estado.tiempo || 0);
            setActual(estado.trackId);
          }
        }
      } finally {
        if (vivo) {
          setCargando(false);
          restaurado.current = true;
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  /* ---------- derivados ---------- */
  const carpetas = useMemo(() => {
    const set = new Map<string, number>();
    for (const p of pistas) set.set(p.carpeta, (set.get(p.carpeta) ?? 0) + 1);
    return [...set.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [pistas]);

  const cola = useMemo(
    () => (carpeta === "__todas__" ? pistas : pistas.filter((p) => p.carpeta === carpeta)),
    [pistas, carpeta],
  );

  const pista = useMemo(() => pistas.find((p) => p.id === actual) ?? null, [pistas, actual]);

  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pista) {
      setSrcUrl(null);
      return;
    }
    const url = URL.createObjectURL(pista.blob);
    setSrcUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pista]);

  const coverUrls = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pistas) if (p.cover) m.set(p.id, URL.createObjectURL(p.cover));
    return m;
  }, [pistas]);
  useEffect(() => () => coverUrls.forEach((u) => URL.revokeObjectURL(u)), [coverUrls]);

  const coverActual = actual ? (coverUrls.get(actual) ?? null) : null;

  /* ---------- persistencia ---------- */
  const persistirRef = useRef<() => void>(() => {});
  const persistir = useCallback(() => {
    if (!restaurado.current) return;
    void guardarEstado({
      trackId: actual,
      tiempo: audioRef.current?.currentTime ?? 0,
      aleatorio,
      repeticion,
      volumen,
    });
  }, [actual, aleatorio, repeticion, volumen]);
  persistirRef.current = persistir;

  useEffect(() => {
    persistir();
  }, [persistir]);

  // Guardado periódico del punto de reproducción y al ocultar/cerrar la app.
  useEffect(() => {
    const id = window.setInterval(() => persistirRef.current(), 5000);
    const onHide = () => persistirRef.current();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      persistirRef.current();
    };
  }, []);

  /* ---------- importación ---------- */
  const importar = useCallback(async (files: FileList | null, carpetaForzada?: string) => {
    if (!files?.length) return;
    const lista = [...files].filter((f) => AUDIO_RE.test(f.name) || f.type.startsWith("audio/"));
    if (!lista.length) {
      setImportando(null);
      return;
    }
    for (let i = 0; i < lista.length; i++) {
      const f = lista[i]!;
      setImportando(`Añadiendo ${i + 1}/${lista.length}: ${limpiarNombre(f.name)}`);
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
      const carp = carpetaForzada ?? (rel.includes("/") ? rel.split("/")[0]! : "Sueltas");
      const cover = await extraerCaratula(f);
      await guardarPista({
        id: `${carp}::${f.name}::${f.size}`,
        nombre: limpiarNombre(f.name),
        carpeta: carp,
        tipo: f.type || "audio/mpeg",
        tamano: f.size,
        addedAt: Date.now(),
        blob: f,
        cover,
      });
    }
    setPistas(await listarPistas());
    setImportando(null);
  }, []);

  /* ---------- reproducción ---------- */
  const indice = cola.findIndex((p) => p.id === actual);

  const reproducir = useCallback((id: string) => {
    inicial.current = 0;
    setActual((prev) => {
      if (prev === id) {
        const a = audioRef.current;
        if (a) {
          a.currentTime = 0;
          void a.play();
        }
      }
      return id;
    });
    setSonando(true);
  }, []);

  const saltar = useCallback(
    (dir: 1 | -1) => {
      if (!cola.length) return;
      if (aleatorio && cola.length > 1) {
        let n = indice;
        while (n === indice) n = Math.floor(Math.random() * cola.length);
        reproducir(cola[n]!.id);
        return;
      }
      const base = indice < 0 ? 0 : indice;
      const n = (base + dir + cola.length) % cola.length;
      reproducir(cola[n]!.id);
    },
    [cola, indice, aleatorio, reproducir],
  );

  const alTerminar = useCallback(() => {
    const a = audioRef.current;
    if (repeticion === "one" && a) {
      a.currentTime = 0;
      void a.play();
      return;
    }
    if (!cola.length) return;
    const ultimo = !aleatorio && indice === cola.length - 1;
    if (ultimo && repeticion === "off") {
      setSonando(false);
      return;
    }
    saltar(1);
  }, [repeticion, cola.length, indice, aleatorio, saltar]);

  // Play/pause solo reacciona a cambios explícitos de "sonando" o de pista.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !srcUrl) return;
    if (sonando) {
      if (a.paused) void a.play().catch(() => setSonando(false));
    } else if (!a.paused) {
      a.pause();
    }
  }, [srcUrl, sonando]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volumen;
  }, [volumen, srcUrl]);

  const togglePlay = useCallback(() => {
    if (!actual && cola.length) return reproducir(cola[0]!.id);
    setSonando((v) => !v);
  }, [actual, cola, reproducir]);

  const ciclarRepeticion = useCallback(
    () => setRepeticion((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
    [],
  );

  const buscar = useCallback((segundo: number) => {
    setPos(segundo);
    if (audioRef.current) audioRef.current.currentTime = segundo;
  }, []);

  /* ---------- biblioteca ---------- */
  const eliminarPista = useCallback(
    async (id: string) => {
      await borrarPista(id);
      setPistas(await listarPistas());
      if (id === actual) {
        setActual(null);
        setSonando(false);
      }
    },
    [actual],
  );

  const eliminarCarpeta = useCallback(
    async (nombre: string) => {
      await borrarCarpeta(nombre);
      const lista = await listarPistas();
      setPistas(lista);
      if (carpeta === nombre) setCarpeta("__todas__");
      if (actual && !lista.some((p) => p.id === actual)) {
        setActual(null);
        setSonando(false);
      }
    },
    [carpeta, actual],
  );

  const vaciar = useCallback(async () => {
    await vaciarBiblioteca();
    setPistas([]);
    setActual(null);
    setSonando(false);
    setCarpeta("__todas__");
  }, []);

  const value: MusicaCtx = {
    pistas,
    cargando,
    importando,
    carpeta,
    setCarpeta,
    carpetas,
    cola,
    pista,
    actual,
    sonando,
    pos,
    dur,
    aleatorio,
    setAleatorio,
    repeticion,
    ciclarRepeticion,
    volumen,
    setVolumen,
    coverUrls,
    coverActual,
    importar,
    reproducir,
    togglePlay,
    saltar,
    buscar,
    eliminarPista,
    eliminarCarpeta,
    vaciar,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* El <audio> vive aquí: nunca se desmonta al cambiar de pestaña. */}
      <audio
        ref={audioRef}
        src={srcUrl ?? undefined}
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          setDur(a.duration || 0);
          a.volume = volumen;
          if (inicial.current > 0) {
            a.currentTime = Math.min(inicial.current, a.duration || 0);
            inicial.current = 0;
          }
        }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        onEnded={alTerminar}
        onPause={() => persistirRef.current()}
        onPlay={() => setSonando(true)}
      />
    </Ctx.Provider>
  );
}
