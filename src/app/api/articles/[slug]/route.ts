import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const article = await prisma.article.findUnique({
    where: { slug: decodedSlug },
  });

  if (!article || !article.published) {
    return NextResponse.json({ error: "مقاله یافت نشد" }, { status: 404 });
  }

  // Increment views
  await prisma.article.update({
    where: { id: article.id },
    data: { views: { increment: 1 } },
  });

  // Fetch 3 related articles in same category
  const relatedArticles = await prisma.article.findMany({
    where: {
      category: article.category,
      id: { not: article.id },
      published: true,
    },
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      readingTimeMin: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ article, relatedArticles });
}
