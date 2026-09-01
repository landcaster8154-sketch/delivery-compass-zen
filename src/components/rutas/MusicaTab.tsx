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
import { useRef, useState } from "react";

import { Badge, Btn, EmptyState, Modal } from "./primitives";
import { cn } from "@/lib/utils";
import { useMusica } from "@/lib/musica/player";

function tiempo(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function MusicaTab() {
  const {
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
  } = useMusica();

  const [portada, setPortada] = useState(false);
  const [confirmar, setConfirmar] = useState<null | { titulo: string; accion: () => void }>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const pedirBorrarCarpeta = (nombre: string) =>
    setConfirmar({
      titulo: `¿Eliminar la carpeta “${nombre}” y todas sus canciones?`,
      accion: () => void eliminarCarpeta(nombre),
    });

  const pedirVaciar = () =>
    setConfirmar({
      titulo: "¿Vaciar toda la biblioteca de música?",
      accion: () => void vaciar(),
    });

  const progreso = dur > 0 ? (pos / dur) * 100 : 0;

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
                      onClick={() => void eliminarPista(p.id)}
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
                onChange={(e) => buscar(Number(e.target.value))}
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
                onChange={(e) => buscar(Number(e.target.value))}
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
    </div>
  );
}
