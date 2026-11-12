import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePlanPriceToman } from "@/lib/pricing";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const delivery = searchParams.get("delivery");
  const q = searchParams.get("q")?.trim();

  const [settings, categories, products] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        ...(category && category !== "ALL"
          ? { category: { slug: category } }
          : {}),
        ...(delivery && delivery !== "ALL" ? { deliveryType: delivery } : {}),
        ...(q
          ? {
              OR: [
                { titleFa: { contains: q } },
                { titleEn: { contains: q } },
                { shortDescFa: { contains: q } },
                { shortDescEn: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        plans: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            _count: {
              select: { vaultItems: { where: { isUsed: false } } },
            },
          },
        },
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { salesCount: "desc" }],
    }),
  ]);

  const rate = settings?.usdToTomanRate ?? 68500;

  const enriched = products.map((product) => ({
    ...product,
    plans: product.plans.map((plan) => ({
      ...plan,
      effectivePriceToman: resolvePlanPriceToman(plan, rate),
      vaultStock: plan._count.vaultItems,
    })),
  }));

  return NextResponse.json({
    usdToTomanRate: rate,
    categories,
    products: enriched,
  });
}
