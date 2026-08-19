import { LoginForm } from "./LoginForm";

// Login é compartilhado por TODOS os restaurantes (multi-tenant) — não dá
// pra mostrar a marca de um restaurante específico aqui, já que a pessoa
// ainda não disse quem é. Mostra a identidade da plataforma; a marca do
// próprio restaurante aparece depois, já dentro de /admin, /pdv ou
// /kitchen.
export default function LoginPage() {
  return <LoginForm restaurantName="Comandas" logoUrl={null} />;
}
