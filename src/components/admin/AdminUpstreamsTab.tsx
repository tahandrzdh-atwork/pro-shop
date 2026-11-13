"use client";

import React, { useEffect, useState } from "react";
import { Server, Wifi, Plus, CheckCircle2, XCircle } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatDateTime } from "@/lib/i18n";

interface UpstreamData {
  providers: Array<{
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    protocol: string;
    balanceText: string | null;
    isActive: boolean;
    isSandbox: boolean;
    _count: { plans: number; apiLogs: number };
  }>;
  logs: Array<{
    id: string;
    action: string;
    requestPayload: string;
    responseBody: string;
    httpStatus: number;
    success: boolean;
    durationMs: number;
    createdAt: string;
    provider: { name: string };
  }>;
}

export function AdminUpstreamsTab() {
  const { locale, t } = useApp();
  const [data, setData] = useState<UpstreamData | null>(null);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    baseUrl: "",
    apiKey: "",
    protocol: "SMM_PANEL",
    isSandbox: true,
  });

  const load = async () => {
    const res = await fetch("/api/admin/upstreams", { cache: "no-store" });
    setData(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/upstreams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMsg(locale === "fa" ? "سرور مادر جدید متصل شد." : "Upstream provider added!");
      setForm({ name: "", baseUrl: "", apiKey: "", protocol: "SMM_PANEL", isSandbox: true });
      await load();
    }
  };

  const handleTest = async (providerId: string) => {
    const res = await fetch("/api/admin/upstreams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TEST_CONNECTION", providerId }),
    });
    const json = await res.json();
    setMsg(
      json.ok
        ? locale === "fa"
          ? `اتصال موفق! موجودی: ${json.balance}`
          : `Connected! Balance: ${json.balance}`
        : `Connection failed: ${json.message}`
    );
    await load();
  };

  const toggleMode = async (providerId: string, field: "isSandbox" | "isActive", val: boolean) => {
    await fetch("/api/admin/upstreams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, [field]: val }),
    });
    await load();
  };

  if (!data) return <p className="text-sm text-muted">Loading upstream providers...</p>;

  return (
    <div className="space-y-6">
      {msg && (
        <p className="rounded-xl bg-indigo-500/10 px-4 py-2.5 text-xs font-semibold text-brand">
          {msg}
        </p>
      )}

      {/* Add Mother Server */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-border bg-surface p-5 space-y-4"
      >
        <div className="flex items-center gap-2 font-bold text-text">
          <Plus className="h-4 w-4 text-brand" aria-hidden="true" />
          <h2>{locale === "fa" ? "اتصال سرور مادر جدید (API)" : "Connect New Upstream Server"}</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            required
            placeholder={locale === "fa" ? "نام سرور (مثلاً SMM Panel)" : "Provider Name"}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <input
            type="url"
            required
            dir="ltr"
            placeholder="https://api.motherpanel.com/v2"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-mono"
          />
          <input
            type="text"
            required
            dir="ltr"
            placeholder="API Key / Bearer Token"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-mono"
          />
          <select
            value={form.protocol}
            onChange={(e) => setForm({ ...form, protocol: e.target.value })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          >
            <option value="SMM_PANEL">SMM Panel Standard (v2)</option>
            <option value="ROBYNHOOD_FRAGMENT">فرگمنت رسمی تلگرام (Robynhood Fragment TON)</option>
            <option value="OZVINOO_CALLINOO">کالینو / اوزوینو شماره مجازی (Callinoo / Ozvinoo)</option>
            <option value="ALTIVOX_AI">التووکس پارتنر هوش مصنوعی (Altivox AI Partner)</option>
            <option value="CUSTOM_REST">Custom Bearer JSON REST</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            <input
              type="checkbox"
              checked={form.isSandbox}
              onChange={(e) => setForm({ ...form, isSandbox: e.target.checked })}
            />
            <span>
              {locale === "fa"
                ? "اجرا در حالت Sandbox (شبیه‌ساز امن برای تست)"
                : "Run in Sandbox Mode (Safe simulation)"}
            </span>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white"
          >
            {t.common.create}
          </button>
        </div>
      </form>

      {/* Providers Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.providers.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-border bg-surface p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Server className="h-5 w-5 text-brand" aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-text">{p.name}</h3>
                  <p className="font-mono text-[11px] text-muted">{p.baseUrl}</p>
                </div>
              </div>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[11px] font-bold">
                {p.protocol}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
              <span className="font-mono text-emerald-500 font-bold">
                {p.balanceText || "Not synced"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMode(p.id, "isSandbox", !p.isSandbox)}
                  className={`rounded-lg px-2.5 py-1 font-semibold ${
                    p.isSandbox
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {p.isSandbox ? "Sandbox" : "Live HTTP"}
                </button>
                <button
                  type="button"
                  onClick={() => handleTest(p.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 font-bold text-white"
                >
                  <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.common.testConnection}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* API Logs Inspector */}
      <div tabIndex={0} role="region" aria-labelledby="upstream-logs-caption" className="table-wrapper">
        <table className="responsive-table">
          <caption id="upstream-logs-caption" className="p-4 text-start font-bold text-text">
            {locale === "fa" ? "لاگ زنده ارتباطات API سرور مادر" : "Upstream API Request/Response Logs"}
          </caption>
          <thead>
            <tr>
              <th>{locale === "fa" ? "سرور" : "Provider"}</th>
              <th>{locale === "fa" ? "عملیات" : "Action"}</th>
              <th>{locale === "fa" ? "درخواست" : "Request Payload"}</th>
              <th>{locale === "fa" ? "پاسخ" : "Response"}</th>
              <th>{t.common.status}</th>
              <th>{t.common.date}</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map((l) => (
              <tr key={l.id}>
                <td data-label="Provider" className="font-semibold">
                  {l.provider.name}
                </td>
                <td data-label="Action" className="font-mono text-xs">
                  {l.action}
                </td>
                <td data-label="Request">
                  <code className="block max-w-xs truncate font-mono text-[11px] text-muted">
                    {l.requestPayload}
                  </code>
                </td>
                <td data-label="Response">
                  <code className="block max-w-xs truncate font-mono text-[11px] text-muted">
                    {l.responseBody}
                  </code>
                </td>
                <td data-label="Status">
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-bold">
                    {l.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                    )}
                    {l.httpStatus} ({l.durationMs}ms)
                  </span>
                </td>
                <td data-label="Date" className="text-xs text-muted">
                  {formatDateTime(l.createdAt, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
