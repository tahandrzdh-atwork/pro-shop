import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { dispatchToUpstreamProvider } from "@/lib/upstream/engine";
import { sendSms } from "@/lib/sms/providers";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orders = await prisma.order.findMany({
    include: {
      user: { select: { id: true, name: true, phone: true } },
      items: {
        include: {
          plan: { select: { upstreamProviderId: true, upstreamServiceId: true, upstreamQuantity: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ orders });
}

export async function PATCH(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const action = String(body?.action ?? "");

  if (action === "DELIVER_ITEM") {
    const orderItemId = String(body?.orderItemId ?? "");
    const deliveredSecret = String(body?.deliveredSecret ?? "").trim();
    const orderId = String(body?.orderId ?? "");

    const item = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        deliveredSecret,
        fulfillmentStatus: "DELIVERED",
      },
    });

    const siblingItems = await prisma.orderItem.findMany({
      where: { orderId },
    });
    const allDelivered = siblingItems.every(
      (i) => i.fulfillmentStatus === "DELIVERED"
    );

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: allDelivered ? "COMPLETED" : "PARTIAL" },
      include: { user: true },
    });

    if (allDelivered) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          titleFa: `سفارش ${order.orderNumber} تحویل داده شد`,
          titleEn: `Order ${order.orderNumber} delivered`,
          bodyFa: "اطلاعات اشتراک یا لایسنس شما در بخش سفارش‌های من آماده مشاهده است.",
          bodyEn: "Your subscription credentials are now ready in My Orders.",
        },
      });
      await sendSms({
        phone: order.user.phone,
        templateType: "ORDER_COMPLETE",
        message: `سفارش ${order.orderNumber} با موفقیت تکمیل و تحویل شد. دیجی‌ساب`,
        patternValues: { orderNumber: order.orderNumber },
      });
    }

    return NextResponse.json({ ok: true, item, orderStatus: order.status });
  }

  if (action === "RETRY_UPSTREAM") {
    const orderItemId = String(body?.orderItemId ?? "");
    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { plan: true, order: true },
    });
    if (!item || !item.plan.upstreamProviderId || !item.plan.upstreamServiceId) {
      return NextResponse.json(
        { error: "این آیتم به سرور مادر متصل نیست" },
        { status: 400 }
      );
    }

    let customerInputs: Record<string, string> = {};
    try {
      customerInputs = JSON.parse(item.customerInputsJson);
    } catch {
      customerInputs = {};
    }

    const dispatch = await dispatchToUpstreamProvider({
      providerId: item.plan.upstreamProviderId,
      orderItemId: item.id,
      serviceId: item.plan.upstreamServiceId,
      quantity: item.plan.upstreamQuantity * item.quantity,
      customerInputs,
    });

    await prisma.orderItem.update({
      where: { id: item.id },
      data: {
        fulfillmentStatus: dispatch.status,
        upstreamOrderId: dispatch.upstreamOrderId ?? null,
        upstreamResponseJson: dispatch.rawResponse,
        deliveredSecret: dispatch.deliveredSecret ?? item.deliveredSecret,
      },
    });

    if (dispatch.status === "DELIVERED") {
      await prisma.order.update({
        where: { id: item.orderId },
        data: { status: "COMPLETED" },
      });
    }

    return NextResponse.json({ ok: dispatch.success, dispatch });
  }

  if (action === "REFUND_ORDER") {
    const orderId = String(body?.orderId ?? "");
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === "REFUNDED") {
      return NextResponse.json({ error: "سفارش قابل بازگشت نیست" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
      }),
      prisma.user.update({
        where: { id: order.userId },
        data: { walletBalance: { increment: order.totalToman } },
      }),
      prisma.walletTransaction.create({
        data: {
          userId: order.userId,
          amount: order.totalToman,
          type: "REFUND",
          descriptionFa: `بازگشت وجه سفارش ${order.orderNumber} به کیف پول`,
          descriptionEn: `Refund for order ${order.orderNumber} to wallet`,
          referenceId: order.id,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
