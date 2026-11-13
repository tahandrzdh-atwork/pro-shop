import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRobynhoodPrices } from "@/lib/upstream/engine";

export async function GET() {
  const provider = await prisma.upstreamProvider.findFirst({
    where: { protocol: "ROBYNHOOD_FRAGMENT", isActive: true },
  });

  if (!provider) {
    return NextResponse.json(
      { error: "سرویس فرگمنت تلگرام یافت نشد یا غیرفعال است" },
      { status: 404 }
    );
  }

  const prices = await getRobynhoodPrices(provider);
  return NextResponse.json({
    ok: true,
    provider: {
      name: provider.name,
      balanceText: provider.balanceText,
      isSandbox: provider.isSandbox,
    },
    prices,
  });
}
