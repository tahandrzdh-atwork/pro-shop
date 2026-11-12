import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const pointsToRedeem = Math.floor(Number(body?.points ?? 0));

  if (pointsToRedeem < 100 || pointsToRedeem % 100 !== 0) {
    return NextResponse.json(
      { error: "حداقل امتیاز قابل تبدیل ۱۰۰ و مضربی از ۱۰۰ است" },
      { status: 400 }
    );
  }

  if (user.loyaltyPoints < pointsToRedeem) {
    return NextResponse.json(
      { error: "امتیاز باشگاه شما کافی نیست" },
      { status: 400 }
    );
  }

  // 100 points = 10,000 Toman wallet credit
  const creditToman = (pointsToRedeem / 100) * 10000;

  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: user.id } });
    if (!fresh || fresh.loyaltyPoints < pointsToRedeem) {
      throw new Error("INSUFFICIENT_POINTS");
    }

    const u = await tx.user.update({
      where: { id: user.id },
      data: {
        loyaltyPoints: { decrement: pointsToRedeem },
        walletBalance: { increment: creditToman },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: user.id,
        amount: creditToman,
        type: "LOYALTY_REDEEM",
        descriptionFa: `تبدیل ${pointsToRedeem} امتیاز باشگاه مشتریان به اعتبار کیف پول`,
        descriptionEn: `Redeemed ${pointsToRedeem} loyalty points to wallet credit`,
      },
    });

    return u;
  });

  return NextResponse.json({
    ok: true,
    loyaltyPoints: updated.loyaltyPoints,
    walletBalance: updated.walletBalance,
    creditToman,
  });
}
