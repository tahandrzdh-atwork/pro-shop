import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeIranPhone } from "@/lib/auth";
import { formatOriginBoundOtpSms, sendSms } from "@/lib/sms/providers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizeIranPhone(String(body?.phone ?? ""));

    if (!phone) {
      return NextResponse.json(
        { error: "شماره موبایل معتبر نیست (مثال: 09123456789)" },
        { status: 400 }
      );
    }

    // Cooldown rate-limit: 45 seconds between OTP requests for same phone
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        phone,
        createdAt: { gt: new Date(Date.now() - 45 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentOtp) {
      const waitSec = Math.ceil(
        (recentOtp.createdAt.getTime() + 45000 - Date.now()) / 1000
      );
      return NextResponse.json(
        { error: `لطفاً ${waitSec} ثانیه دیگر مجدداً تلاش کنید.`, retryAfter: waitSec },
        { status: 429 }
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    const smsText = formatOriginBoundOtpSms(code, "DigiSub");
    const smsResult = await sendSms({
      phone,
      templateType: "OTP",
      message: smsText,
      patternValues: { code },
    });

    return NextResponse.json({
      ok: true,
      phone,
      expiresIn: 180,
      providerKey: smsResult.providerKey,
      sandboxCode: smsResult.sandboxCode ?? null,
    });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json(
      { error: "خطا در ارسال کد تایید" },
      { status: 500 }
    );
  }
}
