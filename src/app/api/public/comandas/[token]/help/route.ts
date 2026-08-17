import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/events";

// Cliente aperta "Preciso de ajuda" (cardápio ou tela da conta). Isso só
// avisa o PDV — é quem circula pelo salão e pode ir até a mesa resolver.
//
// Idempotente: se já existe um chamado não resolvido para esta comanda,
// devolve ele em vez de criar outro — evita que um clique duplo (ou o
// cliente abrindo em duas abas) vire uma fila de avisos repetidos pro PDV.
export async function POST(
  request: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  // `tableToken` é opcional: a tela do cardápio (que sempre sabe em qual
  // mesa está) manda ele; a tela da conta (só sabe a comanda) não manda.
  const body = await request.json().catch(() => ({}));
  const tableToken =
    typeof body?.tableToken === "string" ? body.tableToken : null;

  const comanda = await prisma.comanda.findUnique({ where: { token } });
  if (!comanda) {
    return NextResponse.json(
      { error: "Comanda não encontrada." },
      { status: 404 }
    );
  }

  // Mesma regra da criação de pedido (seção "QR da mesa → onde entregar"):
  // se a comanda não está sentada em nenhuma mesa agora, sentar ela na mesa
  // de quem está chamando, em vez de recusar — do contrário, uma comanda
  // que virou disponível de novo (ex: depois de "Encerrar e liberar") fica
  // incapaz de chamar ajuda mesmo estando com o cardápio aberto normalmente.
  let tableId = comanda.currentTableId;
  if (!tableId) {
    if (!tableToken) {
      return NextResponse.json(
        { error: "Não sei em qual mesa você está — escaneie o QR da mesa de novo." },
        { status: 409 }
      );
    }
    const table = await prisma.restaurantTable.findUnique({
      where: { qrToken: tableToken },
    });
    if (!table) {
      return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });
    }
    tableId = table.id;
    await prisma.comanda.update({
      where: { id: comanda.id },
      data: { currentTableId: tableId },
    });
  }

  const existing = await prisma.helpCall.findFirst({
    where: { comandaId: comanda.id, resolvedAt: null },
  });
  if (existing) {
    return NextResponse.json(existing);
  }

  const helpCall = await prisma.helpCall.create({
    data: { comandaId: comanda.id, tableId },
  });

  publish("pdv", { type: "help-requested", helpCallId: helpCall.id });

  return NextResponse.json(helpCall, { status: 201 });
}
