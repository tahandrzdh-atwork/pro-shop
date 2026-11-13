"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Trash2,
  Wallet,
  CreditCard,
  Tag,
  CheckCircle2,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Gift,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/i18n";

export default function CartPage() {
  const {
    locale,
    t,
    user,
    cart,
    removeFromCart,
    updateCartQty,
    clearCart,
    refreshUser,
  } = useApp();

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"GATEWAY" | "WALLET">("GATEWAY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [completedOrder, setCompletedOrder] = useState<{
    orderNumber: string;
    status: string;
    pointsEarned: number;
  } | null>(null);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPriceToman * item.quantity,
    0
  );
  const tierDiscountPercent = user?.tier?.discountPercent ?? 0;
  const tierDiscount = Math.round((subtotal * tierDiscountPercent) / 100);
  const payable = Math.max(0, subtotal - tierDiscount - couponDiscount);

  const ArrowIcon = locale === "fa" ? ArrowLeft : ArrowRight;

  const handleApplyCoupon = async () => {
    setCouponMsg("");
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode, subtotal }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCouponMsg(data.error ?? "Invalid coupon");
      setCouponDiscount(0);
      setAppliedCoupon(null);
      return;
    }
    setCouponDiscount(data.discountToman);
    setAppliedCoupon(data.code);
    setCouponMsg(
      locale === "fa"
        ? `کد ${data.code} با موفقیت اعمال شد!`
        : `Coupon ${data.code} applied!`
    );
  };

  const handleCheckout = async () => {
    setError("");
    if (!user) {
      setError(t.cart.loginRequired);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          couponCode: appliedCoupon,
          isGift,
          giftRecipientName,
          giftMessage,
          items: cart.map((c) => ({
            planId: c.planId,
            quantity: c.quantity,
            customerInputs: c.customerInputs,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed");
        return;
      }

      clearCart();
      await refreshUser();
      setCompletedOrder({
        orderNumber: data.order.orderNumber,
        status: data.order.status,
        pointsEarned: data.order.pointsEarned,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <div className="rounded-3xl border border-emerald-500/30 bg-surface p-8 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-text">
            {t.cart.checkoutSuccess}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {locale === "fa"
              ? `شماره سفارش: ${completedOrder.orderNumber} | وضعیت تحویل: ${completedOrder.status} | امتیاز دریافتی: +${formatNumber(completedOrder.pointsEarned, locale)}`
              : `Order: ${completedOrder.orderNumber} | Status: ${completedOrder.status} | Points earned: +${completedOrder.pointsEarned}`}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/panel"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500"
            >
              <span>
                {locale === "fa"
                  ? "مشاهده اطلاعات تحویل در پنل کاربری"
                  : "View Delivered Credentials in User Panel"}
              </span>
              <ArrowIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <div className="rounded-3xl border border-border bg-surface p-10">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-text">{t.cart.empty}</h1>
          <Link
            href="/store"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {t.cart.browseStore}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold text-text">{t.cart.title}</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-12">
        {/* Cart Items */}
        <div className="lg:col-span-7 space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center"
            >
              <div>
                <h2 className="font-bold text-text">
                  {locale === "fa" ? item.productTitleFa : item.productTitleEn}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {locale === "fa" ? item.planTitleFa : item.planTitleEn}
                </p>
                {Object.keys(item.customerInputs).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(item.customerInputs).map(([k, v]) => (
                      <span
                        key={k}
                        className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-muted"
                      >
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, item.quantity - 1)}
                    className="h-7 w-7 rounded-md border border-border bg-surface-2 text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {formatNumber(item.quantity, locale)}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, item.quantity + 1)}
                    className="h-7 w-7 rounded-md border border-border bg-surface-2 text-sm font-bold"
                  >
                    +
                  </button>
                </div>

                <p className="text-sm font-extrabold text-text">
                  {formatCurrency(item.unitPriceToman * item.quantity, locale)}
                </p>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="text-muted hover:text-red-500"
                  aria-label={t.cart.remove}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary & Payment */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-3xl border border-border bg-surface p-6">
            {/* Coupon */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag
                  className="pointer-events-none absolute top-1/2 -translate-y-1/2 inset-inline-start-3 h-4 w-4 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder={`${t.cart.couponPlaceholder} (WELCOME15)`}
                  className="w-full rounded-xl border border-border bg-surface-2 py-2 ps-9 pe-3 text-sm text-text"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="rounded-xl border border-border bg-surface-2 px-4 py-2 text-xs font-bold text-text hover:border-brand"
              >
                {t.cart.applyCoupon}
              </button>
            </div>
            {couponMsg && (
              <p className="mt-2 text-xs text-brand font-medium">{couponMsg}</p>
            )}

            {/* Totals */}
            <div className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted">
                <span>{t.cart.subtotal}</span>
                <span>{formatCurrency(subtotal, locale)}</span>
              </div>
              {tierDiscount > 0 && (
                <div className="flex justify-between text-emerald-500">
                  <span>
                    {t.cart.tierDiscount} ({tierDiscountPercent}%)
                  </span>
                  <span>-{formatCurrency(tierDiscount, locale)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-500">
                  <span>{t.cart.couponDiscount}</span>
                  <span>-{formatCurrency(couponDiscount, locale)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold text-text">
                <span>{t.cart.payable}</span>
                <span>{formatCurrency(payable, locale)}</span>
              </div>
            </div>

            {/* Gift Order Toggle Card */}
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-3">
              <label className="flex cursor-pointer items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold text-text">
                    {locale === "fa" ? "این سفارش هدیه است (کارت پستال دیجیتال)" : "Send as a Gift"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(e) => setIsGift(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              {isGift && (
                <div className="space-y-2 pt-2 border-t border-amber-500/20">
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">
                      {locale === "fa" ? "نام یا لقب دریافت‌کننده کادو *" : "Recipient Name *"}
                    </label>
                    <input
                      type="text"
                      required={isGift}
                      value={giftRecipientName}
                      onChange={(e) => setGiftRecipientName(e.target.value)}
                      placeholder={locale === "fa" ? "مثال: علی رضایی" : "e.g. Alex Smith"}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">
                      {locale === "fa" ? "پیام تبریک اختصاصی فرستنده (اختیاری)" : "Custom Greeting Message"}
                    </label>
                    <textarea
                      rows={2}
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      placeholder={locale === "fa" ? "تولدت مبارک رفیق! اشتراک ۱ ساله تلگرام پرمیوم از طرف من." : "Happy Birthday! Enjoy your Telegram Premium."}
                      className="w-full rounded-xl border border-border bg-surface p-2 text-xs text-text"
                    />
                  </div>
                  <p className="text-[10px] text-muted">
                    {locale === "fa"
                      ? "💡 پس از خرید، یک لینک کارت تبریک اختصاصی متحرک با افکت کادو دریافت می‌کنید که می‌توانید برای دوستتان بفرستید."
                      : "You will receive an interactive digital gift card link with unboxing animation to share with the recipient."}
                  </p>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="mt-5 space-y-2.5 border-t border-border pt-4">
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface-2/50 p-3">
                <div className="flex items-center gap-2.5 text-sm font-semibold">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "GATEWAY"}
                    onChange={() => setPaymentMethod("GATEWAY")}
                  />
                  <CreditCard className="h-4 w-4 text-brand" aria-hidden="true" />
                  <span>{t.cart.payWithGateway}</span>
                </div>
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface-2/50 p-3">
                <div className="flex items-center gap-2.5 text-sm font-semibold">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "WALLET"}
                    onChange={() => setPaymentMethod("WALLET")}
                  />
                  <Wallet className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  <span>{t.cart.payWithWallet}</span>
                </div>
                {user && (
                  <span className="text-xs text-muted">
                    {formatCurrency(user.walletBalance, locale)}
                  </span>
                )}
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs font-medium text-red-500">
                {error}{" "}
                {!user && (
                  <Link href="/auth" className="underline font-bold ms-1">
                    {t.nav.login}
                  </Link>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckout}
              className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting
                ? t.common.loading
                : `${locale === "fa" ? "پرداخت و تکمیل خودکار سفارش" : "Pay & Auto-Fulfill"} (${formatCurrency(payable, locale)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
