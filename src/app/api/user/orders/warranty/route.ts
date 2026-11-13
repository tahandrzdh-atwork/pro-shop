import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendSms } from "@/lib/sms/providers";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const orderItemId = String(body.orderItemId ?? "");
  const reason = String(body.reason ?? "").trim();

  if (!orderItemId || !reason) {
    return NextResponse.json(
      { error: "شناسه سفارش و دلیل قطعی/خرابی الزامی است" },
      { status: 400 }
    );
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: true,
      plan: { include: { product: true } },
    },
  });

  if (!item || item.order.userId !== user.id) {
    return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
  }

  // Check warranty validity
  const now = new Date();
  if (item.warrantyUntil && item.warrantyUntil < now) {
    return NextResponse.json(
      { error: "مهلت گارانتی و ضمانت تعویض این اشتراک به پایان رسیده است" },
      { status: 400 }
    );
  }

  // If item is a VAULT product, attempt automated instant replacement from inventory!
  if (item.deliveryType === "VAULT") {
    const replacementVaultItem = await prisma.digitalVaultItem.findFirst({
      where: { planId: item.planId, isUsed: false },
    });

    if (replacementVaultItem) {
      // Instant automated replacement!
      await prisma.$transaction([
        prisma.digitalVaultItem.update({
          where: { id: replacementVaultItem.id },
          data: {
            isUsed: true,
            usedAt: new Date(),
            orderItemId: item.id,
          },
        }),
        prisma.orderItem.update({
          where: { id: item.id },
          data: {
            deliveredSecret: replacementVaultItem.secretPayload,
            replacementSecret: replacementVaultItem.secretPayload,
            warrantyStatus: "REPLACED",
            warrantyClaimReason: reason,
            warrantyClaimDate: new Date(),
          },
        }),
        prisma.notification.create({
          data: {
            userId: user.id,
            titleFa: `اکانت جایگزین گارانتی تحویل داده شد (سفارش ${item.order.orderNumber})`,
            titleEn: `Warranty replacement issued for order ${item.order.orderNumber}`,
            bodyFa: "اکانت جدید به صورت آنی و خودکار از انبار تحویل داده شد و در پنل کاربری شما قرار گرفت.",
            bodyEn: "New replacement credentials have been automatically provisioned to your dashboard.",
          },
        }),
      ]);

      await sendSms({
        phone: user.phone,
        templateType: "ORDER_COMPLETE",
        message: `اکانت جایگزین گارانتی شما (سفارش ${item.order.orderNumber}) به صورت آنی تحویل داده شد. لطفاً پنل کاربری خود را بررسی فرمایید. | دیجی‌ساب`,
      });

      return NextResponse.json({
        ok: true,
        autoReplaced: true,
        message: "اکانت جدید گارانتی به صورت آنی و خودکار تحویل داده شد!",
        newSecret: replacementVaultItem.secretPayload,
      });
    }
  }

  // Otherwise, queue for priority admin resolution
  await prisma.$transaction([
    prisma.orderItem.update({
      where: { id: item.id },
      data: {
        warrantyStatus: "CLAIMED",
        warrantyClaimReason: reason,
        warrantyClaimDate: new Date(),
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        titleFa: `درخواست گارانتی سفارش ${item.order.orderNumber} ثبت شد`,
        titleEn: `Warranty claim logged for order ${item.order.orderNumber}`,
        bodyFa: `دلیل اعلامی: «${reason}». پشتیبانی فنی در کمتر از ۲ ساعت نسبت به تعویض یا رفع مشکل اقدام خواهد کرد.`,
        bodyEn: `Claim received: "${reason}". Technical team will replace or resolve within 2 hours.`,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    autoReplaced: false,
    message: "درخواست گارانتی با موفقیت ثبت شد و در اولویت بررسی و تعویض قرار گرفت.",
  });
}
