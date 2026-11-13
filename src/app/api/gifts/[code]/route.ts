import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const giftCode = decodeURIComponent(code).toUpperCase();

  const item = await prisma.orderItem.findFirst({
    where: { giftCode },
    select: {
      giftCode: true,
      isGift: true,
      giftRecipientName: true,
      giftMessage: true,
      productTitleFa: true,
      productTitleEn: true,
      planTitleFa: true,
      planTitleEn: true,
      deliveredSecret: true,
      virtualNumber: true,
      virtualSmsCode: true,
      createdAt: true,
    },
  });

  if (!item) {
    return NextResponse.json({ error: "کارت هدیه یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, gift: item });
}
