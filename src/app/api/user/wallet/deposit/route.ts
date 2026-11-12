import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const amount = Math.round(Number(body?.amount ?? 0));

  if (amount < 50000 || amount > 50000000) {
    return NextResponse.json(
      { error: "مبلغ شارژ باید بین ۵۰,۰۰۰ تا ۵۰,۰۰۰,۰۰۰ تومان باشد" },
      { status: 400 }
    );
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { walletBalance: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: user.id,
        amount,
        type: "DEPOSIT",
        descriptionFa: "شارژ مستقیم کیف پول (درگاه شبیه‌ساز)",
        descriptionEn: "Direct wallet top-up (Simulated Gateway)",
        referenceId: `TOPUP-${Date.now().toString().slice(-6)}`,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    walletBalance: updatedUser.walletBalance,
  });
}
