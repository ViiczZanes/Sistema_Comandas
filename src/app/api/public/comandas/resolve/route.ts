import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Resolve o token de uma comanda a partir do número impresso nela (seção 12
// do documento: alternativa ao QR Code da comanda).
//
// Importante para segurança (seção 13): não deixamos isso virar uma forma de
// "adivinhar" qualquer comanda do restaurante. Só resolvemos uma comanda que
// esteja livre (sem mesa) ou já sentada NA MESMA MESA em que o cliente está
// (ele chegou até aqui escaneando o QR daquela mesa). Ou seja, na pior das
// hipóteses alguém só consegue tentar adivinhar entre as poucas comandas do
// próprio grupo, não do restaurante inteiro.
const bodySchema = z.object({
  tableToken: z.string().min(1),
  number: z.number().int().positive(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const table = await prisma.restaurantTable.findUnique({
    where: { qrToken: parsed.data.tableToken },
  });
  if (!table) {
    return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });
  }

  const comanda = await prisma.comanda.findUnique({
    where: { number: parsed.data.number },
  });
  if (!comanda || comanda.status !== "OPEN") {
    return NextResponse.json(
      { error: "Comanda não encontrada ou não está aberta." },
      { status: 404 }
    );
  }
  if (comanda.currentTableId && comanda.currentTableId !== table.id) {
    return NextResponse.json(
      {
        error:
          "Essa comanda está associada a outra mesa. Peça ajuda a um garçom.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ token: comanda.token, number: comanda.number });
}
