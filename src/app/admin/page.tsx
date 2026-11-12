"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ShoppingCart,
  Package,
  Server,
  Users,
  MessageSquareCode,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { AdminOrdersTab } from "@/components/admin/AdminOrdersTab";
import { AdminProductsTab } from "@/components/admin/AdminProductsTab";
import { AdminUpstreamsTab } from "@/components/admin/AdminUpstreamsTab";
import { AdminSmsTab } from "@/components/admin/AdminSmsTab";
import { AdminCrmTab } from "@/components/admin/AdminCrmTab";
import { AdminSettingsTab } from "@/components/admin/AdminSettingsTab";

type AdminTab =
  | "overview"
  | "orders"
  | "products"
  | "upstreams"
  | "crm"
  | "sms"
  | "settings";

export default function AdminDashboardPage() {
  const { locale, t, user } = useApp();
  const [tab, setTab] = useState<AdminTab>("overview");

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-border bg-surface p-8 space-y-4">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
          <h1 className="text-xl font-bold text-text">
            {locale === "fa" ? "دسترسی مخصوص مدیر سیستم است" : "Admin Access Required"}
          </h1>
          <p className="text-sm text-muted">
            {locale === "fa"
              ? "برای مشاهده داشبورد ادمین، از صفحه ورود گزینه «ورود به عنوان ادمین» را انتخاب کنید."
              : "Use 'Sign in as Admin' on the auth page to explore the Admin Dashboard."}
          </p>
          <Link
            href="/auth"
            className="inline-flex rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white"
          >
            {t.nav.login}
          </Link>
        </div>
      </div>
    );
  }

  const tabs: Array<{
    key: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "overview", label: t.adminPanel.overview, icon: BarChart3 },
    { key: "orders", label: t.adminPanel.orders, icon: ShoppingCart },
    { key: "products", label: t.adminPanel.products, icon: Package },
    { key: "upstreams", label: t.adminPanel.upstreams, icon: Server },
    { key: "crm", label: t.adminPanel.crm, icon: Users },
    { key: "sms", label: t.adminPanel.sms, icon: MessageSquareCode },
    { key: "settings", label: t.adminPanel.settings, icon: Settings },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="border-b border-border pb-3 mb-3">
              <p className="text-xs font-bold text-amber-500">ADMIN CONSOLE</p>
              <p className="font-extrabold text-text mt-0.5">{user.name}</p>
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

        <div className="flex-1 min-w-0">
          {tab === "overview" && <AdminOverviewTab />}
          {tab === "orders" && <AdminOrdersTab />}
          {tab === "products" && <AdminProductsTab />}
          {tab === "upstreams" && <AdminUpstreamsTab />}
          {tab === "crm" && <AdminCrmTab />}
          {tab === "sms" && <AdminSmsTab />}
          {tab === "settings" && <AdminSettingsTab />}
        </div>
      </div>
    </div>
  );
}
