import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { analyzeSeo } from "@/lib/seo-analyzer";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ articles });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  let slug = String(body.slug ?? "").trim().toLowerCase();

  if (!title || !content) {
    return NextResponse.json({ error: "عنوان و متن مقاله الزامی است." }, { status: 400 });
  }

  if (!slug) {
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  const focusKeyword = String(body.focusKeyword ?? "").trim();
  const seoTitle = String(body.seoTitle ?? title).trim();
  const seoDescription = String(body.seoDescription ?? body.excerpt ?? "").trim();
  const secondaryKeywords = String(body.secondaryKeywords ?? "").trim();
  const canonicalUrl = body.canonicalUrl ? String(body.canonicalUrl).trim() : null;
  const coverImage = body.coverImage ? String(body.coverImage).trim() : null;
  const category = String(body.category ?? "آموزش و مقالات").trim();
  const author = String(body.author ?? "تیم تحریریه دیجی‌ساب").trim();
  const readingTimeMin = Number(body.readingTimeMin) || Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
  const published = body.published !== false;
  const excerpt = body.excerpt ? String(body.excerpt).trim() : seoDescription.slice(0, 160);
  const schemaType = String(body.schemaType ?? "Article");
  const faqItemsJson = body.faqItemsJson ? String(body.faqItemsJson) : null;

  // Compute live SEO score
  let faqList: Array<{ question: string; answer: string }> = [];
  try {
    if (faqItemsJson) faqList = JSON.parse(faqItemsJson);
  } catch {}

  const seoResult = analyzeSeo({
    title,
    seoTitle,
    seoDescription,
    slug,
    content,
    focusKeyword,
    secondaryKeywords,
    faqItems: faqList,
  });

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      content,
      excerpt,
      coverImage,
      author,
      category,
      readingTimeMin,
      published,
      seoTitle,
      seoDescription,
      focusKeyword,
      secondaryKeywords,
      canonicalUrl,
      schemaType,
      faqItemsJson,
      seoScore: seoResult.score,
    },
  });

  return NextResponse.json({ ok: true, article, seoResult });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const id = String(body.id ?? "");
  if (!id) {
    return NextResponse.json({ error: "Article ID required" }, { status: 400 });
  }

  const current = await prisma.article.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const title = body.title !== undefined ? String(body.title).trim() : current.title;
  const content = body.content !== undefined ? String(body.content).trim() : current.content;
  const slug = body.slug !== undefined ? String(body.slug).trim().toLowerCase() : current.slug;
  const seoTitle = body.seoTitle !== undefined ? String(body.seoTitle).trim() : current.seoTitle ?? title;
  const seoDescription = body.seoDescription !== undefined ? String(body.seoDescription).trim() : current.seoDescription ?? "";
  const focusKeyword = body.focusKeyword !== undefined ? String(body.focusKeyword).trim() : current.focusKeyword ?? "";
  const secondaryKeywords = body.secondaryKeywords !== undefined ? String(body.secondaryKeywords).trim() : current.secondaryKeywords ?? "";
  const faqItemsJson = body.faqItemsJson !== undefined ? String(body.faqItemsJson) : current.faqItemsJson;

  let faqList: Array<{ question: string; answer: string }> = [];
  try {
    if (faqItemsJson) faqList = JSON.parse(faqItemsJson);
  } catch {}

  const seoResult = analyzeSeo({
    title,
    seoTitle,
    seoDescription,
    slug,
    content,
    focusKeyword,
    secondaryKeywords,
    faqItems: faqList,
  });

  const updated = await prisma.article.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title } : {}),
      ...(body.content !== undefined ? { content } : {}),
      ...(body.slug !== undefined ? { slug } : {}),
      ...(body.excerpt !== undefined ? { excerpt: String(body.excerpt).trim() } : {}),
      ...(body.coverImage !== undefined ? { coverImage: String(body.coverImage).trim() || null } : {}),
      ...(body.author !== undefined ? { author: String(body.author).trim() } : {}),
      ...(body.category !== undefined ? { category: String(body.category).trim() } : {}),
      ...(body.readingTimeMin !== undefined ? { readingTimeMin: Number(body.readingTimeMin) } : {}),
      ...(body.published !== undefined ? { published: Boolean(body.published) } : {}),
      ...(body.seoTitle !== undefined ? { seoTitle } : {}),
      ...(body.seoDescription !== undefined ? { seoDescription } : {}),
      ...(body.focusKeyword !== undefined ? { focusKeyword } : {}),
      ...(body.secondaryKeywords !== undefined ? { secondaryKeywords } : {}),
      ...(body.canonicalUrl !== undefined ? { canonicalUrl: String(body.canonicalUrl).trim() || null } : {}),
      ...(body.schemaType !== undefined ? { schemaType: String(body.schemaType) } : {}),
      ...(body.faqItemsJson !== undefined ? { faqItemsJson } : {}),
      seoScore: seoResult.score,
    },
  });

  return NextResponse.json({ ok: true, article: updated, seoResult });
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

  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
