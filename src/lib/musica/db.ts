/**
 * Biblioteca de audio persistente en IndexedDB (independiente del resto de la app).
 * Base "chromebox-jukebox": almacén "tracks" (audio + carátula) y "meta" (estado).
 */

export interface Pista {
  id: string;
  nombre: string;
  carpeta: string;
  tipo: string;
  tamano: number;
  addedAt: number;
  blob: Blob;
  cover: Blob | null;
}

export type PistaMeta = Omit<Pista, "blob" | "cover"> & { tieneCover: boolean };

export interface EstadoReproduccion {
  trackId: string | null;
  tiempo: number;
  aleatorio: boolean;
  repeticion: "off" | "all" | "one";
  volumen: number;
}

const DB_NAME = "chromebox-jukebox";
const DB_VERSION = 1;
const TRACKS = "tracks";
const META = "meta";

let dbPromise: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TRACKS)) {
        const store = db.createObjectStore(TRACKS, { keyPath: "id" });
        store.createIndex("carpeta", "carpeta", { unique: false });
      }
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) {
  return abrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function listarPistas(): Promise<Pista[]> {
  const all = await tx<Pista[]>(TRACKS, "readonly", (s) => s.getAll() as IDBRequest<Pista[]>);
  return all.sort(
    (a, b) => a.carpeta.localeCompare(b.carpeta) || a.nombre.localeCompare(b.nombre, "es"),
  );
}

export async function guardarPista(p: Pista): Promise<void> {
  await tx(TRACKS, "readwrite", (s) => s.put(p));
}

export async function borrarPista(id: string): Promise<void> {
  await tx(TRACKS, "readwrite", (s) => s.delete(id));
}

export async function borrarCarpeta(carpeta: string): Promise<void> {
  const db = await abrir();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(TRACKS, "readwrite");
    const idx = t.objectStore(TRACKS).index("carpeta");
    const req = idx.openCursor(IDBKeyRange.only(carpeta));
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        cur.delete();
        cur.continue();
      }
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function vaciarBiblioteca(): Promise<void> {
  await tx(TRACKS, "readwrite", (s) => s.clear());
}

export async function leerEstado(): Promise<EstadoReproduccion | null> {
  const v = await tx<EstadoReproduccion | undefined>(
    META,
    "readonly",
    (s) => s.get("estado") as IDBRequest<EstadoReproduccion | undefined>,
  );
  return v ?? null;
}

export async function guardarEstado(e: EstadoReproduccion): Promise<void> {
  await tx(META, "readwrite", (s) => s.put(e, "estado"));
}
