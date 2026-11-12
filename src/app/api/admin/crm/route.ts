import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendSms } from "@/lib/sms/providers";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [customers, tiers, campaigns, expiringItems] = await Promise.all([
    prisma.user.findMany({
      include: {
        _count: { select: { orders: true, tickets: true, referrals: true } },
        crmNotesReceived: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, orderNumber: true, totalToman: true, status: true, createdAt: true },
        },
      },
      orderBy: { totalSpent: "desc" },
    }),
    prisma.loyaltyTier.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.crmCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.orderItem.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
          lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        order: { include: { user: { select: { id: true, name: true, phone: true } } } },
      },
      orderBy: { expiresAt: "asc" },
    }),
  ]);

  return NextResponse.json({ customers, tiers, campaigns, expiringItems });
}

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const action = String(body?.action ?? "");

  if (action === "ADD_NOTE") {
    const userId = String(body?.userId ?? "");
    const content = String(body?.content ?? "").trim();
    if (!userId || !content) {
      return NextResponse.json({ error: "متن یادداشت الزامی است" }, { status: 400 });
    }
    const note = await prisma.crmNote.create({
      data: { userId, authorId: admin.id, content },
      include: { author: { select: { name: true } } },
    });
    return NextResponse.json({ ok: true, note });
  }

  if (action === "SEND_EXPIRY_REMINDERS") {
    const expiring = await prisma.orderItem.findMany({
      where: {
        reminderSent: false,
        expiresAt: {
          gt: new Date(),
          lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: { order: { include: { user: true } } },
    });

    for (const item of expiring) {
      await sendSms({
        phone: item.order.user.phone,
        templateType: "EXPIRY_REMINDER",
        message: `${item.order.user.name ?? "کاربر گرامی"}، اشتراک ${item.productTitleFa} شما کمتر از ۷ روز دیگر منقضی می‌شود. همین حالا با تخفیف تمدید کنید! دیجی‌ساب`,
        patternValues: { product: item.productTitleFa },
      });
      await prisma.notification.create({
        data: {
          userId: item.order.userId,
          titleFa: `یادآور تمدید: ${item.productTitleFa}`,
          titleEn: `Renewal Reminder: ${item.productTitleEn}`,
          bodyFa: "زمان تمدید اشتراک شما نزدیک است. از بخش فروشگاه با امتیاز باشگاه تمدید کنید.",
          bodyEn: "Your subscription is expiring soon. Renew now with your loyalty perks.",
        },
      });
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { reminderSent: true },
      });
    }

    return NextResponse.json({ ok: true, sentCount: expiring.length });
  }

  if (action === "LAUNCH_CAMPAIGN") {
    const title = String(body?.title ?? "").trim();
    const segment = String(body?.segment ?? "ALL");
    const channel = String(body?.channel ?? "SMS");
    const message = String(body?.message ?? "").trim();

    if (!title || !message) {
      return NextResponse.json({ error: "عنوان و پیام کمپین الزامی است" }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        ...(segment === "VIP" ? { loyaltyPoints: { gte: 800 } } : {}),
        ...(segment === "INACTIVE"
          ? {
              OR: [
                { lastPurchaseAt: null },
                { lastPurchaseAt: { lt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) } },
              ],
            }
          : {}),
      },
    });

    for (const u of users) {
      if (channel === "SMS") {
        await sendSms({
          phone: u.phone,
          templateType: "CRM_CAMPAIGN",
          message,
        });
      }
      await prisma.notification.create({
        data: {
          userId: u.id,
          titleFa: title,
          titleEn: title,
          bodyFa: message,
          bodyEn: message,
        },
      });
    }

    const campaign = await prisma.crmCampaign.create({
      data: {
        title,
        segment,
        channel,
        message,
        recipientCount: users.length,
      },
    });

    return NextResponse.json({ ok: true, campaign });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PATCH(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const userId = String(body?.userId ?? "");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (typeof body?.walletDelta === "number" && body.walletDelta !== 0) {
    const delta = Math.round(body.walletDelta);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: delta } },
      }),
      prisma.walletTransaction.create({
        data: {
          userId,
          amount: delta,
          type: "ADMIN_ADJUST",
          descriptionFa: body?.reason ? String(body.reason) : "تعدیل دستی کیف پول توسط ادمین",
          descriptionEn: body?.reason ? String(body.reason) : "Manual wallet adjustment by admin",
        },
      }),
    ]);
  }

  if (Array.isArray(body?.tags)) {
    await prisma.user.update({
      where: { id: userId },
      data: { tagsJson: JSON.stringify(body.tags) },
    });
  }

  if (body?.role === "ADMIN" || body?.role === "USER") {
    await prisma.user.update({
      where: { id: userId },
      data: { role: body.role },
    });
  }

  return NextResponse.json({ ok: true });
}
