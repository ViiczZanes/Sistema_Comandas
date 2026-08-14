"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input, Select, Field } from "@/components/ui/Input";
import { toast } from "@/lib/toastStore";

type Role = "ADMIN" | "WAITER" | "KITCHEN";

type UserDTO = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  WAITER: "PDV / Caixa",
  KITCHEN: "Cozinha",
};

export function UsersManager({
  users,
  currentUserId,
}: {
  users: UserDTO[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "WAITER" as Role,
  });
  const [loading, setLoading] = useState(false);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error("Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`Usuário "${data.name}" criado.`);
      setForm({ name: "", email: "", password: "", role: "WAITER" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(user: UserDTO) {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    router.refresh();
  }

  async function changeRole(user: UserDTO, role: Role) {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    toast.success(`${user.name} agora é ${ROLE_LABEL[role]}.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form
          onSubmit={createUser}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Papel">
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {Object.entries(ROLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="lg:col-span-4">
            <Button type="submit" loading={loading} icon={<UserPlus />}>
              Adicionar usuário
            </Button>
          </div>
        </form>
      </Card>

      <Card className="divide-y divide-stone-100">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p className="font-medium text-stone-900">
                {user.name}{" "}
                {user.id === currentUserId && (
                  <span className="text-xs text-stone-400">(você)</span>
                )}
              </p>
              <p className="text-sm text-stone-500">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={user.active ? "green" : "neutral"} dot>
                {user.active ? "Ativo" : "Inativo"}
              </Badge>
              <Select
                value={user.role}
                onChange={(e) => changeRole(user, e.target.value as Role)}
                className="w-40 py-1.5"
              >
                {Object.entries(ROLE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={user.id === currentUserId}
                onClick={() => toggleActive(user)}
              >
                {user.active ? "Desativar" : "Ativar"}
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
