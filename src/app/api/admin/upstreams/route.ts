import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { testUpstreamConnection } from "@/lib/upstream/engine";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [providers, logs] = await Promise.all([
    prisma.upstreamProvider.findMany({
      include: { _count: { select: { plans: true, apiLogs: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.upstreamApiLog.findMany({
      include: { provider: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return NextResponse.json({ providers, logs });
}

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (body?.action === "TEST_CONNECTION" && body?.providerId) {
    const result = await testUpstreamConnection(String(body.providerId));
    return NextResponse.json(result);
  }

  const name = String(body?.name ?? "").trim();
  const baseUrl = String(body?.baseUrl ?? "").trim();
  const apiKey = String(body?.apiKey ?? "").trim();
  const protocol = String(body?.protocol ?? "SMM_PANEL");
  const isSandbox = body?.isSandbox !== false;

  if (!name || !baseUrl || !apiKey) {
    return NextResponse.json(
      { error: "نام، آدرس Base URL و کلید API الزامی است" },
      { status: 400 }
    );
  }

  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString().slice(-4);

  const provider = await prisma.upstreamProvider.create({
    data: {
      name,
      slug,
      baseUrl,
      apiKey,
      protocol,
      isSandbox,
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true, provider });
}

export async function PATCH(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const providerId = String(body?.providerId ?? "");
  if (!providerId) {
    return NextResponse.json({ error: "providerId required" }, { status: 400 });
  }

  const updated = await prisma.upstreamProvider.update({
    where: { id: providerId },
    data: {
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.isSandbox !== undefined ? { isSandbox: Boolean(body.isSandbox) } : {}),
      ...(body.apiKey ? { apiKey: String(body.apiKey) } : {}),
      ...(body.baseUrl ? { baseUrl: String(body.baseUrl) } : {}),
    },
  });

  return NextResponse.json({ ok: true, provider: updated });
}
