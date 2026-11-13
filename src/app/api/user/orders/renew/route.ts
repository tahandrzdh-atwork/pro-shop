import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { resolvePlanPriceToman } from "@/lib/pricing";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const orderItemId = String(body.orderItemId ?? "");

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

  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });
  const rate = settings?.usdToTomanRate ?? 68500;
  const currentPrice = resolvePlanPriceToman(item.plan, rate);

  let customerInputs: Record<string, string> = {};
  try {
    customerInputs = JSON.parse(item.customerInputsJson);
  } catch {}

  return NextResponse.json({
    ok: true,
    renewalData: {
      planId: item.planId,
      productId: item.plan.productId,
      productSlug: item.plan.product.slug,
      productTitleFa: item.productTitleFa,
      productTitleEn: item.productTitleEn,
      planTitleFa: item.planTitleFa,
      planTitleEn: item.planTitleEn,
      unitPriceToman: currentPrice,
      pointsReward: item.plan.pointsReward,
      deliveryType: item.deliveryType,
      quantity: item.quantity,
      customerInputs,
    },
  });
}
