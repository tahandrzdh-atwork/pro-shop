import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    const page = await prisma.customPage.findUnique({
      where: { slug: decodedSlug },
    });

    if (!page || !page.published) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (err: any) {
    console.error("GET /api/pages/[slug] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
