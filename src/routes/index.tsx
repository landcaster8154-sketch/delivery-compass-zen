import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/rutas/AppShell";
import { RutasProvider } from "@/lib/rutas/store";

const title = "Mis Rutas de Reparto — Gestión diaria de entregas";
const description =
  "Organiza tu ruta de reparto: paradas por franja horaria, pedidos, cobros, repaso de carga y resumen del día.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <RutasProvider>
      <MusicaProvider>
        <AppShell />
      </MusicaProvider>
    </RutasProvider>
  );
}
