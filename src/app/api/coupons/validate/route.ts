import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = String(body?.code ?? "").trim().toUpperCase();
    const subtotal = Number(body?.subtotal ?? 0);

    if (!code) {
      return NextResponse.json({ error: "کد تخفیف را وارد کنید" }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: "کد تخفیف معتبر نیست" }, { status: 404 });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: "مهلت استفاده از این کد به پایان رسیده است" }, { status: 400 });
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "ظرفیت استفاده از این کد تکمیل شده است" }, { status: 400 });
    }

    if (subtotal < coupon.minOrderToman) {
      return NextResponse.json(
        { error: `حداقل مبلغ سفارش برای این کد ${coupon.minOrderToman.toLocaleString()} تومان است` },
        { status: 400 }
      );
    }

    const discountToman =
      coupon.discountType === "PERCENT"
        ? Math.round((subtotal * coupon.value) / 100)
        : Math.min(subtotal, coupon.value);

    return NextResponse.json({
      ok: true,
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
      discountToman,
    });
  } catch {
    return NextResponse.json({ error: "خطا در بررسی کد تخفیف" }, { status: 500 });
  }
}
