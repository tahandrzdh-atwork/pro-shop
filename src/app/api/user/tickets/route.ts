import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body?.ticketId && body?.message) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: String(body.ticketId), userId: user.id },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: user.id,
          isAdmin: false,
          body: String(body.message).trim(),
        },
      }),
      prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "OPEN" },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  const subject = String(body?.subject ?? "").trim();
  const message = String(body?.message ?? "").trim();
  const category = String(body?.category ?? "GENERAL");
  const orderId = body?.orderId ? String(body.orderId) : null;

  if (!subject || !message) {
    return NextResponse.json(
      { error: "موضوع و متن تیکت الزامی است" },
      { status: 400 }
    );
  }

  const ticketNumber = `TK-${Math.floor(4000 + Math.random() * 5999)}`;
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      userId: user.id,
      orderId,
      subject,
      category,
      status: "OPEN",
      messages: {
        create: {
          senderId: user.id,
          isAdmin: false,
          body: message,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, ticket });
}
