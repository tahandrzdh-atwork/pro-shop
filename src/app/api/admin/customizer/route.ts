import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.siteSetting.findUnique({
    where: { id: "default" },
  });

  return NextResponse.json({ ok: true, settings });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const updated = await prisma.siteSetting.upsert({
    where: { id: "default" },
    update: {
      heroTitleFa: body.heroTitleFa !== undefined ? String(body.heroTitleFa).trim() : undefined,
      heroTitleEn: body.heroTitleEn !== undefined ? String(body.heroTitleEn).trim() : undefined,
      heroSubtitleFa: body.heroSubtitleFa !== undefined ? String(body.heroSubtitleFa).trim() : undefined,
      heroSubtitleEn: body.heroSubtitleEn !== undefined ? String(body.heroSubtitleEn).trim() : undefined,
      heroCtaTextFa: body.heroCtaTextFa !== undefined ? String(body.heroCtaTextFa).trim() : undefined,
      heroCtaTextEn: body.heroCtaTextEn !== undefined ? String(body.heroCtaTextEn).trim() : undefined,
      heroCtaLink: body.heroCtaLink !== undefined ? String(body.heroCtaLink).trim() : undefined,
      heroBadgeFa: body.heroBadgeFa !== undefined ? String(body.heroBadgeFa).trim() : undefined,
      heroBadgeEn: body.heroBadgeEn !== undefined ? String(body.heroBadgeEn).trim() : undefined,
      announcementActive: body.announcementActive !== undefined ? Boolean(body.announcementActive) : undefined,
      announcementTextFa: body.announcementTextFa !== undefined ? String(body.announcementTextFa).trim() : undefined,
      announcementTextEn: body.announcementTextEn !== undefined ? String(body.announcementTextEn).trim() : undefined,
      announcementLink: body.announcementLink !== undefined ? String(body.announcementLink).trim() : undefined,
      supportPhone: body.supportPhone !== undefined ? String(body.supportPhone).trim() : undefined,
      supportTelegram: body.supportTelegram !== undefined ? String(body.supportTelegram).trim() : undefined,
      supportInstagram: body.supportInstagram !== undefined ? String(body.supportInstagram).trim() : undefined,
      siteNameFa: body.siteNameFa !== undefined ? String(body.siteNameFa).trim() : undefined,
      siteNameEn: body.siteNameEn !== undefined ? String(body.siteNameEn).trim() : undefined,
    },
    create: {
      id: "default",
      usdToTomanRate: 68500,
      heroTitleFa: body.heroTitleFa,
      heroTitleEn: body.heroTitleEn,
      heroSubtitleFa: body.heroSubtitleFa,
      heroSubtitleEn: body.heroSubtitleEn,
      heroCtaTextFa: body.heroCtaTextFa,
      heroCtaTextEn: body.heroCtaTextEn,
      heroCtaLink: body.heroCtaLink,
      heroBadgeFa: body.heroBadgeFa,
      heroBadgeEn: body.heroBadgeEn,
      announcementActive: body.announcementActive !== false,
      announcementTextFa: body.announcementTextFa,
      announcementTextEn: body.announcementTextEn,
      announcementLink: body.announcementLink,
      supportPhone: body.supportPhone,
      supportTelegram: body.supportTelegram,
      supportInstagram: body.supportInstagram,
      siteNameFa: body.siteNameFa || "دیجی‌ساب",
      siteNameEn: body.siteNameEn || "DigiSub",
    },
  });

  return NextResponse.json({ ok: true, settings: updated });
}
