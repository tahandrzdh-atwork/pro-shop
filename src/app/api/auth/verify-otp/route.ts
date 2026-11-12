import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateReferralCode,
  normalizeIranPhone,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizeIranPhone(String(body?.phone ?? ""));
    const code = String(body?.code ?? "").trim();
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const referralCodeInput =
      typeof body?.referralCode === "string"
        ? body.referralCode.trim().toUpperCase()
        : undefined;

    if (!phone || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "شماره موبایل یا کد ۶ رقمی نامعتبر است" },
        { status: 400 }
      );
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone,
        consumed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "کد تایید منقضی شده یا یافت نشد. لطفاً کد جدید دریافت کنید." },
        { status: 400 }
      );
    }

    if (otpRecord.attempts >= 5) {
      return NextResponse.json(
        { error: "تعداد تلاش‌های ناموفق بیش از حد مجاز است. کد جدید بگیرید." },
        { status: 429 }
      );
    }

    if (otpRecord.code !== code) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        { error: "کد واردشده اشتباه است." },
        { status: 400 }
      );
    }

    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { consumed: true },
    });

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      const settings = await prisma.siteSetting.findUnique({
        where: { id: "default" },
      });
      const referralBonus = settings?.referralBonusPoints ?? 100;

      let referrer = null;
      if (referralCodeInput) {
        referrer = await prisma.user.findUnique({
          where: { referralCode: referralCodeInput },
        });
      }

      user = await prisma.user.create({
        data: {
          phone,
          name: name || `کاربر ${phone.slice(-4)}`,
          role: "USER",
          loyaltyPoints: referrer ? referralBonus : 50,
          referralCode: generateReferralCode(phone),
          referredById: referrer?.id ?? null,
          tagsJson: JSON.stringify(["عضو جدید"]),
        },
      });

      if (referrer) {
        await prisma.user.update({
          where: { id: referrer.id },
          data: { loyaltyPoints: { increment: referralBonus } },
        });
        await prisma.notification.create({
          data: {
            userId: referrer.id,
            titleFa: "پاداش دعوت از دوستان!",
            titleEn: "Referral Bonus Awarded!",
            bodyFa: `کاربر جدید با کد دعوت شما ثبت‌نام کرد و ${referralBonus} امتیاز به شما اضافه شد.`,
            bodyEn: `A new friend joined with your code and earned you +${referralBonus} points.`,
          },
        });
      }
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "حساب کاربری شما مسدود شده است." },
        { status: 403 }
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
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json(
      { error: "خطا در تایید کد ورود" },
      { status: 500 }
    );
  }
}
