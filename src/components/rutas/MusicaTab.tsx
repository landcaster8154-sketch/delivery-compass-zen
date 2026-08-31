import {
  ChevronDown,
  Disc3,
  FolderPlus,
  FolderX,
  ListMusic,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge, Btn, EmptyState, Modal } from "./primitives";
import { cn } from "@/lib/utils";
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
} from "@/lib/musica/db";
import { extraerCaratula } from "@/lib/musica/id3";

const AUDIO_RE = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

function limpiarNombre(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim();
}

function tiempo(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function MusicaTab() {
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
  const [portada, setPortada] = useState(false);
  const [confirmar, setConfirmar] = useState<null | { titulo: string; accion: () => void }>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
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

  /* ---------- persistencia de estado ---------- */
  const persistir = useCallback(
    (extra?: Partial<EstadoReproduccion>) => {
      if (!restaurado.current) return;
      void guardarEstado({
        trackId: actual,
        tiempo: audioRef.current?.currentTime ?? 0,
        aleatorio,
        repeticion,
        volumen,
        ...extra,
      });
    },
    [actual, aleatorio, repeticion, volumen],
  );

  useEffect(() => {
    persistir();
  }, [persistir]);

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
    setActual(id);
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

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !srcUrl) return;
    a.volume = volumen;
    if (sonando) void a.play().catch(() => setSonando(false));
    else a.pause();
  }, [srcUrl, sonando, volumen]);

  const togglePlay = () => {
    if (!actual && cola.length) return reproducir(cola[0]!.id);
    setSonando((v) => !v);
  };

  const ciclarRepeticion = () =>
    setRepeticion((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));

  /* ---------- borrado ---------- */
  const pedirBorrarCarpeta = (nombre: string) =>
    setConfirmar({
      titulo: `¿Eliminar la carpeta “${nombre}” y todas sus canciones?`,
      accion: async () => {
        await borrarCarpeta(nombre);
        setPistas(await listarPistas());
        if (carpeta === nombre) setCarpeta("__todas__");
      },
    });

  const pedirVaciar = () =>
    setConfirmar({
      titulo: "¿Vaciar toda la biblioteca de música?",
      accion: async () => {
        await vaciarBiblioteca();
        setPistas([]);
        setActual(null);
        setSonando(false);
        setCarpeta("__todas__");
      },
    });

  const progreso = dur > 0 ? (pos / dur) * 100 : 0;

  /* ---------- UI ---------- */
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Barra de biblioteca */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-elevated px-4 py-3 sm:px-6">
        <div className="mr-auto flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-accent">
            <Disc3 className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold">ChromeBox Jukebox</p>
            <p className="text-[11px] text-muted-foreground">
              {pistas.length} {pistas.length === 1 ? "canción" : "canciones"} · {carpetas.length}{" "}
              {carpetas.length === 1 ? "carpeta" : "carpetas"}
            </p>
          </div>
        </div>
        <Btn size="sm" onClick={() => filesRef.current?.click()}>
          <ListMusic className="size-4" /> Canciones
        </Btn>
        <Btn size="sm" onClick={() => folderRef.current?.click()}>
          <FolderPlus className="size-4" /> Carpeta
        </Btn>
        {pistas.length > 0 && (
          <Btn size="sm" tone="danger" onClick={pedirVaciar}>
            <Trash2 className="size-4" /> Vaciar
          </Btn>
        )}
        <input
          ref={filesRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void importar(e.target.files, "Sueltas");
            e.target.value = "";
          }}
        />
        <input
          ref={folderRef}
          type="file"
          multiple
          className="hidden"
          // @ts-expect-error atributos no estándar para selección de carpetas
          webkitdirectory=""
          directory=""
          onChange={(e) => {
            void importar(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {importando && (
        <p className="border-b border-border bg-primary/10 px-4 py-2 text-xs text-accent sm:px-6">
          {importando}
        </p>
      )}

      {/* Selector de carpetas */}
      {carpetas.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-4 py-2.5 sm:px-6">
          <button
            onClick={() => setCarpeta("__todas__")}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              carpeta === "__todas__"
                ? "border-primary bg-primary/15 text-accent"
                : "border-border text-muted-foreground hover:bg-secondary",
            )}
          >
            Todas · {pistas.length}
          </button>
          {carpetas.map(([nombre, n]) => (
            <span key={nombre} className="flex shrink-0 items-center">
              <button
                onClick={() => setCarpeta(nombre)}
                className={cn(
                  "rounded-l-full border border-r-0 py-1.5 pl-3 pr-2 text-xs font-semibold transition-colors",
                  carpeta === nombre
                    ? "border-primary bg-primary/15 text-accent"
                    : "border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                {nombre} · {n}
              </button>
              <button
                onClick={() => pedirBorrarCarpeta(nombre)}
                title={`Eliminar carpeta ${nombre}`}
                className={cn(
                  "rounded-r-full border py-1.5 pl-1.5 pr-2.5 transition-colors hover:text-destructive",
                  carpeta === nombre
                    ? "border-primary bg-primary/15 text-accent"
                    : "border-border text-subtle hover:bg-secondary",
                )}
              >
                <FolderX className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="scroll-area min-h-0 flex-1">
        {cargando ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Cargando biblioteca…
          </p>
        ) : cola.length === 0 ? (
          <EmptyState
            icon={<Music className="size-6" />}
            title="Tu biblioteca está vacía"
            hint="Añade canciones sueltas o una carpeta completa. Se guardan en este dispositivo y siguen disponibles sin conexión."
          />
        ) : (
          <ul className="divide-y divide-border">
            {cola.map((p) => {
              const activo = p.id === actual;
              const cover = coverUrls.get(p.id);
              return (
                <li key={p.id}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 transition-colors sm:px-6",
                      activo ? "bg-primary/10" : "hover:bg-secondary/60",
                    )}
                  >
                    <button
                      onClick={() => (activo ? togglePlay() : reproducir(p.id))}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-border bg-elevated">
                        {cover ? (
                          <img src={cover} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-subtle">
                            <Music className="size-4" />
                          </span>
                        )}
                        {activo && (
                          <span className="absolute inset-0 flex items-center justify-center bg-background/60 text-accent">
                            {sonando ? <Pause className="size-4" /> : <Play className="size-4" />}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate text-sm font-semibold",
                            activo && "text-accent",
                          )}
                        >
                          {p.nombre}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {p.carpeta}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        await borrarPista(p.id);
                        setPistas(await listarPistas());
                        if (activo) {
                          setActual(null);
                          setSonando(false);
                        }
                      }}
                      title="Eliminar canción"
                      className="rounded-md p-2 text-subtle transition-colors hover:bg-secondary hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Reproductor */}
      {pista && (
        <div className="border-t border-border bg-elevated px-4 pb-2 pt-3 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPortada(true)}
                title="Ver portada"
                className="size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-card"
              >
                {coverActual ? (
                  <img src={coverActual} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-subtle">
                    <Disc3 className={cn("size-5", sonando && "animate-spin [animation-duration:4s]")} />
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{pista.nombre}</p>
                <p className="truncate text-[11px] text-muted-foreground">{pista.carpeta}</p>
              </div>
              <Badge tone={sonando ? "primary" : "muted"}>{sonando ? "Sonando" : "Pausa"}</Badge>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="tabular w-10 text-right text-[11px] text-muted-foreground">
                {tiempo(pos)}
              </span>
              <input
                type="range"
                min={0}
                max={dur || 0}
                step={0.1}
                value={pos}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setPos(v);
                  if (audioRef.current) audioRef.current.currentTime = v;
                }}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--color-primary)]"
                style={{
                  background: `linear-gradient(to right, var(--color-primary) ${progreso}%, var(--color-secondary) ${progreso}%)`,
                }}
                aria-label="Progreso"
              />
              <span className="tabular w-10 text-[11px] text-muted-foreground">{tiempo(dur)}</span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-2">
              <button
                onClick={() => setAleatorio((v) => !v)}
                title="Aleatorio"
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  aleatorio ? "bg-primary/15 text-accent" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <Shuffle className="size-4" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => saltar(-1)}
                  className="rounded-lg p-2 text-foreground transition-colors hover:bg-secondary"
                  title="Anterior"
                >
                  <SkipBack className="size-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
                  title={sonando ? "Pausar" : "Reproducir"}
                >
                  {sonando ? <Pause className="size-6" /> : <Play className="size-6 translate-x-0.5" />}
                </button>
                <button
                  onClick={() => saltar(1)}
                  className="rounded-lg p-2 text-foreground transition-colors hover:bg-secondary"
                  title="Siguiente"
                >
                  <SkipForward className="size-5" />
                </button>
              </div>

              <button
                onClick={ciclarRepeticion}
                title={
                  repeticion === "off"
                    ? "Repetición desactivada"
                    : repeticion === "all"
                      ? "Repetir todo"
                      : "Repetir una"
                }
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  repeticion === "off"
                    ? "text-muted-foreground hover:bg-secondary"
                    : "bg-primary/15 text-accent",
                )}
              >
                {repeticion === "one" ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
              </button>
            </div>

            <div className="mt-1 flex items-center gap-2 pb-1">
              <Volume2 className="size-3.5 text-subtle" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volumen}
                onChange={(e) => setVolumen(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--color-primary)]"
                aria-label="Volumen"
              />
            </div>
          </div>
        </div>
      )}

      {/* Portada a pantalla completa */}
      {portada && pista && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setPortada(false)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Cerrar portada"
            >
              <ChevronDown className="size-5" />
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
              Reproduciendo
            </p>
            <span className="size-9" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-10">
            <div className="aspect-square w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-panel">
              {coverActual ? (
                <img src={coverActual} alt={pista.nombre} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-subtle">
                  <Disc3 className={cn("size-24", sonando && "animate-spin [animation-duration:6s]")} />
                </div>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold">{pista.nombre}</h2>
              <p className="text-sm text-muted-foreground">{pista.carpeta}</p>
            </div>
            <div className="flex w-full max-w-sm items-center gap-2">
              <span className="tabular w-10 text-right text-[11px] text-muted-foreground">
                {tiempo(pos)}
              </span>
              <input
                type="range"
                min={0}
                max={dur || 0}
                step={0.1}
                value={pos}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setPos(v);
                  if (audioRef.current) audioRef.current.currentTime = v;
                }}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, var(--color-primary) ${progreso}%, var(--color-secondary) ${progreso}%)`,
                }}
                aria-label="Progreso"
              />
              <span className="tabular w-10 text-[11px] text-muted-foreground">{tiempo(dur)}</span>
            </div>
            <div className="flex items-center gap-5">
              <button
                onClick={() => setAleatorio((v) => !v)}
                className={cn("rounded-lg p-2", aleatorio ? "text-accent" : "text-muted-foreground")}
              >
                <Shuffle className="size-5" />
              </button>
              <button onClick={() => saltar(-1)} className="rounded-lg p-2">
                <SkipBack className="size-7" />
              </button>
              <button
                onClick={togglePlay}
                className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
              >
                {sonando ? <Pause className="size-7" /> : <Play className="size-7 translate-x-0.5" />}
              </button>
              <button onClick={() => saltar(1)} className="rounded-lg p-2">
                <SkipForward className="size-7" />
              </button>
              <button
                onClick={ciclarRepeticion}
                className={cn(
                  "rounded-lg p-2",
                  repeticion === "off" ? "text-muted-foreground" : "text-accent",
                )}
              >
                {repeticion === "one" ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={!!confirmar}
        onClose={() => setConfirmar(null)}
        title="Confirmar"
        footer={
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setConfirmar(null)}>Cancelar</Btn>
            <Btn
              tone="danger"
              onClick={() => {
                confirmar?.accion();
                setConfirmar(null);
              }}
            >
              Eliminar
            </Btn>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">{confirmar?.titulo}</p>
      </Modal>

      <audio
        ref={audioRef}
        src={srcUrl ?? undefined}
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          setDur(a.duration || 0);
          if (inicial.current > 0) {
            a.currentTime = Math.min(inicial.current, a.duration || 0);
            inicial.current = 0;
          }
        }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        onEnded={alTerminar}
        onPause={() => persistir()}
        onPlay={() => setSonando(true)}
      />
    </div>
  );
}
