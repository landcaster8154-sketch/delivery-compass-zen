import {
  Download,
  FileText,
  Moon,
  Music,
  ScanBarcode,
  Sun,
  Truck,
  Upload,
  Users,
  ClipboardList,
  MoonStar,
  Navigation,
} from "lucide-react";
import { useRef, useState } from "react";

import { ClientesTab } from "./ClientesTab";
import { MusicaTab } from "./MusicaTab";
import { PdfTab } from "./PdfTab";
import { RepartoTab } from "./RepartoTab";
import { RepasoTab } from "./RepasoTab";
import { ResumenTab } from "./ResumenTab";
import { ConduccionView } from "./ConduccionView";

import { cn } from "@/lib/utils";
import { fechaLarga } from "@/lib/rutas/logic";
import { useRutas } from "@/lib/rutas/store";
const logo = "/__l5e/assets-v1/0b70999a-5237-4a61-ae1b-a3838ce8bf1e/logo.jpg";

type Tab = "reparto" | "pdf" | "repaso" | "base" | "resumen" | "musica";

const TABS: { id: Tab; label: string; icon: typeof Truck }[] = [
  { id: "reparto", label: "Reparto", icon: Truck },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "repaso", label: "Repaso", icon: ScanBarcode },
  { id: "base", label: "Clientes", icon: Users },
  { id: "resumen", label: "Resumen", icon: ClipboardList },
  { id: "musica", label: "Música", icon: Music },
];

export function AppShell() {
  const s = useRutas();
  const [tab, setTab] = useState<Tab>("reparto");
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [conduccion, setConduccion] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border bg-elevated px-4 py-2.5 sm:px-6">
        <img src={logo} alt="Logo" className="size-9 rounded-lg object-cover" />
        <div className="mr-auto min-w-0">
          <h1 className="font-display text-sm font-bold leading-tight sm:text-base">
            Mis Rutas de Reparto
          </h1>
          <p className="truncate text-[11px] capitalize text-muted-foreground">{fechaLarga()}</p>
        </div>
        <button
          onClick={() => s.exportarSesion()}
          title="Exportar sesión"
          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Download className="size-4" />
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          title="Importar sesión"
          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Upload className="size-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setMsg(await s.importarSesion(f));
            e.target.value = "";
            setTimeout(() => setMsg(null), 3000);
          }}
        />
        <button
          onClick={() => setConduccion(true)}
          className="flex items-center gap-2 rounded-xl border-2 border-primary bg-primary px-3 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground"
        >
          <Navigation className="size-5" />
          <span className="hidden sm:inline">Conducción</span>
        </button>
        <button
          onClick={() => s.setTema("dark")}
          title="Forzar modo oscuro"
          className="flex items-center gap-2 rounded-xl border-2 border-border-strong bg-elevated px-3 py-2.5 text-sm font-black uppercase tracking-wide text-foreground"
        >
          <MoonStar className="size-5" />
          <span className="hidden md:inline">Forzar modo oscuro</span>
        </button>
        <button
          onClick={() => s.setTema(s.tema === "dark" ? "light" : "dark")}
          title="Cambiar tema"
          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {s.tema === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </header>

      {msg && (
        <p className="border-b border-border bg-primary/10 px-4 py-2 text-xs text-accent sm:px-6">
          {msg}
        </p>
      )}

      {s.avisoReparacion && (
        <div className="flex items-center gap-3 border-b border-warning/40 bg-warning/15 px-4 py-2 text-sm font-semibold text-warning sm:px-6">
          <span className="flex-1">{s.avisoReparacion}</span>
          <button
            onClick={s.descartarAviso}
            className="rounded-lg border border-warning/50 px-3 py-1 text-xs font-bold uppercase"
          >
            Entendido
          </button>
        </div>
      )}


      {conduccion ? (
        <ConduccionView onSalir={() => setConduccion(false)} />
      ) : (
      <>
      <main className="flex min-h-0 flex-1 flex-col">
        {tab === "reparto" && <RepartoTab onIrAResumen={() => setTab("resumen")} />}
        {tab === "pdf" && <PdfTab onProcesado={() => setTab("reparto")} />}
        {tab === "repaso" && <RepasoTab />}
        {tab === "base" && <ClientesTab />}
        {tab === "resumen" && <ResumenTab />}
        {tab === "musica" && <MusicaTab />}

      </main>

      <nav className="border-t border-border bg-elevated pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
                tab === id
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
      </>
      )}
    </div>
  );
}
