import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolvePlanPriceToman } from "@/lib/pricing";
import { ProductDetailClient } from "@/components/ProductDetailClient";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [settings, product] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
    prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        plans: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { vaultItems: { where: { isUsed: false } } } },
          },
        },
      },
    }),
  ]);

  if (!product) notFound();

  const rate = settings?.usdToTomanRate ?? 68500;
  const enriched = {
    ...product,
    plans: product.plans.map((pl) => ({
      ...pl,
      effectivePriceToman: resolvePlanPriceToman(pl, rate),
      vaultStock: pl._count.vaultItems,
    })),
  };

  return <ProductDetailClient product={enriched} />;
}
