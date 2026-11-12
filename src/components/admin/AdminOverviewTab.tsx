"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, Users, ShoppingCart, AlertTriangle, Activity } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/i18n";

interface OverviewData {
  kpis: {
    totalUsers: number;
    totalOrders: number;
    completedOrders: number;
    openTickets: number;
    totalRevenueToman: number;
    expiringItemsCount: number;
    usdToTomanRate: number;
  };
  salesChart: Array<{ date: string; orders: number; revenueMillion: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalToman: number;
    createdAt: string;
    user: { name: string | null; phone: string };
  }>;
  topProducts: Array<{
    id: string;
    titleFa: string;
    titleEn: string;
    salesCount: number;
    deliveryType: string;
  }>;
  recentApiLogs: Array<{
    id: string;
    action: string;
    httpStatus: number;
    success: boolean;
    durationMs: number;
    createdAt: string;
    provider: { name: string };
  }>;
}

export function AdminOverviewTab() {
  const { locale } = useApp();
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <p className="text-sm text-muted py-8">Loading analytics...</p>;
  }

  const maxRev = Math.max(1, ...data.salesChart.map((d) => d.revenueMillion));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{locale === "fa" ? "درآمد کل تاییدشده" : "Total Revenue"}</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-emerald-500">
            {formatCurrency(data.kpis.totalRevenueToman, locale)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{locale === "fa" ? "کل سفارش‌ها" : "Total Orders"}</span>
            <ShoppingCart className="h-4 w-4 text-brand" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-text">
            {formatNumber(data.kpis.totalOrders, locale)}{" "}
            <span className="text-xs font-medium text-muted">
              ({formatNumber(data.kpis.completedOrders, locale)}{" "}
              {locale === "fa" ? "تکمیل" : "done"})
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{locale === "fa" ? "کاربران ثبت‌نامی" : "Registered Users"}</span>
            <Users className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-text">
            {formatNumber(data.kpis.totalUsers, locale)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{locale === "fa" ? "اشتراک‌های رو به انقضا (CRM)" : "Expiring Soon (7d)"}</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-500">
            {formatNumber(data.kpis.expiringItemsCount, locale)}
          </p>
        </div>
      </div>

      {/* Chart + Top Products */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-bold text-text mb-4">
            {locale === "fa" ? "روند فروش ۷ روز اخیر (میلیون تومان)" : "7-Day Revenue Trend (M Toman)"}
          </h2>
          <div className="flex h-48 items-end gap-3 pt-4">
            {data.salesChart.map((d) => {
              const pct = Math.max(8, Math.round((d.revenueMillion / maxRev) * 100));
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[11px] font-mono text-muted">
                    {d.revenueMillion}M
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg bg-indigo-500/80 transition-all hover:bg-indigo-500"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-muted">{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-bold text-text mb-4">
            {locale === "fa" ? "محصولات پرفروش" : "Top Performing Products"}
          </h2>
          <div className="space-y-3">
            {data.topProducts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-surface-2/60 px-3.5 py-2.5 text-sm"
              >
                <span className="font-semibold text-text">
                  {locale === "fa" ? p.titleFa : p.titleEn}
                </span>
                <span className="font-mono text-xs font-bold text-brand">
                  {formatNumber(p.salesCount, locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Upstream API Logs */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 font-bold text-text mb-4">
          <Activity className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <h2>{locale === "fa" ? "آخرین فعالیت سرورهای مادر API" : "Recent Upstream API Calls"}</h2>
        </div>
        <div className="space-y-2">
          {data.recentApiLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-2/40 px-3.5 py-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    log.success ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <span className="font-bold text-text">{log.provider.name}</span>
                <span className="font-mono text-muted">{log.action}</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-muted">
                <span>HTTP {log.httpStatus}</span>
                <span>{log.durationMs}ms</span>
                <span>{formatDateTime(log.createdAt, locale)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
