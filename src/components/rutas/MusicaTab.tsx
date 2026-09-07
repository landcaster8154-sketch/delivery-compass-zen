import {
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
import { useEffect, useRef, useState } from "react";

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
  const progreso = dur > 0 ? (pos / dur) * 100 : 0;

  useEffect(() => {
    if (!portada) return;
    const cerrar = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPortada(false);
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [portada]);

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

  const Controles = () => (
    <section
      className="music-controls flex min-h-0 flex-col justify-center border-t px-4 py-3"
      aria-label="Controles de reproducción"
    >
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold">
              {pista?.nombre ?? "Nada en reproducción"}
            </p>
            <p className="music-metadata truncate text-xs">
              {pista?.carpeta ?? "Selecciona una canción"}
            </p>
          </div>
          {pista && (
            <Badge tone={sonando ? "primary" : "muted"}>{sonando ? "Sonando" : "Pausa"}</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="music-metadata tabular w-10 text-right text-xs">
            {tiempo(pos)}
          </span>
          <input
            type="range"
            min={0}
            max={dur || 0}
            step={0.1}
            value={pos}
            onChange={(e) => buscar(Number(e.target.value))}
            className="music-range h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, var(--color-primary) ${progreso}%, var(--color-secondary) ${progreso}%)`,
            }}
            aria-label="Progreso"
          />
          <span className="music-metadata tabular w-10 text-xs">{tiempo(dur)}</span>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
          <button
            onClick={() => setAleatorio((v) => !v)}
            title="Aleatorio"
            aria-pressed={aleatorio}
            className={cn(
              "music-touch justify-self-start",
              aleatorio ? "music-touch-active" : "music-touch-inactive",
            )}
          >
            <Shuffle className="size-5" />
          </button>
          <button onClick={() => saltar(-1)} className="music-touch" title="Anterior">
            <SkipBack className="size-7" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!pista}
            className="music-play-button flex size-16 items-center justify-center rounded-full shadow-music-control transition-transform active:scale-95 disabled:opacity-40"
            title={sonando ? "Pausar" : "Reproducir"}
          >
            {sonando ? <Pause className="size-8" /> : <Play className="size-8 translate-x-0.5" />}
          </button>
          <button onClick={() => saltar(1)} className="music-touch" title="Siguiente">
            <SkipForward className="size-7" />
          </button>
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
              "music-touch justify-self-end",
              repeticion === "off" ? "music-touch-inactive" : "music-touch-active",
            )}
          >
            {repeticion === "one" ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
          </button>
        </div>

        <div className="music-volume mt-4 flex items-center gap-3 rounded-lg border px-3 py-2">
          <Volume2 className="music-metadata size-4 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volumen}
            onChange={(e) => setVolumen(Number(e.target.value))}
            className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--color-primary)]"
            aria-label="Volumen"
          />
        </div>
      </div>
    </section>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {importando && (
        <p className="border-b border-border bg-primary/10 px-4 py-1.5 text-xs text-accent">
          {importando}
        </p>
      )}

      <div className="music-layout min-h-0 flex-1">
        <section
          className="music-library flex min-h-0 flex-col border-b"
          aria-label="Biblioteca de música"
        >
          <header className="music-library-header border-b px-3 py-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-accent">
                  <Disc3 className="size-5" />
                </span>
                <div className="min-w-0 leading-tight">
                  <h2 className="truncate font-display text-sm font-bold">Biblioteca</h2>
                  <p className="music-metadata truncate text-[11px]">
                    {pistas.length} canciones · {carpetas.length} carpetas
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Btn size="sm" onClick={() => filesRef.current?.click()} title="Añadir canciones">
                  <ListMusic className="size-4" />
                  <span className="hidden sm:inline">Canciones</span>
                </Btn>
                <Btn size="sm" onClick={() => folderRef.current?.click()} title="Añadir carpeta">
                  <FolderPlus className="size-4" />
                  <span className="hidden sm:inline">Carpeta</span>
                </Btn>
                {pistas.length > 0 && (
                  <Btn size="sm" tone="danger" onClick={pedirVaciar} title="Vaciar biblioteca">
                    <Trash2 className="size-4" />
                  </Btn>
                )}
              </div>
            </div>
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
              className="hidden" // @ts-expect-error atributos no estándar para selección de carpetas
              webkitdirectory=""
              directory=""
              onChange={(e) => {
                void importar(e.target.files);
                e.target.value = "";
              }}
            />
          </header>

          {carpetas.length > 0 && (
            <div className="music-folders no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b px-3 py-1.5">
              <button
                onClick={() => setCarpeta("__todas__")}
                className={cn(
                  "music-folder-button shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-semibold",
                  carpeta === "__todas__"
                    ? "border-primary bg-primary/15 text-accent"
                    : "border-border text-muted-foreground",
                )}
              >
                Todas · {pistas.length}
              </button>
              {carpetas.map(([nombre, n]) => (
                <span key={nombre} className="flex shrink-0">
                  <button
                    onClick={() => setCarpeta(nombre)}
                    className={cn(
                      "music-folder-button rounded-l-md border border-r-0 px-2.5 py-1.5 text-xs font-semibold",
                      carpeta === nombre
                        ? "border-primary bg-primary/15 text-accent"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {nombre} · {n}
                  </button>
                  <button
                    onClick={() => pedirBorrarCarpeta(nombre)}
                    title={`Eliminar carpeta ${nombre}`}
                    className="music-folder-delete rounded-r-md border px-2"
                  >
                    <FolderX className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="scroll-area min-h-0 flex-1">
            {cargando ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Cargando biblioteca…
              </p>
            ) : cola.length === 0 ? (
              <EmptyState
                icon={<Music className="size-6" />}
                title="Tu biblioteca está vacía"
                hint="Añade canciones o una carpeta. Quedarán guardadas sin conexión."
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {cola.map((p) => {
                  const activo = p.id === actual;
                  const cover = coverUrls.get(p.id);
                  return (
                    <li
                      key={p.id}
                      className={cn(
                        "music-track-row group flex min-h-14 items-center gap-2 px-3 py-1.5",
                        activo && "music-track-row-active",
                      )}
                    >
                      <button
                        onClick={() => (activo ? togglePlay() : reproducir(p.id))}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                          <span className="music-track-cover relative size-10 shrink-0 overflow-hidden rounded-md border">
                          {cover ? (
                            <img src={cover} alt="" className="size-full object-cover" />
                          ) : (
                              <span className="music-metadata flex size-full items-center justify-center">
                              <Music className="size-4" />
                            </span>
                          )}
                          {activo && (
                            <span className="music-track-playing absolute inset-0 flex items-center justify-center">
                              {sonando ? <Pause className="size-4" /> : <Play className="size-4" />}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-sm font-semibold",
                              activo && "music-track-title-active",
                            )}
                          >
                            {p.nombre}
                          </span>
                          <span className="music-metadata block truncate text-[11px]">
                            {p.carpeta}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => void eliminarPista(p.id)}
                        title="Eliminar canción"
                        className="music-row-action music-delete-action"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section
          className="music-cover flex min-h-0 items-center justify-center px-4 py-3"
          aria-label="Carátula actual"
        >
          <button
            onClick={() => pista && setPortada(true)}
            disabled={!pista}
            className="group flex w-full flex-col items-center disabled:cursor-default"
          >
            <span className="music-cover-art aspect-square w-full max-w-[40vh] overflow-hidden rounded-2xl border shadow-panel transition-transform group-active:scale-[0.98]">
              {coverActual ? (
                <img
                  src={coverActual}
                  alt={`Carátula de ${pista?.nombre ?? "la canción"}`}
                  className="size-full object-contain"
                />
              ) : (
                <span className="music-metadata flex size-full items-center justify-center">
                  <Disc3
                    className={cn("size-16", sonando && "animate-spin [animation-duration:6s]")}
                  />
                </span>
              )}
            </span>
            <span className="mt-2 max-w-full truncate font-display text-sm font-bold">
              {pista?.nombre ?? "Sin reproducción"}
            </span>
            <span className="music-metadata max-w-full truncate text-[11px]">
              {pista?.carpeta ?? "La carátula aparecerá aquí"}
            </span>
          </button>
        </section>

        <Controles />
      </div>

      {portada && pista && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Cerrar vista de carátula"
          onClick={() => setPortada(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setPortada(false);
          }}
          className="music-fullscreen fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center"
        >
          {coverActual ? (
            <img
              src={coverActual}
              alt={`Carátula de ${pista.nombre}`}
              className="h-auto max-h-[85vh] w-auto max-w-[96vw] object-contain"
            />
          ) : (
            <Disc3
              className={cn(
                "music-fullscreen-placeholder size-24",
                sonando && "animate-spin [animation-duration:6s]",
              )}
            />
          )}
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
