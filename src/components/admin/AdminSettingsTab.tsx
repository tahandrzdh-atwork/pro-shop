"use client";

import React, { useEffect, useState } from "react";
import { Settings, Ticket, LifeBuoy } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatNumber } from "@/lib/i18n";

export function AdminSettingsTab() {
  const { locale, t } = useApp();
  const [usdRate, setUsdRate] = useState("68500");
  const [heroFa, setHeroFa] = useState("");
  const [heroEn, setHeroEn] = useState("");
  const [coupons, setCoupons] = useState<
    Array<{ id: string; code: string; discountType: string; value: number; usedCount: number; maxUses: number }>
  >([]);
  const [tickets, setTickets] = useState<
    Array<{
      id: string;
      ticketNumber: string;
      subject: string;
      status: string;
      user: { name: string | null; phone: string };
      messages: Array<{ id: string; isAdmin: boolean; body: string }>;
    }>
  >([]);
  const [newCoupon, setNewCoupon] = useState({ code: "", value: "10", discountType: "PERCENT" });
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [setRes, tkRes] = await Promise.all([
      fetch("/api/admin/settings", { cache: "no-store" }),
      fetch("/api/admin/tickets", { cache: "no-store" }),
    ]);
    const setData = await setRes.json();
    const tkData = await tkRes.json();
    if (setData.settings) {
      setUsdRate(String(setData.settings.usdToTomanRate));
      setHeroFa(setData.settings.heroNoticeFa);
      setHeroEn(setData.settings.heroNoticeEn);
    }
    setCoupons(setData.coupons ?? []);
    setTickets(tkData.tickets ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usdToTomanRate: Number(usdRate),
        heroNoticeFa: heroFa,
        heroNoticeEn: heroEn,
      }),
    });
    setMsg(locale === "fa" ? "تنظیمات و نرخ دلار ذخیره شد." : "Settings & FX rate saved.");
    await load();
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_COUPON",
        code: newCoupon.code,
        value: Number(newCoupon.value),
        discountType: newCoupon.discountType,
      }),
    });
    setNewCoupon({ code: "", value: "10", discountType: "PERCENT" });
    await load();
  };

  const handleReplyTicket = async (ticketId: string) => {
    const message = replyText[ticketId]?.trim();
    if (!message) return;
    await fetch("/api/admin/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, message, status: "ANSWERED" }),
    });
    setReplyText({ ...replyText, [ticketId]: "" });
    await load();
  };

  return (
    <div className="space-y-6">
      {msg && (
        <p className="rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-500">
          {msg}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FX Rate & Banners */}
        <form
          onSubmit={handleSaveSettings}
          className="rounded-2xl border border-border bg-surface p-5 space-y-4"
        >
          <div className="flex items-center gap-2 font-bold text-text">
            <Settings className="h-4 w-4 text-brand" aria-hidden="true" />
            <h2>{t.adminPanel.settings}</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">
              {locale === "fa"
                ? "نرخ مرجع دلار به تومان (به‌روزرسانی خودکار قیمت‌ها)"
                : "USD to Toman Exchange Rate (Auto-syncs USD products)"}
            </label>
            <input
              type="number"
              value={usdRate}
              onChange={(e) => setUsdRate(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">
              {locale === "fa" ? "متن اطلاعیه بالای سایت (فارسی)" : "Hero Notice (FA)"}
            </label>
            <input
              type="text"
              value={heroFa}
              onChange={(e) => setHeroFa(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">
              {locale === "fa" ? "متن اطلاعیه بالای سایت (انگلیسی)" : "Hero Notice (EN)"}
            </label>
            <input
              type="text"
              dir="ltr"
              value={heroEn}
              onChange={(e) => setHeroEn(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white"
          >
            {t.common.save}
          </button>
        </form>

        {/* Coupons */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-text">
            <Ticket className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <h2>{t.adminPanel.coupons}</h2>
          </div>

          <form onSubmit={handleCreateCoupon} className="grid grid-cols-3 gap-2">
            <input
              type="text"
              required
              dir="ltr"
              placeholder="CODE20"
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
            />
            <select
              value={newCoupon.discountType}
              onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
              className="rounded-xl border border-border bg-surface-2 px-2 py-2 text-xs"
            >
              <option value="PERCENT">%</option>
              <option value="FIXED">Toman</option>
            </select>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={newCoupon.value}
                onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface-2 px-2 py-2 font-mono text-xs"
              />
              <button
                type="submit"
                className="rounded-xl bg-amber-500 px-3 text-xs font-bold text-slate-950"
              >
                +
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {coupons.map((cp) => (
              <div
                key={cp.id}
                className="flex items-center justify-between rounded-xl bg-surface-2/60 px-3 py-2 text-xs"
              >
                <span className="font-mono font-bold text-brand">{cp.code}</span>
                <span>
                  {cp.discountType === "PERCENT"
                    ? `${cp.value}%`
                    : `${formatNumber(cp.value, locale)} T`}
                </span>
                <span className="text-muted">
                  {cp.usedCount}/{cp.maxUses}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Support Tickets */}
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2 font-bold text-text">
          <LifeBuoy className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <h2>{t.adminPanel.tickets}</h2>
        </div>

        <div className="space-y-3">
          {tickets.map((tk) => (
            <div key={tk.id} className="rounded-xl border border-border bg-surface-2/40 p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-text">
                  <span className="font-mono text-brand me-2">{tk.ticketNumber}</span>
                  {tk.subject} — {tk.user.name} ({tk.user.phone})
                </span>
                <span className="rounded-full bg-surface px-2.5 py-0.5 font-semibold">
                  {tk.status}
                </span>
              </div>
              {tk.messages.map((m) => (
                <p
                  key={m.id}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    m.isAdmin ? "bg-indigo-500/10 text-text" : "bg-surface text-muted"
                  }`}
                >
                  <strong>{m.isAdmin ? "Admin: " : "User: "}</strong>
                  {m.body}
                </p>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText[tk.id] ?? ""}
                  onChange={(e) => setReplyText({ ...replyText, [tk.id]: e.target.value })}
                  placeholder={locale === "fa" ? "پاسخ ادمین..." : "Admin reply..."}
                  className="flex-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleReplyTicket(tk.id)}
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white"
                >
                  {locale === "fa" ? "ارسال پاسخ" : "Reply"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
