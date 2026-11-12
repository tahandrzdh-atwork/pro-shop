"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Wallet,
  Award,
  LifeBuoy,
  UserCog,
  Copy,
  Check,
  Eye,
  EyeOff,
  PlusCircle,
  Bell,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/i18n";

type TabKey = "overview" | "orders" | "wallet" | "club" | "tickets" | "profile";

interface DashboardData {
  user: {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    walletBalance: number;
    loyaltyPoints: number;
    totalSpent: number;
    referralCode: string;
    preferredLocale: string;
  };
  currentTier: {
    key: string;
    nameFa: string;
    nameEn: string;
    discountPercent: number;
    cashbackPercent: number;
    colorHex: string;
  } | null;
  nextTier: {
    nameFa: string;
    nameEn: string;
    minPoints: number;
  } | null;
  tiers: Array<{
    id: string;
    key: string;
    nameFa: string;
    nameEn: string;
    minPoints: number;
    discountPercent: number;
    cashbackPercent: number;
    colorHex: string;
  }>;
  referralsCount: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentMethod: string;
    totalToman: number;
    pointsEarned: number;
    createdAt: string;
    items: Array<{
      id: string;
      productTitleFa: string;
      productTitleEn: string;
      planTitleFa: string;
      planTitleEn: string;
      fulfillmentStatus: string;
      deliveredSecret: string | null;
      expiresAt: string | null;
      customerInputsJson: string;
    }>;
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    descriptionFa: string;
    descriptionEn: string;
    createdAt: string;
  }>;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    subject: string;
    category: string;
    status: string;
    updatedAt: string;
    messages: Array<{
      id: string;
      isAdmin: boolean;
      body: string;
      createdAt: string;
    }>;
  }>;
  notifications: Array<{
    id: string;
    titleFa: string;
    titleEn: string;
    bodyFa: string;
    bodyEn: string;
    createdAt: string;
  }>;
}

function UserPanelContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "overview";
  const { locale, t, user: authUser, refreshUser } = useApp();

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [topupAmount, setTopupAmount] = useState("500000");
  const [redeemPoints, setRedeemPoints] = useState("100");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketBody, setTicketBody] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const paramTab = searchParams.get("tab") as TabKey | null;
    if (paramTab) setTab(paramTab);
  }, [searchParams]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/dashboard", { cache: "no-store" });
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
        setProfileName(json.user.name ?? "");
        setProfileEmail(json.user.email ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) {
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [authUser, fetchDashboard]);

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("");
    const res = await fetch("/api/user/wallet/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(topupAmount) }),
    });
    if (res.ok) {
      setFeedback(locale === "fa" ? "کیف پول با موفقیت شارژ شد!" : "Wallet topped up!");
      await refreshUser();
      await fetchDashboard();
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("");
    const res = await fetch("/api/user/loyalty/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: Number(redeemPoints) }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedback(json.error ?? "Failed");
      return;
    }
    setFeedback(
      locale === "fa"
        ? `امتیاز تبدیل شد و ${formatCurrency(json.creditToman, locale)} به کیف پول اضافه شد.`
        : `Redeemed for ${formatCurrency(json.creditToman, locale)} wallet credit!`
    );
    await refreshUser();
    await fetchDashboard();
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/user/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: ticketSubject, message: ticketBody }),
    });
    if (res.ok) {
      setTicketSubject("");
      setTicketBody("");
      await fetchDashboard();
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    const message = replyText[ticketId]?.trim();
    if (!message) return;
    const res = await fetch("/api/user/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, message }),
    });
    if (res.ok) {
      setReplyText({ ...replyText, [ticketId]: "" });
      await fetchDashboard();
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profileName, email: profileEmail }),
    });
    if (res.ok) {
      setFeedback(locale === "fa" ? "پروفایل ذخیره شد." : "Profile saved.");
      await refreshUser();
      await fetchDashboard();
    }
  };

  if (!authUser) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-border bg-surface p-8">
          <h1 className="text-xl font-bold text-text">{t.cart.loginRequired}</h1>
          <Link
            href="/auth"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white"
          >
            {t.nav.login}
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-muted">
        {t.common.loading}
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: "overview", label: t.userPanel.overview, icon: LayoutDashboard },
    { key: "orders", label: t.userPanel.orders, icon: Package },
    { key: "wallet", label: t.userPanel.wallet, icon: Wallet },
    { key: "club", label: t.userPanel.club, icon: Award },
    { key: "tickets", label: t.userPanel.tickets, icon: LifeBuoy },
    { key: "profile", label: t.userPanel.profile, icon: UserCog },
  ];

  const tierProgress = data.nextTier
    ? Math.min(100, Math.round((data.user.loyaltyPoints / data.nextTier.minPoints) * 100))
    : 100;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="border-b border-border pb-4 mb-3">
              <p className="font-bold text-text">{data.user.name || data.user.phone}</p>
              <p className="font-mono text-xs text-muted mt-0.5">{data.user.phone}</p>
              {data.currentTier && (
                <span
                  className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: data.currentTier.colorHex }}
                >
                  {locale === "fa" ? data.currentTier.nameFa : data.currentTier.nameEn}
                </span>
              )}
            </div>

            <nav className="space-y-1">
              {tabs.map((item) => {
                const Icon = item.icon;
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "text-muted hover:bg-surface-2 hover:text-text"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 space-y-6">
          {feedback && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {feedback}
            </div>
          )}

          {tab === "overview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-xs text-muted">{t.cart.walletBalance}</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-500">
                    {formatCurrency(data.user.walletBalance, locale)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-xs text-muted">{t.userPanel.loyaltyPoints}</p>
                  <p className="mt-2 text-2xl font-extrabold text-amber-500">
                    {formatNumber(data.user.loyaltyPoints, locale)} {t.store.points}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-xs text-muted">{t.userPanel.activeOrders}</p>
                  <p className="mt-2 text-2xl font-extrabold text-text">
                    {formatNumber(data.orders.length, locale)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2 font-bold text-text mb-4">
                  <Bell className="h-4 w-4 text-brand" aria-hidden="true" />
                  <h2>{locale === "fa" ? "اعلانات اخیر" : "Recent Notifications"}</h2>
                </div>
                {data.notifications.length === 0 ? (
                  <p className="text-sm text-muted">
                    {locale === "fa" ? "اعلانی وجود ندارد." : "No notifications yet."}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {data.notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className="rounded-xl border border-border bg-surface-2/50 p-3 text-sm"
                      >
                        <div className="flex justify-between gap-2">
                          <p className="font-semibold text-text">
                            {locale === "fa" ? n.titleFa : n.titleEn}
                          </p>
                          <span className="text-xs text-muted">
                            {formatDate(n.createdAt, locale)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {locale === "fa" ? n.bodyFa : n.bodyEn}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "orders" && (
            <div className="space-y-4">
              <h1 className="text-xl font-extrabold text-text">{t.userPanel.orders}</h1>
              {data.orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-border bg-surface p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <span className="font-mono text-sm font-bold text-brand">
                        {order.orderNumber}
                      </span>
                      <span className="mx-2 text-xs text-muted">•</span>
                      <span className="text-xs text-muted">
                        {formatDateTime(order.createdAt, locale)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-indigo-500/12 px-3 py-1 text-xs font-bold text-brand">
                        {order.status}
                      </span>
                      <span className="text-sm font-extrabold text-text">
                        {formatCurrency(order.totalToman, locale)}
                      </span>
                    </div>
                  </div>

                  {order.items.map((item) => {
                    const isRevealed = revealedSecrets[item.id];
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-surface-2/50 p-4 space-y-2"
                      >
                        <div className="flex flex-wrap justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-text">
                              {locale === "fa" ? item.productTitleFa : item.productTitleEn}
                            </p>
                            <p className="text-xs text-muted">
                              {locale === "fa" ? item.planTitleFa : item.planTitleEn}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-emerald-500">
                            {item.fulfillmentStatus}
                          </span>
                        </div>

                        {item.expiresAt && (
                          <p className="text-xs text-amber-500">
                            {locale === "fa" ? "انقضا:" : "Expires:"}{" "}
                            {formatDate(item.expiresAt, locale)}
                          </p>
                        )}

                        {item.deliveredSecret && (
                          <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {t.userPanel.credentialsBox}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedSecrets({
                                      ...revealedSecrets,
                                      [item.id]: !isRevealed,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-text"
                                >
                                  {isRevealed ? (
                                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                  {isRevealed ? t.userPanel.hideSecret : t.userPanel.showSecret}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyText(item.id, item.deliveredSecret!)}
                                  className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-text"
                                >
                                  {copiedId === item.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                  {copiedId === item.id ? t.userPanel.copied : t.userPanel.copyCode}
                                </button>
                              </div>
                            </div>
                            <pre className="whitespace-pre-wrap break-all font-mono text-xs text-text">
                              {isRevealed ? item.deliveredSecret : "••••••••••••••••••••••••••••"}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {tab === "wallet" && (
            <div className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface p-6">
                  <p className="text-xs text-muted">{t.cart.walletBalance}</p>
                  <p className="mt-2 text-3xl font-extrabold text-emerald-500">
                    {formatCurrency(data.user.walletBalance, locale)}
                  </p>
                </div>

                <form
                  onSubmit={handleDeposit}
                  className="rounded-2xl border border-border bg-surface p-6 space-y-3"
                >
                  <h2 className="font-bold text-text">{t.userPanel.chargeWallet}</h2>
                  <input
                    type="number"
                    min={50000}
                    step={50000}
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 font-mono text-sm"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
                  >
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    <span>{t.userPanel.chargeWallet}</span>
                  </button>
                </form>
              </div>

              <div
                tabIndex={0}
                role="region"
                aria-labelledby="wallet-tx-caption"
                className="table-wrapper"
              >
                <table className="responsive-table">
                  <caption id="wallet-tx-caption" className="p-4 text-start font-bold text-text">
                    {t.userPanel.wallet}
                  </caption>
                  <thead>
                    <tr>
                      <th>{t.common.date}</th>
                      <th>{locale === "fa" ? "شرح تراکنش" : "Description"}</th>
                      <th>{locale === "fa" ? "مبلغ" : "Amount"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td data-label={t.common.date}>
                          {formatDateTime(tx.createdAt, locale)}
                        </td>
                        <td data-label={locale === "fa" ? "شرح" : "Description"}>
                          {locale === "fa" ? tx.descriptionFa : tx.descriptionEn}
                        </td>
                        <td
                          data-label={locale === "fa" ? "مبلغ" : "Amount"}
                          className={`font-bold ${
                            tx.amount >= 0 ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          {tx.amount >= 0 ? "+" : ""}
                          {formatCurrency(tx.amount, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "club" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-gradient-to-br from-amber-500/10 via-surface to-indigo-500/10 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted">{t.userPanel.currentTier}</p>
                    <h2 className="mt-1 text-2xl font-extrabold text-text">
                      {data.currentTier
                        ? locale === "fa"
                          ? data.currentTier.nameFa
                          : data.currentTier.nameEn
                        : "-"}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {locale === "fa"
                        ? `تخفیف خودکار: ${data.currentTier?.discountPercent ?? 0}٪ | کش‌بک کیف پول: ${data.currentTier?.cashbackPercent ?? 0}٪`
                        : `Auto Discount: ${data.currentTier?.discountPercent ?? 0}% | Wallet Cashback: ${data.currentTier?.cashbackPercent ?? 0}%`}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-muted">{t.userPanel.loyaltyPoints}</p>
                    <p className="text-3xl font-extrabold text-amber-500">
                      {formatNumber(data.user.loyaltyPoints, locale)}
                    </p>
                  </div>
                </div>

                {data.nextTier && (
                  <div className="mt-5">
                    <div className="flex justify-between text-xs text-muted mb-1.5">
                      <span>
                        {locale === "fa" ? "مسیر ارتقا به" : "Progress to"}{" "}
                        {locale === "fa" ? data.nextTier.nameFa : data.nextTier.nameEn}
                      </span>
                      <span>
                        {formatNumber(data.user.loyaltyPoints, locale)} /{" "}
                        {formatNumber(data.nextTier.minPoints, locale)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${tierProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Redeem */}
                <form
                  onSubmit={handleRedeem}
                  className="rounded-2xl border border-border bg-surface p-6 space-y-3"
                >
                  <h3 className="font-bold text-text">{t.userPanel.redeemPoints}</h3>
                  <p className="text-xs text-muted">{t.userPanel.redeemRate}</p>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2 font-mono text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400"
                  >
                    {t.userPanel.redeemPoints}
                  </button>
                </form>

                {/* Referral */}
                <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
                  <h3 className="font-bold text-text">{t.userPanel.referralCode}</h3>
                  <p className="text-xs text-muted">
                    {locale === "fa"
                      ? `تعداد دوستان دعوت‌شده: ${formatNumber(data.referralsCount, locale)} نفر`
                      : `Invited friends: ${data.referralsCount}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-2.5 font-mono text-sm font-bold text-brand">
                      {data.user.referralCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText("ref", data.user.referralCode)}
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white"
                    >
                      {copiedId === "ref" ? t.userPanel.copied : t.userPanel.copyCode}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {data.tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="rounded-2xl border border-border bg-surface p-4"
                  >
                    <span
                      className="inline-block h-2.5 w-8 rounded-full"
                      style={{ backgroundColor: tier.colorHex }}
                    />
                    <h4 className="mt-2 font-bold text-text">
                      {locale === "fa" ? tier.nameFa : tier.nameEn}
                    </h4>
                    <p className="text-xs text-muted mt-1">
                      {formatNumber(tier.minPoints, locale)}+ {t.store.points}
                    </p>
                    <p className="mt-2 text-xs text-emerald-500 font-semibold">
                      {tier.discountPercent}% {locale === "fa" ? "تخفیف" : "Off"} •{" "}
                      {tier.cashbackPercent}% {locale === "fa" ? "کش‌بک" : "Cashback"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "tickets" && (
            <div className="space-y-6">
              <form
                onSubmit={handleCreateTicket}
                className="rounded-2xl border border-border bg-surface p-6 space-y-3"
              >
                <h2 className="font-bold text-text">{t.userPanel.newTicket}</h2>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder={locale === "fa" ? "موضوع تیکت..." : "Ticket subject..."}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
                />
                <textarea
                  rows={3}
                  required
                  value={ticketBody}
                  onChange={(e) => setTicketBody(e.target.value)}
                  placeholder={locale === "fa" ? "توضیحات خود را بنویسید..." : "Describe your request..."}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
                >
                  {t.userPanel.newTicket}
                </button>
              </form>

              <div className="space-y-4">
                {data.tickets.map((tk) => (
                  <div
                    key={tk.id}
                    className="rounded-2xl border border-border bg-surface p-5 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-text">
                        <span className="font-mono text-xs text-brand me-2">
                          {tk.ticketNumber}
                        </span>
                        {tk.subject}
                      </h3>
                      <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold">
                        {tk.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {tk.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-xl p-3 text-sm ${
                            m.isAdmin
                              ? "bg-indigo-500/10 border border-indigo-500/20"
                              : "bg-surface-2"
                          }`}
                        >
                          <p className="text-[11px] font-bold text-muted mb-1">
                            {m.isAdmin
                              ? locale === "fa"
                                ? "پشتیبانی دیجی‌ساب"
                                : "DigiSub Support"
                              : locale === "fa"
                                ? "شما"
                                : "You"}
                          </p>
                          <p className="text-text">{m.body}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText[tk.id] ?? ""}
                        onChange={(e) =>
                          setReplyText({ ...replyText, [tk.id]: e.target.value })
                        }
                        placeholder={locale === "fa" ? "پاسخ خود را بنویسید..." : "Write a reply..."}
                        className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleReplyTicket(tk.id)}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
                      >
                        {locale === "fa" ? "ارسال" : "Send"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "profile" && (
            <form
              onSubmit={handleSaveProfile}
              className="max-w-lg rounded-2xl border border-border bg-surface p-6 space-y-4"
            >
              <h2 className="font-bold text-text">{t.userPanel.profile}</h2>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {locale === "fa" ? "نام و نام خانوادگی" : "Full Name"}
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {locale === "fa" ? "ایمیل" : "Email"}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
              >
                {t.common.save}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserPanelPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-muted">Loading...</div>}>
      <UserPanelContent />
    </Suspense>
  );
}
