import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendSms } from "@/lib/sms/providers";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [providers, logs] = await Promise.all([
    prisma.smsProviderConfig.findMany({ orderBy: { providerKey: "asc" } }),
    prisma.smsLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
  ]);

  return NextResponse.json({ providers, logs });
}

export async function PATCH(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const providerKey = String(body?.providerKey ?? "");
  if (!providerKey) {
    return NextResponse.json({ error: "providerKey required" }, { status: 400 });
  }

  if (body?.activateOnly) {
    await prisma.$transaction([
      prisma.smsProviderConfig.updateMany({ data: { isActive: false } }),
      prisma.smsProviderConfig.update({
        where: { providerKey },
        data: { isActive: true },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  const updated = await prisma.smsProviderConfig.update({
    where: { providerKey },
    data: {
      apiKey: body?.apiKey !== undefined ? String(body.apiKey) : undefined,
      username: body?.username !== undefined ? String(body.username) : undefined,
      password: body?.password !== undefined ? String(body.password) : undefined,
      senderLine: body?.senderLine !== undefined ? String(body.senderLine) : undefined,
      otpPatternCode:
        body?.otpPatternCode !== undefined ? String(body.otpPatternCode) : undefined,
      orderPatternCode:
        body?.orderPatternCode !== undefined
          ? String(body.orderPatternCode)
          : undefined,
      expiryPatternCode:
        body?.expiryPatternCode !== undefined
          ? String(body.expiryPatternCode)
          : undefined,
    },
  });

  if (body?.setActive) {
    await prisma.$transaction([
      prisma.smsProviderConfig.updateMany({ data: { isActive: false } }),
      prisma.smsProviderConfig.update({
        where: { providerKey },
        data: { isActive: true },
      }),
    ]);
  }

  return NextResponse.json({ ok: true, provider: updated });
}

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const phone = String(body?.phone ?? admin.phone).trim();
  const res = await sendSms({
    phone,
    templateType: "OTP",
    message: "تست اتصال پنل پیامکی دیجی‌ساب با موفقیت انجام شد. کد نمونه: 123456",
    patternValues: { code: "123456" },
  });

  return NextResponse.json({ ok: res.success, result: res });
}
