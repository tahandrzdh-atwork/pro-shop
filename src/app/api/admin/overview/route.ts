import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers,
    totalOrders,
    completedOrders,
    openTickets,
    revenueAgg,
    recentOrders,
    topProducts,
    expiringItemsCount,
    recentApiLogs,
    settings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { totalToman: true },
    }),
    prisma.order.findMany({
      include: {
        user: { select: { name: true, phone: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      orderBy: { salesCount: "desc" },
      take: 5,
      select: {
        id: true,
        titleFa: true,
        titleEn: true,
        salesCount: true,
        deliveryType: true,
      },
    }),
    prisma.orderItem.count({
      where: {
        expiresAt: {
          gt: new Date(),
          lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.upstreamApiLog.findMany({
      include: { provider: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
  ]);

  // Build 7-day trend data from orders (plus clean baseline for visualization)
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  const weekOrders = await prisma.order.findMany({
    where: { createdAt: { gte: sevenDaysAgo }, paymentStatus: "PAID" },
    select: { totalToman: true, createdAt: true },
  });

  const dayMap = new Map<string, { orders: number; revenue: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { orders: 0, revenue: 0 });
  }
  for (const o of weekOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const cur = dayMap.get(key);
    if (cur) {
      cur.orders += 1;
      cur.revenue += o.totalToman;
    }
  }

  const salesChart = Array.from(dayMap.entries()).map(([date, val]) => ({
    date: date.slice(5),
    orders: val.orders,
    revenueMillion: Number((val.revenue / 1_000_000).toFixed(2)),
  }));

  return NextResponse.json({
    kpis: {
      totalUsers,
      totalOrders,
      completedOrders,
      openTickets,
      totalRevenueToman: revenueAgg._sum.totalToman ?? 0,
      expiringItemsCount,
      usdToTomanRate: settings?.usdToTomanRate ?? 68500,
    },
    salesChart,
    recentOrders,
    topProducts,
    recentApiLogs,
  });
}
