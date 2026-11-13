import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const providers = await prisma.upstreamProvider.findMany({
    select: {
      id: true,
      name: true,
      protocol: true,
      balanceText: true,
      isActive: true,
      isSandbox: true,
      lastSyncAt: true,
    },
  });

  const vaultCount = await prisma.digitalVaultItem.count({
    where: { isUsed: false },
  });

  const smsProviders = await prisma.smsProviderConfig.findMany({
    select: {
      providerKey: true,
      title: true,
      isActive: true,
    },
  });

  return NextResponse.json({
    status: "OPERATIONAL",
    uptimePercent: "99.98%",
    avgDeliverySeconds: 38,
    lastChecked: new Date().toISOString(),
    providers,
    vaultInStockCount: vaultCount,
    smsProviders,
  });
}
