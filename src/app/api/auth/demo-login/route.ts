import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const target = body?.type === "ADMIN" ? "09120000001" : "09121112233";

    const user = await prisma.user.findUnique({ where: { phone: target } });
    if (!user) {
      return NextResponse.json(
        { error: "Demo account not seeded yet" },
        { status: 404 }
      );
    }

    await setSessionCookie({ userId: user.id, role: user.role });
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    });
  } catch {
    return NextResponse.json({ error: "Demo login failed" }, { status: 500 });
  }
}
