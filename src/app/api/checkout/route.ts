import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTier } from "@/lib/auth";
import { resolvePlanPriceToman } from "@/lib/pricing";
import { fulfillOrderAfterPayment } from "@/lib/upstream/engine";

interface CartCheckoutItem {
  planId: string;
  quantity: number;
  customerInputs?: Record<string, string>;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "لطفاً ابتدا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const items: CartCheckoutItem[] = Array.isArray(body?.items) ? body.items : [];
    const paymentMethod = body?.paymentMethod === "WALLET" ? "WALLET" : "GATEWAY";
    const couponCodeInput =
      typeof body?.couponCode === "string"
        ? body.couponCode.trim().toUpperCase()
        : "";

    if (items.length === 0) {
      return NextResponse.json({ error: "سبد خرید خالی است" }, { status: 400 });
    }

    const settings = await prisma.siteSetting.findUnique({
      where: { id: "default" },
    });
    const rate = settings?.usdToTomanRate ?? 68500;

    const planIds = items.map((i) => i.planId);
    const plans = await prisma.productPlan.findMany({
      where: { id: { in: planIds }, isActive: true },
      include: { product: true },
    });

    if (plans.length === 0) {
      return NextResponse.json(
        { error: "محصول انتخاب‌شده معتبر نیست" },
        { status: 400 }
      );
    }

    let subtotalToman = 0;
    const preparedItems: Array<{
      planId: string;
      productTitleFa: string;
      productTitleEn: string;
      planTitleFa: string;
      planTitleEn: string;
      quantity: number;
      unitPriceToman: number;
      totalPriceToman: number;
      deliveryType: string;
      customerInputsJson: string;
      isGift?: boolean;
      giftRecipientName?: string | null;
      giftMessage?: string | null;
      giftCode?: string | null;
    }> = [];

    for (const item of items) {
      const plan = plans.find((p) => p.id === item.planId);
      if (!plan) continue;
      const qty = Math.max(1, Math.min(20, Number(item.quantity) || 1));
      const unitPrice = resolvePlanPriceToman(plan, rate);
      const lineTotal = unitPrice * qty;
      subtotalToman += lineTotal;

      preparedItems.push({
        planId: plan.id,
        productTitleFa: plan.product.titleFa,
        productTitleEn: plan.product.titleEn,
        planTitleFa: plan.titleFa,
        planTitleEn: plan.titleEn,
        quantity: qty,
        unitPriceToman: unitPrice,
        totalPriceToman: lineTotal,
        deliveryType: plan.product.deliveryType,
        customerInputsJson: JSON.stringify(item.customerInputs ?? {}),
        isGift: Boolean(body?.isGift),
        giftRecipientName: body?.giftRecipientName ? String(body.giftRecipientName).trim() : null,
        giftMessage: body?.giftMessage ? String(body.giftMessage).trim() : null,
        giftCode: body?.isGift ? `GIFT-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : null,
      });
    }

    const tier = await getUserTier(user.loyaltyPoints);
    const tierDiscountToman =
      tier && tier.discountPercent > 0
        ? Math.round((subtotalToman * tier.discountPercent) / 100)
        : 0;

    let couponDiscountToman = 0;
    let appliedCouponCode: string | null = null;

    if (couponCodeInput) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCodeInput },
      });
      if (
        coupon &&
        coupon.isActive &&
        coupon.usedCount < coupon.maxUses &&
        (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
        subtotalToman >= coupon.minOrderToman
      ) {
        couponDiscountToman =
          coupon.discountType === "PERCENT"
            ? Math.round((subtotalToman * coupon.value) / 100)
            : Math.min(subtotalToman, coupon.value);
        appliedCouponCode = coupon.code;
      }
    }

    const totalToman = Math.max(
      0,
      subtotalToman - tierDiscountToman - couponDiscountToman
    );

    if (paymentMethod === "WALLET" && user.walletBalance < totalToman) {
      return NextResponse.json(
        { error: "موجودی کیف پول برای پرداخت این سفارش کافی نیست" },
        { status: 400 }
      );
    }

    const orderNumber = `DS-${Math.floor(10500 + Math.random() * 89000)}`;
    const gatewayRef =
      paymentMethod === "WALLET"
        ? `WLT-${Date.now().toString().slice(-6)}`
        : `ZP-${Date.now().toString().slice(-7)}`;

    const order = await prisma.$transaction(async (tx) => {
      if (paymentMethod === "WALLET" && totalToman > 0) {
        const freshUser = await tx.user.findUnique({ where: { id: user.id } });
        if (!freshUser || freshUser.walletBalance < totalToman) {
          throw new Error("INSUFFICIENT_WALLET");
        }
        await tx.user.update({
          where: { id: user.id },
          data: { walletBalance: { decrement: totalToman } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            amount: -totalToman,
            type: "PURCHASE",
            descriptionFa: `پرداخت سفارش ${orderNumber}`,
            descriptionEn: `Payment for order ${orderNumber}`,
            referenceId: orderNumber,
          },
        });
      }

      if (appliedCouponCode) {
        await tx.coupon.update({
          where: { code: appliedCouponCode },
          data: { usedCount: { increment: 1 } },
        });
      }

      return tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          status: "PROCESSING",
          paymentMethod,
          paymentStatus: "PAID",
          subtotalToman,
          tierDiscountToman,
          couponDiscountToman,
          totalToman,
          couponCode: appliedCouponCode,
          gatewayRef,
          items: {
            create: preparedItems,
          },
        },
      });
    });

    const fulfilled = await fulfillOrderAfterPayment(order.id);

    return NextResponse.json({
      ok: true,
      order: fulfilled ?? order,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_WALLET") {
      return NextResponse.json(
        { error: "موجودی کیف پول کافی نیست" },
        { status: 400 }
      );
    }
    console.error("checkout error:", err);
    return NextResponse.json(
      { error: "خطا در ثبت و پردازش سفارش" },
      { status: 500 }
    );
  }
}
