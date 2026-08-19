import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import type { OrderStatus } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN", "WAITER", "KITCHEN"]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status"); // "active" | um OrderStatus | null
  const comandaId = searchParams.get("comandaId");
  const tableId = searchParams.get("tableId");

  const statusFilter: { status?: OrderStatus | { notIn: OrderStatus[] } } =
    {};
  if (statusParam === "active") {
    statusFilter.status = { notIn: ["DELIVERED", "CANCELLED"] };
  } else if (statusParam) {
    statusFilter.status = statusParam as OrderStatus;
  }

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: user.restaurantId,
      ...statusFilter,
      ...(comandaId ? { comandaId } : {}),
      ...(tableId ? { tableId } : {}),
    },
    include: {
      table: true,
      comanda: true,
      items: { include: { options: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(orders);
}
