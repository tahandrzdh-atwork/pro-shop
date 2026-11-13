import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pollCallinooCode } from "@/lib/upstream/engine";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const orderItemId = String(body?.orderItemId ?? "");

  const item = await prisma.orderItem.findFirst({
    where: {
      id: orderItemId,
      order: { userId: user.id },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Order item not found" }, { status: 404 });
  }

  if (item.virtualSmsCode) {
    return NextResponse.json({
      ok: true,
      status: "CODE_RECEIVED",
      code: item.virtualSmsCode,
      number: item.virtualNumber,
    });
  }

  const poll = await pollCallinooCode(orderItemId);
  return NextResponse.json(poll);
}
