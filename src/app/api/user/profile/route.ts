import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : user.name;
  const email = typeof body?.email === "string" ? body.email.trim() : user.email;
  const preferredLocale =
    body?.preferredLocale === "en" ? "en" : body?.preferredLocale === "fa" ? "fa" : user.preferredLocale;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name, email, preferredLocale },
    select: { id: true, name: true, email: true, phone: true, preferredLocale: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
