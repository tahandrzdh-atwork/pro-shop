import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTier } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [orders, transactions, tickets, notifications, tiers, referralsCount] =
    await Promise.all([
      prisma.order.findMany({
        where: { userId: user.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.walletTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.ticket.findMany({
        where: { userId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.loyaltyTier.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.user.count({ where: { referredById: user.id } }),
    ]);

  const currentTier = await getUserTier(user.loyaltyPoints);
  const nextTier =
    tiers.find((t) => t.minPoints > user.loyaltyPoints) ?? null;

  return NextResponse.json({
    user,
    currentTier,
    nextTier,
    tiers,
    referralsCount,
    orders,
    transactions,
    tickets,
    notifications,
  });
}
