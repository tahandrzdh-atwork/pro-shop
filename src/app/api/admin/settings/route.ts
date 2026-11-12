import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [settings, coupons, tiers] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.loyaltyTier.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return NextResponse.json({ settings, coupons, tiers });
}

export async function PATCH(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (body?.action === "CREATE_COUPON") {
    const code = String(body?.code ?? "").trim().toUpperCase();
    const discountType = body?.discountType === "FIXED" ? "FIXED" : "PERCENT";
    const value = Math.max(1, Number(body?.value ?? 10));
    const maxUses = Math.max(1, Number(body?.maxUses ?? 100));
    const minOrderToman = Math.max(0, Number(body?.minOrderToman ?? 0));

    if (!code) {
      return NextResponse.json({ error: "کد تخفیف الزامی است" }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: { code, discountType, value, maxUses, minOrderToman, isActive: true },
    });
    return NextResponse.json({ ok: true, coupon });
  }

  const settings = await prisma.siteSetting.update({
    where: { id: "default" },
    data: {
      ...(body.usdToTomanRate !== undefined
        ? { usdToTomanRate: Math.max(1000, Number(body.usdToTomanRate)) }
        : {}),
      ...(body.heroNoticeFa !== undefined
        ? { heroNoticeFa: String(body.heroNoticeFa) }
        : {}),
      ...(body.heroNoticeEn !== undefined
        ? { heroNoticeEn: String(body.heroNoticeEn) }
        : {}),
      ...(body.referralBonusPoints !== undefined
        ? { referralBonusPoints: Number(body.referralBonusPoints) }
        : {}),
    },
  });

  return NextResponse.json({ ok: true, settings });
}
