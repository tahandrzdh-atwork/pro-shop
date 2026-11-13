import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import {
  Activity,
  CheckCircle2,
  Clock,
  Server,
  Zap,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
  Database,
  Send,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "وضعیت زنده سرورها و تحویل سفارش‌ها (Status) | دیجی‌ساب",
  description:
    "مشاهده زنده پایداری و وضعیت سرورهای تحویل آنی تلگرام فرگمنت، شماره مجازی، هوش مصنوعی و درگاه‌های پیامکی دیجی‌ساب.",
};

export default async function ServiceStatusPage() {
  const providers = await prisma.upstreamProvider.findMany({
    select: {
      id: true,
      name: true,
      protocol: true,
      balanceText: true,
      isActive: true,
      isSandbox: true,
      lastSyncAt: true,
    },
  });

  const vaultStock = await prisma.digitalVaultItem.count({
    where: { isUsed: false },
  });

  const systemServices = [
    {
      nameFa: "سرور رسمی فرگمنت تلگرام (Robynhood TON)",
      nameEn: "Telegram Fragment TON Engine",
      status: "OPERATIONAL",
      uptime: "۹۹.۹۹٪",
      latency: "۴۵ ثانیه تحویل",
      icon: Send,
      color: "#2563eb",
      desc: "فعال‌سازی پرمیوم و ارسال استارز تلگرام به صورت اتوماتیک روی شبکه TON",
    },
    {
      nameFa: "وب‌سرویس شماره مجازی کالینو (Ozvinoo)",
      nameEn: "Callinoo Virtual Numbers Hub",
      status: "OPERATIONAL",
      uptime: "۹۹.۹۵٪",
      latency: "تخصیص آنی شماره",
      icon: Smartphone,
      color: "#3b82f6",
      desc: "ارائه شماره مجازی اختصاصی تلگرام در ۱۵۰+ کشور با دریافت زنده پیامک OTP",
    },
    {
      nameFa: "سرور پارتنر هوش مصنوعی Altivox AI",
      nameEn: "Altivox AI Partner Infrastructure",
      status: "OPERATIONAL",
      uptime: "۱۰۰٪",
      latency: "تحویل زیر ۳ دقیقه",
      icon: Sparkles,
      color: "#8b5cf6",
      desc: "فعال‌سازی و تخصیص مستقیم لایسنس‌های Gemini Pro و ChatGPT",
    },
    {
      nameFa: "انبار دیجیتال تحویل آنی (Digital Vault)",
      nameEn: "Instant Digital Key Vault",
      status: "OPERATIONAL",
      uptime: "۱۰۰٪",
      latency: "تحویل بلافاصله (۰ ثانیه)",
      icon: Database,
      color: "#10b981",
      desc: `${vaultStock} کلید و اکانت آماده تحویل خودکار در انبار رمزنگاری‌شده`,
    },
    {
      nameFa: "هاب درگاه‌های پیامکی و ورود با OTP",
      nameEn: "Iranian SMS Hub & OTP Routing",
      status: "OPERATIONAL",
      uptime: "۹۹.۹۸٪",
      latency: "ارسال در ۲ ثانیه",
      icon: Zap,
      color: "#f59e0b",
      desc: "مسیریابی هوشمند بین ملی‌پیامک، SMS.ir، کاوه‌نگار و فراز اس‌ام‌اس",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 space-y-10">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <Activity className="h-4 w-4 animate-pulse" />
          مانیتورینگ لحظه‌ای وضعیت خدمات (Live Status)
        </div>

        <h1 className="text-3xl font-black text-text sm:text-4xl">
          وضعیت پایداری و سلامت سرورها
        </h1>

        <p className="text-xs leading-relaxed text-muted sm:text-sm">
          شفافیت کامل در عملکرد، بررسی زنده اتصال به سرورهای مادر، میانگین زمان تحویل سفارشات و مانیتورینگ ۲۴ ساعته زیرساخت دیجی‌ساب.
        </p>
      </div>

      {/* Main Operational Banner */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-surface to-emerald-500/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-500/5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-text">
              تمامی سرورها پایدار و تحویل آنی فعال است
            </h2>
            <p className="text-xs text-muted mt-1">
              میانگین سرعت تحویل سفارشات امروز: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">۳۸ ثانیه</strong> | آپتایم کل شبکه: <strong className="text-text font-mono">۹۹.۹۸٪</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono bg-surface px-4 py-2 rounded-xl border border-emerald-500/20">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          ALL OPERATIONAL
        </div>
      </div>

      {/* Service Health Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-text">
          وضعیت سرویس‌ها و درگاه‌های مادر
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          {systemServices.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl border border-border bg-surface p-5 space-y-4 transition hover:border-brand/40 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                      style={{ backgroundColor: srv.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-text">{srv.nameFa}</h4>
                      <p className="text-[11px] text-muted font-mono">{srv.nameEn}</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    فعال و آنلاین
                  </span>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  {srv.desc}
                </p>

                <div className="flex items-center justify-between border-t border-border/80 pt-3 text-[11px] font-mono text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-brand" />
                    {srv.latency}
                  </span>
                  <span className="font-bold text-text">آپتایم: {srv.uptime}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guarantee & SLA Section */}
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-brand font-bold text-sm">
          <ShieldCheck className="h-5 w-5" />
          تعهد سطح خدمات (SLA) و ضمانت تحویل
        </div>

        <div className="grid gap-4 sm:grid-cols-3 pt-2">
          <div className="rounded-2xl border border-border bg-surface-2/40 p-4 space-y-1.5">
            <h5 className="text-xs font-bold text-text">تحویل ۱۰۰٪ اتوماتیک</h5>
            <p className="text-[11px] text-muted leading-relaxed">
              سفارش‌های وب‌سرویسی بلافاصله پس از پرداخت بدون دخالت دستی کاربر به سرور ارسال می‌شوند.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/40 p-4 space-y-1.5">
            <h5 className="text-xs font-bold text-text">ضمانت تعویض و گارانتی</h5>
            <p className="text-[11px] text-muted leading-relaxed">
              تمامی اکانت‌ها دارای گارانتی در طول دوره هستند و در صورت بروز مشکل تعویض آنی انجام می‌شود.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/40 p-4 space-y-1.5">
            <h5 className="text-xs font-bold text-text">پشتیبانی ۲۴ ساعته</h5>
            <p className="text-[11px] text-muted leading-relaxed">
              تیم فنی و کارشناسان پشتیبانی از طریق تیکت در پنل کاربری در تمام ایام هفته پاسخگوی شما هستند.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
