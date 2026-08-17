import { getSettings } from "@/lib/settings";
import { LoginForm } from "./LoginForm";

// Sem isso o Next prerenderiza essa página como estática no build (ela não
// lê cookies/headers, então nada sinaliza "dinâmica" por padrão) — daí a
// marca configurada em Configurações só apareceria aqui depois de um novo
// build. Login é a porta de entrada, então precisa refletir a marca atual.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getSettings();
  return (
    <LoginForm restaurantName={settings.restaurantName} logoUrl={settings.logoUrl} />
  );
}
