"use client";

import React, { useEffect, useState } from "react";
import { MessageSquareCode, CheckCircle2, Send } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatDateTime } from "@/lib/i18n";

interface SmsProviderItem {
  id: string;
  providerKey: string;
  title: string;
  apiKey: string;
  username: string;
  password: string;
  senderLine: string;
  otpPatternCode: string;
  orderPatternCode: string;
  expiryPatternCode: string;
  isActive: boolean;
}

interface SmsLogItem {
  id: string;
  providerKey: string;
  phone: string;
  message: string;
  templateType: string;
  status: string;
  createdAt: string;
}

export function AdminSmsTab() {
  const { locale, t } = useApp();
  const [providers, setProviders] = useState<SmsProviderItem[]>([]);
  const [logs, setLogs] = useState<SmsLogItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("SANDBOX");
  const [testPhone, setTestPhone] = useState("09121112233");
  const [msg, setMsg] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/sms", { cache: "no-store" });
    const data = await res.json();
    setProviders(data.providers ?? []);
    setLogs(data.logs ?? []);
    const active = (data.providers ?? []).find((p: SmsProviderItem) => p.isActive);
    if (active) setSelectedKey(active.providerKey);
  };

  useEffect(() => {
    load();
  }, []);

  const current = providers.find((p) => p.providerKey === selectedKey);

  const updateField = (field: keyof SmsProviderItem, value: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.providerKey === selectedKey ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = async (setActive: boolean) => {
    if (!current) return;
    await fetch("/api/admin/sms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...current, setActive }),
    });
    setMsg(
      setActive
        ? locale === "fa"
          ? `تنظیمات ذخیره شد و پنل ${current.title} فعال گردید.`
          : `Saved & activated ${current.title}!`
        : locale === "fa"
          ? "تنظیمات ذخیره شد."
          : "Settings saved."
    );
    await load();
  };

  const handleTestSms = async () => {
    const res = await fetch("/api/admin/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone }),
    });
    const data = await res.json();
    setMsg(
      data.ok
        ? locale === "fa"
          ? `پیامک تست از طریق ${data.result.providerKey} (${data.result.status}) ارسال شد.`
          : `Test SMS sent via ${data.result.providerKey} (${data.result.status}).`
        : "SMS test failed"
    );
    await load();
  };

  return (
    <div className="space-y-6">
      {msg && (
        <p className="rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-500">
          {msg}
        </p>
      )}

      {/* Provider Selector Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {providers.map((p) => (
          <button
            key={p.providerKey}
            type="button"
            onClick={() => setSelectedKey(p.providerKey)}
            className={`rounded-2xl border p-4 text-start transition ${
              selectedKey === p.providerKey
                ? "border-brand bg-indigo-500/10"
                : "border-border bg-surface hover:border-brand/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <MessageSquareCode className="h-4 w-4 text-brand" aria-hidden="true" />
              {p.isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  {locale === "fa" ? "فعال" : "Active"}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs font-bold text-text">{p.title}</p>
            <p className="font-mono text-[10px] text-muted mt-0.5">{p.providerKey}</p>
          </button>
        ))}
      </div>

      {/* Config Form */}
      {current && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-text">{current.title}</h2>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                dir="ltr"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-36 rounded-xl border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleTestSms}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-text hover:border-brand"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                {locale === "fa" ? "ارسال تست" : "Send Test"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs text-muted mb-1">API Key / Token</label>
              <input
                type="text"
                dir="ltr"
                value={current.apiKey}
                onChange={(e) => updateField("apiKey", e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                {locale === "fa" ? "نام کاربری (ملی‌پیامک)" : "Username (MelliPayamak)"}
              </label>
              <input
                type="text"
                dir="ltr"
                value={current.username}
                onChange={(e) => updateField("username", e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                {locale === "fa" ? "شماره خط ارسال" : "Sender Line Number"}
              </label>
              <input
                type="text"
                dir="ltr"
                value={current.senderLine}
                onChange={(e) => updateField("senderLine", e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                {locale === "fa" ? "کد پترن ورود (OTP)" : "OTP Pattern / Template ID"}
              </label>
              <input
                type="text"
                dir="ltr"
                value={current.otpPatternCode}
                onChange={(e) => updateField("otpPatternCode", e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                {locale === "fa" ? "کد پترن تکمیل سفارش" : "Order Complete Pattern ID"}
              </label>
              <input
                type="text"
                dir="ltr"
                value={current.orderPatternCode}
                onChange={(e) => updateField("orderPatternCode", e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                {locale === "fa" ? "کد پترن یادآور تمدید CRM" : "Expiry Reminder Pattern ID"}
              </label>
              <input
                type="text"
                dir="ltr"
                value={current.expiryPatternCode}
                onChange={(e) => updateField("expiryPatternCode", e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-text"
            >
              {t.common.save}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white"
            >
              {locale === "fa" ? "ذخیره و فعال‌سازی این پنل" : "Save & Activate Gateway"}
            </button>
          </div>
        </div>
      )}

      {/* SMS Logs */}
      <div tabIndex={0} role="region" aria-labelledby="sms-logs-caption" className="table-wrapper">
        <table className="responsive-table">
          <caption id="sms-logs-caption" className="p-4 text-start font-bold text-text">
            {locale === "fa" ? "گزارش پیامک‌های ارسالی" : "SMS Dispatch History"}
          </caption>
          <thead>
            <tr>
              <th>{locale === "fa" ? "درگاه" : "Provider"}</th>
              <th>{locale === "fa" ? "شماره" : "Phone"}</th>
              <th>{locale === "fa" ? "نوع" : "Template"}</th>
              <th>{locale === "fa" ? "متن" : "Message"}</th>
              <th>{t.common.status}</th>
              <th>{t.common.date}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td data-label="Provider" className="font-mono text-xs font-bold">
                  {l.providerKey}
                </td>
                <td data-label="Phone" className="font-mono text-xs">
                  {l.phone}
                </td>
                <td data-label="Type" className="text-xs">
                  {l.templateType}
                </td>
                <td data-label="Message" className="max-w-xs truncate text-xs text-muted">
                  {l.message}
                </td>
                <td data-label="Status">
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold">
                    {l.status}
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
