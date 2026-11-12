import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const locale = body?.locale === "en" ? "en" : "fa";

    const cookieStore = await cookies();
    cookieStore.set("digisub_locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    const user = await getCurrentUser();
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { preferredLocale: locale },
      });
    }

    return NextResponse.json({ ok: true, locale });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
