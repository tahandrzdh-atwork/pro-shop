"use client";

import React, { useEffect, useRef, useState } from "react";
import { BellRing, Megaphone, UserCheck, StickyNote } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatDate, formatNumber } from "@/lib/i18n";

interface CrmData {
  customers: Array<{
    id: string;
    phone: string;
    name: string | null;
    role: string;
    walletBalance: number;
    loyaltyPoints: number;
    totalSpent: number;
    tagsJson: string;
    _count: { orders: number; tickets: number; referrals: number };
    crmNotesReceived: Array<{
      id: string;
      content: string;
      createdAt: string;
      author: { name: string | null };
    }>;
  }>;
  campaigns: Array<{
    id: string;
    title: string;
    segment: string;
    channel: string;
    recipientCount: number;
    createdAt: string;
  }>;
  expiringItems: Array<{
    id: string;
    productTitleFa: string;
    productTitleEn: string;
    expiresAt: string;
    reminderSent: boolean;
    order: { user: { name: string | null; phone: string } };
  }>;
}

export function AdminCrmTab() {
  const { locale } = useApp();
  const [data, setData] = useState<CrmData | null>(null);
  const [msg, setMsg] = useState("");
  const [campaign, setCampaign] = useState({
    title: "",
    segment: "ALL",
    channel: "SMS",
    message: "",
  });

  const [activeCustomer, setActiveCustomer] = useState<CrmData["customers"][0] | null>(null);
  const [noteText, setNoteText] = useState("");
  const [walletDelta, setWalletDelta] = useState("0");
  const [tagsText, setTagsText] = useState("");
  const customerDialogRef = useRef<HTMLDialogElement>(null);

  const load = async () => {
    const res = await fetch("/api/admin/crm", { cache: "no-store" });
    setData(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const handleSendReminders = async () => {
    const res = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SEND_EXPIRY_REMINDERS" }),
    });
    const json = await res.json();
    setMsg(
      locale === "fa"
        ? `یادآور تمدید برای ${json.sentCount} اشتراک ارسال شد.`
        : `Sent expiry reminders for ${json.sentCount} subscriptions.`
    );
    await load();
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "LAUNCH_CAMPAIGN", ...campaign }),
    });
    const json = await res.json();
    if (res.ok) {
      setMsg(
        locale === "fa"
          ? `کمپین برای ${json.campaign.recipientCount} مشتری ارسال شد!`
          : `Campaign sent to ${json.campaign.recipientCount} customers!`
      );
      setCampaign({ title: "", segment: "ALL", channel: "SMS", message: "" });
      await load();
    }
  };

  const openCustomer360 = (c: CrmData["customers"][0]) => {
    setActiveCustomer(c);
    try {
      setTagsText((JSON.parse(c.tagsJson) as string[]).join(", "));
    } catch {
      setTagsText("");
    }
    setWalletDelta("0");
    setNoteText("");
    customerDialogRef.current?.showModal();
  };

  const handleSaveCustomer360 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    if (noteText.trim()) {
      await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_NOTE",
          userId: activeCustomer.id,
          content: noteText,
        }),
      });
    }

    const tags = tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await fetch("/api/admin/crm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: activeCustomer.id,
        tags,
        walletDelta: Number(walletDelta) || 0,
      }),
    });

    customerDialogRef.current?.close();
    setMsg(locale === "fa" ? "پرونده CRM مشتری به‌روزرسانی شد." : "Customer CRM record updated.");
    await load();
  };

  if (!data) return <p className="text-sm text-muted">Loading CRM...</p>;

  return (
    <div className="space-y-6">
      {msg && (
        <p className="rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-500">
          {msg}
        </p>
      )}

      {/* Expiring Watchlist & Campaign */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-text">
              <BellRing className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <h2>{locale === "fa" ? "اشتراک‌های نزدیک به انقضا (۷ روز)" : "Expiring Soon (7d)"}</h2>
            </div>
            <button
              type="button"
              onClick={handleSendReminders}
              className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950"
            >
              {locale === "fa" ? "ارسال پیامک یادآور" : "Send Renewal SMS"}
            </button>
          </div>

          {data.expiringItems.length === 0 ? (
            <p className="text-xs text-muted">
              {locale === "fa" ? "اشتراک در حال انقضایی یافت نشد." : "No expiring subscriptions."}
            </p>
          ) : (
            <div className="space-y-2">
              {data.expiringItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-surface-2/60 p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-text">
                      {item.order.user.name} ({item.order.user.phone})
                    </p>
                    <p className="text-muted">
                      {locale === "fa" ? item.productTitleFa : item.productTitleEn}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-semibold text-amber-500">
                      {formatDate(item.expiresAt, locale)}
                    </p>
                    <p className="text-[10px] text-muted">
                      {item.reminderSent ? "Reminder Sent" : "Pending Alert"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Launcher */}
        <form
          onSubmit={handleLaunchCampaign}
          className="rounded-2xl border border-border bg-surface p-5 space-y-3"
        >
          <div className="flex items-center gap-2 font-bold text-text">
            <Megaphone className="h-4 w-4 text-brand" aria-hidden="true" />
            <h2>{locale === "fa" ? "کمپین هوشمند سگمنت مشتریان" : "Targeted CRM Campaign"}</h2>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <input
              type="text"
              required
              placeholder={locale === "fa" ? "عنوان کمپین" : "Campaign Title"}
              value={campaign.title}
              onChange={(e) => setCampaign({ ...campaign, title: e.target.value })}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs"
            />
            <select
              value={campaign.segment}
              onChange={(e) => setCampaign({ ...campaign, segment: e.target.value })}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs"
            >
              <option value="ALL">{locale === "fa" ? "همه مشتریان" : "All Customers"}</option>
              <option value="VIP">{locale === "fa" ? "اعضای طلایی و VIP" : "Gold & VIP Club"}</option>
              <option value="INACTIVE">{locale === "fa" ? "مشتریان غیرفعال" : "Inactive / At-Risk"}</option>
            </select>
            <select
              value={campaign.channel}
              onChange={(e) => setCampaign({ ...campaign, channel: e.target.value })}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs"
            >
              <option value="SMS">SMS + In-App</option>
              <option value="IN_APP">In-App Only</option>
            </select>
          </div>

          <textarea
            rows={2}
            required
            placeholder={locale === "fa" ? "متن پیام کمپین (مثلاً کد تخفیف ویژه)..." : "Campaign message..."}
            value={campaign.message}
            onChange={(e) => setCampaign({ ...campaign, message: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface-2 p-3 text-xs"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
          >
            {locale === "fa" ? "ارسال کمپین" : "Launch Campaign"}
          </button>
        </form>
      </div>

      {/* Customer 360 Table */}
      <div tabIndex={0} role="region" aria-labelledby="crm-customers-caption" className="table-wrapper">
        <table className="responsive-table">
          <caption id="crm-customers-caption" className="p-4 text-start font-bold text-text">
            {locale === "fa" ? "پرونده ۳۶۰ درجه مشتریان (LTV & باشگاه)" : "360° Customer CRM Directory"}
          </caption>
          <thead>
            <tr>
              <th>{locale === "fa" ? "مشتری" : "Customer"}</th>
              <th>{locale === "fa" ? "ارزش کل (LTV)" : "LTV Spent"}</th>
              <th>{locale === "fa" ? "کیف پول / امتیاز" : "Wallet / Points"}</th>
              <th>{locale === "fa" ? "تگ‌های CRM" : "CRM Tags"}</th>
              <th>{locale === "fa" ? "پرونده" : "Inspect"}</th>
            </tr>
          </thead>
          <tbody>
            {data.customers.map((c) => {
              let tags: string[] = [];
              try {
                tags = JSON.parse(c.tagsJson);
              } catch {
                tags = [];
              }
              return (
                <tr key={c.id}>
                  <td data-label="Customer">
                    <p className="font-bold text-text">{c.name || "-"}</p>
                    <p className="font-mono text-xs text-muted">{c.phone}</p>
                  </td>
                  <td data-label="LTV" className="font-bold text-emerald-500">
                    {formatCurrency(c.totalSpent, locale)}
                    <p className="text-[11px] font-normal text-muted">
                      {formatNumber(c._count.orders, locale)} orders
                    </p>
                  </td>
                  <td data-label="Wallet/Pts" className="text-xs">
                    <p>{formatCurrency(c.walletBalance, locale)}</p>
                    <p className="text-amber-500 font-semibold">
                      {formatNumber(c.loyaltyPoints, locale)} pts
                    </p>
                  </td>
                  <td data-label="Tags">
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tg) => (
                        <span
                          key={tg}
                          className="rounded-md bg-indigo-500/12 px-2 py-0.5 text-[11px] font-semibold text-brand"
                        >
                          {tg}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td data-label="Inspect">
                    <button
                      type="button"
                      onClick={() => openCustomer360(c)}
                      className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-bold text-text hover:text-brand"
                    >
                      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {locale === "fa" ? "مدیریت ۳۶۰°" : "Manage 360°"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Customer 360 Dialog */}
      <dialog
        ref={customerDialogRef}
        aria-labelledby="crm-dialog-title"
        className="m-auto w-full max-w-lg rounded-2xl p-6 shadow-2xl"
      >
        <h2 id="crm-dialog-title" className="text-lg font-extrabold text-text">
          {activeCustomer?.name} ({activeCustomer?.phone})
        </h2>

        <form onSubmit={handleSaveCustomer360} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">
              {locale === "fa" ? "تگ‌های مشتری (با ویرگول جدا کنید)" : "Tags (comma-separated)"}
            </label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">
              {locale === "fa"
                ? "تعدیل دستی کیف پول (تومان، مثبت یا منفی)"
                : "Wallet Adjustment (Toman, +/-)"}
            </label>
            <input
              type="number"
              value={walletDelta}
              onChange={(e) => setWalletDelta(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">
              <StickyNote className="inline h-3.5 w-3.5 me-1" aria-hidden="true" />
              {locale === "fa" ? "افزودن یادداشت داخلی CRM" : "Add Internal CRM Note"}
            </label>
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-xs"
            />
          </div>

          {activeCustomer && activeCustomer.crmNotesReceived.length > 0 && (
            <div className="max-h-32 overflow-auto space-y-1.5 rounded-xl bg-surface-2/60 p-3 text-xs">
              {activeCustomer.crmNotesReceived.map((n) => (
                <div key={n.id} className="border-b border-border pb-1 last:border-0">
                  <p className="text-text">{n.content}</p>
                  <p className="text-[10px] text-muted">{n.author.name}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => customerDialogRef.current?.close()}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold"
            >
              {locale === "fa" ? "بستن" : "Close"}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
            >
              {locale === "fa" ? "ذخیره تغییرات CRM" : "Save CRM Changes"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
