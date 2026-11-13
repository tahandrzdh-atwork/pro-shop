import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pages = await prisma.customPage.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ pages });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const titleFa = String(body.titleFa ?? "").trim();
  const titleEn = String(body.titleEn ?? titleFa).trim();
  let slug = String(body.slug ?? "").trim().toLowerCase();
  const contentFa = String(body.contentFa ?? "").trim();
  const contentEn = String(body.contentEn ?? contentFa).trim();

  if (!titleFa || !contentFa) {
    return NextResponse.json({ error: "عنوان و متن برگه الزامی است" }, { status: 400 });
  }

  if (!slug) {
    slug = titleEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  const page = await prisma.customPage.create({
    data: {
      titleFa,
      titleEn,
      slug,
      contentFa,
      contentEn,
      showInFooter: body.showInFooter !== false,
      showInHeader: Boolean(body.showInHeader),
      seoTitle: body.seoTitle ? String(body.seoTitle).trim() : titleFa,
      seoDescription: body.seoDescription ? String(body.seoDescription).trim() : null,
      published: body.published !== false,
    },
  });

  return NextResponse.json({ ok: true, page });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const id = String(body.id ?? "");
  if (!id) {
    return NextResponse.json({ error: "Page ID required" }, { status: 400 });
  }

  const updated = await prisma.customPage.update({
    where: { id },
    data: {
      ...(body.titleFa !== undefined ? { titleFa: String(body.titleFa).trim() } : {}),
      ...(body.titleEn !== undefined ? { titleEn: String(body.titleEn).trim() } : {}),
      ...(body.slug !== undefined ? { slug: String(body.slug).trim().toLowerCase() } : {}),
      ...(body.contentFa !== undefined ? { contentFa: String(body.contentFa).trim() } : {}),
      ...(body.contentEn !== undefined ? { contentEn: String(body.contentEn).trim() } : {}),
      ...(body.showInFooter !== undefined ? { showInFooter: Boolean(body.showInFooter) } : {}),
      ...(body.showInHeader !== undefined ? { showInHeader: Boolean(body.showInHeader) } : {}),
      ...(body.seoTitle !== undefined ? { seoTitle: String(body.seoTitle).trim() } : {}),
      ...(body.seoDescription !== undefined ? { seoDescription: String(body.seoDescription).trim() } : {}),
      ...(body.published !== undefined ? { published: Boolean(body.published) } : {}),
    },
  });

  return NextResponse.json({ ok: true, page: updated });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const page = await prisma.customPage.findUnique({ where: { id } });
  if (page?.isSystemPage) {
    return NextResponse.json({ error: "برگه‌های سیستمی اولیه قابل حذف نیستند اما می‌توانید متن آن‌ها را ویرایش کنید." }, { status: 400 });
  }

  await prisma.customPage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
