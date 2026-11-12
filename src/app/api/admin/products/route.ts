import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [categories, products, upstreams] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      include: {
        category: true,
        plans: {
          include: {
            upstreamProvider: { select: { id: true, name: true } },
            _count: { select: { vaultItems: { where: { isUsed: false } } } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.upstreamProvider.findMany({ orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({ categories, products, upstreams });
}

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (body?.action === "ADD_VAULT_BULK") {
    const planId = String(body?.planId ?? "");
    const lines = String(body?.secretsText ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (!planId || lines.length === 0) {
      return NextResponse.json(
        { error: "پلن و لیست اکانت/کدها الزامی است" },
        { status: 400 }
      );
    }

    await prisma.digitalVaultItem.createMany({
      data: lines.map((line) => ({
        planId,
        secretPayload: line,
        note: body?.note ? String(body.note) : "Bulk import",
      })),
    });

    return NextResponse.json({ ok: true, added: lines.length });
  }

  if (body?.action === "CREATE_PRODUCT") {
    const titleFa = String(body?.titleFa ?? "").trim();
    const titleEn = String(body?.titleEn ?? "").trim();
    const categoryId = String(body?.categoryId ?? "");
    const deliveryType = String(body?.deliveryType ?? "VAULT");
    const planTitleFa = String(body?.planTitleFa ?? "اشتراک ۱ ماهه");
    const planTitleEn = String(body?.planTitleEn ?? "1 Month Plan");
    const priceToman = Math.max(1000, Number(body?.priceToman ?? 250000));
    const priceUsd = body?.priceUsd ? Number(body.priceUsd) : null;
    const useUsdRate = Boolean(body?.useUsdRate);

    if (!titleFa || !titleEn || !categoryId) {
      return NextResponse.json({ error: "فیلدهای اصلی الزامی هستند" }, { status: 400 });
    }

    const slug =
      titleEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now().toString().slice(-4);

    const product = await prisma.product.create({
      data: {
        slug,
        categoryId,
        titleFa,
        titleEn,
        shortDescFa: String(body?.shortDescFa ?? titleFa),
        shortDescEn: String(body?.shortDescEn ?? titleEn),
        descriptionFa: String(body?.shortDescFa ?? titleFa),
        descriptionEn: String(body?.shortDescEn ?? titleEn),
        guideFa: "پس از پرداخت سفارش شما پردازش می‌شود.",
        guideEn: "Your order will be processed right after payment.",
        deliveryType,
        badgeFa:
          deliveryType === "VAULT"
            ? "تحویل آنی"
            : deliveryType === "UPSTREAM_API"
              ? "تکمیل خودکار API"
              : "تحویل سریع",
        badgeEn:
          deliveryType === "VAULT"
            ? "Instant"
            : deliveryType === "UPSTREAM_API"
              ? "Auto API"
              : "Fast",
        isFeatured: true,
        plans: {
          create: {
            titleFa: planTitleFa,
            titleEn: planTitleEn,
            durationDays: Number(body?.durationDays ?? 30),
            priceToman,
            priceUsd,
            useUsdRate,
            pointsReward: Number(body?.pointsReward ?? 30),
            upstreamProviderId: body?.upstreamProviderId || null,
            upstreamServiceId: body?.upstreamServiceId || null,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, product });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PATCH(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (body?.planId) {
    const updated = await prisma.productPlan.update({
      where: { id: String(body.planId) },
      data: {
        ...(body.priceToman !== undefined
          ? { priceToman: Number(body.priceToman) }
          : {}),
        ...(body.priceUsd !== undefined
          ? { priceUsd: body.priceUsd ? Number(body.priceUsd) : null }
          : {}),
        ...(body.useUsdRate !== undefined
          ? { useUsdRate: Boolean(body.useUsdRate) }
          : {}),
        ...(body.upstreamProviderId !== undefined
          ? { upstreamProviderId: body.upstreamProviderId || null }
          : {}),
        ...(body.upstreamServiceId !== undefined
          ? { upstreamServiceId: body.upstreamServiceId || null }
          : {}),
      },
    });
    return NextResponse.json({ ok: true, plan: updated });
  }

  if (body?.productId) {
    const updated = await prisma.product.update({
      where: { id: String(body.productId) },
      data: {
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body.isFeatured !== undefined
          ? { isFeatured: Boolean(body.isFeatured) }
          : {}),
      },
    });
    return NextResponse.json({ ok: true, product: updated });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
