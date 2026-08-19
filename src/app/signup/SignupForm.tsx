"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, User, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Logo } from "@/components/Logo";

export function SignupForm() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName, adminName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar sua conta.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,theme(colors.brand.100),transparent)]"
      />

      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size="md" name="Comandas" logoUrl={null} />
        </div>

        <form
          onSubmit={onSubmit}
          className="animate-slide-up space-y-5 rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-900/5"
        >
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-bold text-stone-900">
              Criar meu restaurante
            </h1>
            <p className="text-sm text-stone-500">
              Cadastro do dono/administrador — o cardápio, mesas e equipe
              você configura depois, já dentro do sistema.
            </p>
          </div>

          <Field label="Nome do restaurante" htmlFor="restaurantName">
            <Input
              id="restaurantName"
              required
              autoFocus
              icon={<Store />}
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Ex: Cantina do Zé"
            />
          </Field>

          <Field label="Seu nome" htmlFor="adminName">
            <Input
              id="adminName"
              required
              icon={<User />}
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Ex: José da Silva"
            />
          </Field>

          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              icon={<Mail />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@restaurante.com"
            />
          </Field>

          <Field label="Senha" htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              icon={<Lock />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="No mínimo 6 caracteres"
            />
          </Field>

          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            {!loading && (
              <>
                Criar restaurante
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-sm text-stone-500">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
