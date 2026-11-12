import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tickets = await prisma.ticket.findMany({
    include: {
      user: { select: { name: true, phone: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const ticketId = String(body?.ticketId ?? "");
  const message = String(body?.message ?? "").trim();
  const status = String(body?.status ?? "ANSWERED");

  if (!ticketId || !message) {
    return NextResponse.json({ error: "متن پاسخ الزامی است" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: admin.id,
        isAdmin: true,
        body: message,
      },
    }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
