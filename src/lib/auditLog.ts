import "server-only";
import { prisma } from "@/lib/prisma";

// Registro de auditoria — "quem cancelou aquele pedido, quem editou o preço,
// quem encerrou uma comanda com saldo em aberto". Só escreve, nunca edita
// nem apaga; ver /admin/log pra tela de leitura (só ADMIN).
//
// Erro ao gravar o log NUNCA deve derrubar a ação principal (cancelar um
// pedido tem que funcionar mesmo se, por algum motivo, o log falhar) — por
// isso é fire-and-forget com catch silencioso, chamado depois da ação já
// ter sido concluída.
export async function logAction(entry: {
  restaurantId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  detail?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        restaurantId: entry.restaurantId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
        detail: entry.detail ?? null,
      },
    });
  } catch (err) {
    console.error("[auditLog] falha ao registrar:", entry.action, err);
  }
}
