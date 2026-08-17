"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Logo } from "@/components/Logo";

function homeForRole(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "WAITER") return "/pdv";
  if (role === "KITCHEN") return "/kitchen";
  return "/";
}

export function LoginForm({
  restaurantName,
  logoUrl,
}: {
  restaurantName: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }
      router.push(homeForRole(data.role));
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
          <Logo size="md" name={restaurantName} logoUrl={logoUrl} />
        </div>

        <form
          onSubmit={onSubmit}
          className="animate-slide-up space-y-5 rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-900/5"
        >
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-bold text-stone-900">
              Entrar na área da equipe
            </h1>
            <p className="text-sm text-stone-500">
              Administração, cozinha e caixa.
            </p>
          </div>

          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              autoFocus
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
              icon={<Lock />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
                Entrar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
