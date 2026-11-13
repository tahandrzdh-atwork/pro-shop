import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Cpu,
  Award,
  Users,
  MessageSquareCode,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { resolvePlanPriceToman } from "@/lib/pricing";
import { formatNumber, getDictionary, Locale } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale: Locale =
    cookieStore.get("digisub_locale")?.value === "en" ? "en" : "fa";
  const t = getDictionary(locale);
  const ArrowIcon = locale === "fa" ? ArrowLeft : ArrowRight;

  const [settings, categories, featuredProducts, completedOrdersCount] =
    await Promise.all([
      prisma.siteSetting.findUnique({ where: { id: "default" } }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        include: {
          category: true,
          plans: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { salesCount: "desc" },
        take: 6,
      }),
      prisma.order.count({ where: { status: "COMPLETED" } }),
    ]);

  const rate = settings?.usdToTomanRate ?? 68500;
  const heroBadge =
    locale === "fa"
      ? settings?.heroBadgeFa || settings?.heroNoticeFa || t.hero.badge
      : settings?.heroBadgeEn || settings?.heroNoticeEn || t.hero.badge;

  const heroTitle =
    locale === "fa"
      ? settings?.heroTitleFa || t.hero.title
      : settings?.heroTitleEn || t.hero.title;

  const heroSubtitle =
    locale === "fa"
      ? settings?.heroSubtitleFa || t.hero.subtitle
      : settings?.heroSubtitleEn || t.hero.subtitle;

  const heroCtaText =
    locale === "fa"
      ? settings?.heroCtaTextFa || t.hero.ctaPrimary
      : settings?.heroCtaTextEn || t.hero.ctaPrimary;

  const heroCtaLink = settings?.heroCtaLink || "/store";

  const enrichedProducts = featuredProducts.map((p) => ({
    ...p,
    plans: p.plans.map((pl) => ({
      ...pl,
      effectivePriceToman: resolvePlanPriceToman(pl, rate),
    })),
  }));

  const features = [
    {
      icon: Cpu,
      titleFa: "اتصال مستقیم به سرور مادر (API)",
      titleEn: "Upstream Mother Server API",
      descFa:
        "سفارش‌های تلگرام پرمیوم، استارز و بوست بلافاصله پس از پرداخت به سرور مادر ارسال و تکمیل می‌شوند.",
      descEn:
        "Telegram Premium, Stars & Boost orders dispatch directly to upstream provider APIs upon payment.",
    },
    {
      icon: MessageSquareCode,
      titleFa: "ورود OTP و هاب پیامکی ایرانی",
      titleEn: "SMS OTP & Iranian Gateway Hub",
      descFa:
        "پشتیبانی یکپارچه از ملی‌پیامک، کاوه‌نگار، SMS.ir و فراز اس‌ام‌اس با قابلیت سوییچ آنی از پنل ادمین.",
      descEn:
        "Modular drivers for MelliPayamak, Kavenegar, SMS.ir, and IPPanel configurable directly in Admin.",
    },
    {
      icon: Award,
      titleFa: "باشگاه مشتریان و کش‌بک خودکار",
      titleEn: "Loyalty Tiers & Auto Cashback",
      descFa:
        "امتیازگیری با هر خرید، ارتقا به سطوح برنزی تا الماسی VIP، کد دعوت و تبدیل امتیاز به اعتبار کیف پول.",
      descEn:
        "Earn points per order, unlock Bronze-to-VIP tiers with permanent discounts, referrals & wallet redemption.",
    },
    {
      icon: Users,
      titleFa: "CRM حرفه‌ای و یادآور تمدید",
      titleEn: "360° CRM & Expiry Reminders",
      descFa:
        "تحلیل LTV مشتریان، تگ‌گذاری، یادداشت تیم فروش، کمپین پیامکی و هشدار خودکار پیش از انقضای اشتراک.",
      descEn:
        "Customer LTV tracking, segmentation, internal notes, SMS campaigns & automated renewal alerts.",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-indigo-600/12 via-surface to-emerald-500/10 p-6 sm:p-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-brand">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{heroBadge}</span>
          </div>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-text sm:text-5xl">
            {heroTitle}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            {heroSubtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={heroCtaLink}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
            >
              <span>{heroCtaText}</span>
              <ArrowIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/panel?tab=club"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-bold text-text transition hover:border-brand"
            >
              <Award className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>{t.hero.ctaSecondary}</span>
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6 sm:max-w-lg">
            <div>
              <p className="text-2xl font-extrabold text-text">
                +{formatNumber(1420 + completedOrdersCount, locale)}
              </p>
              <p className="text-xs text-muted">{t.hero.stat1Label}</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-500">
                {t.hero.stat2Value}
              </p>
              <p className="text-xs text-muted">{t.hero.stat2Label}</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-amber-500">
                {t.hero.stat3Value}
              </p>
              <p className="text-xs text-muted">{t.hero.stat3Label}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-text">
            {t.store.featuredCategories}
          </h2>
          <Link
            href="/store"
            className="text-sm font-semibold text-brand hover:underline"
          >
            {t.store.allProducts}
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/store?category=${cat.slug}`}
              className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:border-brand/60 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/12 text-brand">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-bold text-text">
                  {locale === "fa" ? cat.nameFa : cat.nameEn}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {locale === "fa" ? cat.descriptionFa : cat.descriptionEn}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bestsellers */}
      <section className="mt-14">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-text">
            {t.store.bestsellers}
          </h2>
          <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
            {locale === "fa"
              ? `نرخ مرجع دلار: ${formatNumber(rate, locale)} تومان`
              : `Live FX Rate: ${formatNumber(rate, locale)} Toman`}
          </span>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {enrichedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Platform Capabilities */}
      <section className="mt-16">
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-10">
          <div className="flex items-center gap-2 text-sm font-bold text-brand">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <span>
              {locale === "fa"
                ? "معماری مهندسی‌شده برای فروش و اتوماسیون"
                : "Engineered for Automated Digital Commerce"}
            </span>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-surface-2/60 p-5"
                >
                  <Icon className="h-6 w-6 text-brand" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-bold text-text">
                    {locale === "fa" ? f.titleFa : f.titleEn}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {locale === "fa" ? f.descFa : f.descEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
