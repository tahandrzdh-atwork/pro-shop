import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const where: any = { published: true };
  if (category) {
    where.category = category;
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
      { focusKeyword: { contains: search } },
    ];
  }

  const articles = await prisma.article.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      author: true,
      category: true,
      readingTimeMin: true,
      seoScore: true,
      views: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ articles });
}
