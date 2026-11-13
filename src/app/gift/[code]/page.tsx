"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Gift,
  Sparkles,
  Heart,
  Copy,
  Check,
  PackageOpen,
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

interface GiftDetails {
  giftCode: string;
  isGift: boolean;
  giftRecipientName: string | null;
  giftMessage: string | null;
  productTitleFa: string;
  productTitleEn: string;
  planTitleFa: string;
  planTitleEn: string;
  deliveredSecret: string | null;
  virtualNumber: string | null;
  virtualSmsCode: string | null;
  createdAt: string;
}

export default function GiftCardPage() {
  const params = useParams();
  const giftCode = params?.code ? String(params.code).toUpperCase() : "";

  const [details, setDetails] = useState<GiftDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpened, setIsOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!giftCode) return;
    const fetchGift = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/gifts/${giftCode}`);
        const data = await res.json();
        if (res.ok) {
          setDetails(data.gift);
        } else {
          setError(data.error || "کارت هدیه یافت نشد");
        }
      } catch (err: any) {
        setError("خطا در بارگزاری هدیه");
      } finally {
        setLoading(false);
      }
    };
    fetchGift();
  }, [giftCode]);

  const copySecret = () => {
    if (!details?.deliveredSecret) return;
    navigator.clipboard.writeText(details.deliveredSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-amber-500 animate-spin" />
        <p className="mt-4 text-sm font-semibold text-text">در حال باز کردن پاکت هدیه...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
        <div className="rounded-3xl border border-border bg-surface p-8 space-y-3">
          <Gift className="mx-auto h-12 w-12 text-muted" />
          <h1 className="text-lg font-bold text-text">کارت هدیه نامعتبر است</h1>
          <p className="text-xs text-muted">{error || "کارت هدیه مورد نظر یافت نشد یا منقضی شده است."}</p>
          <Link
            href="/"
            className="inline-flex rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow"
          >
            ورود به صفحه اصلی دیجی‌ساب
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/15 via-surface to-amber-500/5 p-6 sm:p-10 shadow-2xl shadow-amber-500/10 text-center space-y-6">
        {/* Decorative ribbons / badge */}
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/20 px-4 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 shadow-sm">
          <Gift className="h-4 w-4 animate-bounce" />
          کارت هدیه دیجیتال اختصاصی
        </div>

        {/* Recipient Headline */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-text sm:text-3xl">
            {details.giftRecipientName
              ? `یک هدیه ارزشمند برای «${details.giftRecipientName}» عزیز!`
              : "یک اشتراک ویژه به شما هدیه داده شده است!"}
          </h1>
          <p className="text-xs text-muted">
            شما یک هدیه دیجیتال معتبر و فعال از طرف یکی از دوستانتان دریافت کرده‌اید.
          </p>
        </div>

        {/* Sender Greeting Message Card */}
        {details.giftMessage && (
          <div className="relative rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-start space-y-2 shadow-inner">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
              <Heart className="h-3.5 w-3.5 fill-rose-500" />
              پیام اختصاصی فرستنده:
            </div>
            <p className="text-xs font-medium leading-relaxed text-text italic">
              «{details.giftMessage}»
            </p>
          </div>
        )}

        {/* Gifted Product Box */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
          <span className="text-[11px] font-bold text-muted block">عنوان اشتراک هدیه داده شده:</span>
          <h2 className="text-lg font-extrabold text-brand">
            {details.productTitleFa}
          </h2>
          <span className="inline-block rounded-full bg-indigo-500/10 px-3 py-1 font-semibold text-xs text-brand">
            {details.planTitleFa}
          </span>
        </div>

        {/* Interactive Unbox Button */}
        {!isOpened ? (
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpened(true)}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-black text-white shadow-lg shadow-amber-500/25 transition hover:scale-[1.02]"
            >
              <PackageOpen className="h-5 w-5 transition group-hover:rotate-12" />
              باز کردن کادو و مشاهده اطلاعات فعال‌سازی 🎁
            </button>
            <p className="text-[11px] text-muted">روی دکمه بالا بزنید تا مشخصات اکانت یا شماره فعال‌سازی نمایش داده شود.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3 text-start animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                مشخصات و لایسنس اشتراک فعال شما:
              </span>
              {details.deliveredSecret && (
                <button
                  type="button"
                  onClick={copySecret}
                  className="inline-flex items-center gap-1 rounded-lg bg-surface border border-border px-3 py-1 text-xs font-bold text-text shadow-sm hover:border-emerald-500"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? "کپی شد" : "کپی اطلاعات"}
                </button>
              )}
            </div>

            <pre className="whitespace-pre-wrap break-all rounded-xl bg-surface/90 p-4 font-mono text-xs text-text border border-emerald-500/20 leading-relaxed">
              {details.deliveredSecret || "اشتراک به صورت خودکار روی آیدی تلگرام شما فعال شده است."}
            </pre>

            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              این اشتراک شامل گارانتی کامل در طول دوره از طرف دیجی‌ساب می‌باشد.
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-center gap-3 border-t border-border/80 pt-4 text-xs">
          <Link
            href="/store"
            className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            مشاهده سایر اشتراک‌های فروشگاه
          </Link>
        </div>
      </div>
    </div>
  );
}
