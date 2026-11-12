import React from "react";
import { prisma } from "@/lib/prisma";
import { resolvePlanPriceToman } from "@/lib/pricing";
import { StoreCatalogClient } from "@/components/StoreCatalogClient";

export const dynamic = "force-dynamic";

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const [settings, categories, products] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        plans: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { salesCount: "desc" },
    }),
  ]);

  const rate = settings?.usdToTomanRate ?? 68500;
  const enriched = products.map((p) => ({
    ...p,
    plans: p.plans.map((pl) => ({
      ...pl,
      effectivePriceToman: resolvePlanPriceToman(pl, rate),
    })),
  }));

  return (
    <StoreCatalogClient
      initialProducts={enriched}
      categories={categories}
      initialCategory={sp.category ?? "ALL"}
    />
  );
}
