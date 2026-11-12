"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, KeyRound } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/i18n";

interface AdminProductData {
  categories: Array<{ id: string; nameFa: string; nameEn: string }>;
  upstreams: Array<{ id: string; name: string }>;
  products: Array<{
    id: string;
    titleFa: string;
    titleEn: string;
    deliveryType: string;
    isActive: boolean;
    plans: Array<{
      id: string;
      titleFa: string;
      titleEn: string;
      priceToman: number;
      priceUsd: number | null;
      useUsdRate: boolean;
      upstreamServiceId: string | null;
      upstreamProvider: { id: string; name: string } | null;
      _count: { vaultItems: number };
    }>;
  }>;
}

export function AdminProductsTab() {
  const { locale, t } = useApp();
  const [data, setData] = useState<AdminProductData | null>(null);
  const [vaultPlanId, setVaultPlanId] = useState<string>("");
  const [vaultLines, setVaultLines] = useState("");
  const [msg, setMsg] = useState("");
  const vaultDialogRef = useRef<HTMLDialogElement>(null);

  const [newProd, setNewProd] = useState({
    titleFa: "",
    titleEn: "",
    categoryId: "",
    deliveryType: "VAULT",
    planTitleFa: "اشتراک ۱ ماهه",
    planTitleEn: "1 Month Plan",
    priceToman: "350000",
    priceUsd: "5",
    useUsdRate: true,
    upstreamProviderId: "",
    upstreamServiceId: "",
  });

  const load = async () => {
    const res = await fetch("/api/admin/products", { cache: "no-store" });
    const json: AdminProductData = await res.json();
    setData(json);
    if (json.categories[0] && !newProd.categoryId) {
      setNewProd((prev) => ({ ...prev, categoryId: json.categories[0].id }));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_PRODUCT",
        ...newProd,
        priceToman: Number(newProd.priceToman),
        priceUsd: Number(newProd.priceUsd),
      }),
    });
    if (res.ok) {
      setMsg(locale === "fa" ? "محصول جدید ایجاد شد." : "Product created!");
      setNewProd({ ...newProd, titleFa: "", titleEn: "" });
      await load();
    }
  };

  const handleVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_VAULT_BULK",
        planId: vaultPlanId,
        secretsText: vaultLines,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      vaultDialogRef.current?.close();
      setVaultLines("");
      setMsg(
        locale === "fa"
          ? `${json.added} اکانت/کد به انبار دیجیتال اضافه شد.`
          : `Added ${json.added} items to digital vault.`
      );
      await load();
    }
  };

  if (!data) return <p className="text-sm text-muted">Loading products...</p>;

  return (
    <div className="space-y-6">
      {msg && (
        <p className="rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-500">
          {msg}
        </p>
      )}

      {/* Quick Create Product */}
      <form
        onSubmit={handleCreateProduct}
        className="rounded-2xl border border-border bg-surface p-5 space-y-4"
      >
        <div className="flex items-center gap-2 font-bold text-text">
          <Plus className="h-4 w-4 text-brand" aria-hidden="true" />
          <h2>{locale === "fa" ? "افزودن محصول و پلن جدید" : "Add New Product & Plan"}</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            required
            placeholder={locale === "fa" ? "عنوان فارسی" : "Persian Title"}
            value={newProd.titleFa}
            onChange={(e) => setNewProd({ ...newProd, titleFa: e.target.value })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <input
            type="text"
            required
            placeholder={locale === "fa" ? "عنوان انگلیسی" : "English Title"}
            value={newProd.titleEn}
            onChange={(e) => setNewProd({ ...newProd, titleEn: e.target.value })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <select
            value={newProd.categoryId}
            onChange={(e) => setNewProd({ ...newProd, categoryId: e.target.value })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          >
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === "fa" ? c.nameFa : c.nameEn}
              </option>
            ))}
          </select>

          <select
            value={newProd.deliveryType}
            onChange={(e) => setNewProd({ ...newProd, deliveryType: e.target.value })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          >
            <option value="VAULT">{t.store.deliveryVault}</option>
            <option value="UPSTREAM_API">{t.store.deliveryUpstream}</option>
            <option value="MANUAL">{t.store.deliveryManual}</option>
          </select>

          <input
            type="number"
            placeholder={locale === "fa" ? "قیمت تومان" : "Price (Toman)"}
            value={newProd.priceToman}
            onChange={(e) => setNewProd({ ...newProd, priceToman: e.target.value })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-mono"
          />

          <input
            type="number"
            step="0.1"
            placeholder={locale === "fa" ? "قیمت دلاری (اختیاری)" : "USD Price"}
            value={newProd.priceUsd}
            onChange={(e) => setNewProd({ ...newProd, priceUsd: e.target.value })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-mono"
          />
        </div>

        {newProd.deliveryType === "UPSTREAM_API" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={newProd.upstreamProviderId}
              onChange={(e) =>
                setNewProd({ ...newProd, upstreamProviderId: e.target.value })
              }
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
            >
              <option value="">
                {locale === "fa" ? "انتخاب سرور مادر..." : "Select Upstream Provider..."}
              </option>
              {data.upstreams.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Upstream Service ID (e.g. tg_prem_3m)"
              value={newProd.upstreamServiceId}
              onChange={(e) =>
                setNewProd({ ...newProd, upstreamServiceId: e.target.value })
              }
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-mono"
            />
          </div>
        )}

        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white"
        >
          {t.common.create}
        </button>
      </form>

      {/* Product & Vault List */}
      <div className="space-y-4">
        {data.products.map((prod) => (
          <div
            key={prod.id}
            className="rounded-2xl border border-border bg-surface p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-text">
                  {locale === "fa" ? prod.titleFa : prod.titleEn}
                </h3>
                <span className="text-xs text-muted">{prod.deliveryType}</span>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {prod.plans.map((pl) => (
                <div
                  key={pl.id}
                  className="rounded-xl border border-border bg-surface-2/60 p-3 text-xs space-y-2"
                >
                  <div className="flex justify-between font-bold text-text">
                    <span>{locale === "fa" ? pl.titleFa : pl.titleEn}</span>
                    <span>{formatCurrency(pl.priceToman, locale)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>
                      {prod.deliveryType === "VAULT"
                        ? `${locale === "fa" ? "انبار:" : "Vault:"} ${formatNumber(pl._count.vaultItems, locale)}`
                        : pl.upstreamProvider
                          ? `${pl.upstreamProvider.name} (${pl.upstreamServiceId})`
                          : "Manual"}
                    </span>
                    {prod.deliveryType === "VAULT" && (
                      <button
                        type="button"
                        onClick={() => {
                          setVaultPlanId(pl.id);
                          vaultDialogRef.current?.showModal();
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 font-semibold text-white"
                      >
                        <KeyRound className="h-3 w-3" aria-hidden="true" />
                        {locale === "fa" ? "شارژ انبار" : "Add Vault"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <dialog
        ref={vaultDialogRef}
        aria-labelledby="vault-dialog-title"
        className="m-auto w-full max-w-md rounded-2xl p-6 shadow-2xl"
      >
        <h2 id="vault-dialog-title" className="text-lg font-extrabold text-text">
          {locale === "fa" ? "شارژ دسته‌ای انبار دیجیتال" : "Bulk Import Vault Credentials"}
        </h2>
        <p className="mt-1 text-xs text-muted">
          {locale === "fa"
            ? "هر اکانت یا کد لایسنس را در یک خط جداگانه وارد کنید:"
            : "Enter one credential or license key per line:"}
        </p>
        <form onSubmit={handleVaultSubmit} className="mt-4 space-y-4">
          <textarea
            rows={5}
            required
            autoFocus
            value={vaultLines}
            onChange={(e) => setVaultLines(e.target.value)}
            placeholder="Email: pro1@mail.com | Pass: Secret123&#10;Email: pro2@mail.com | Pass: Secret456"
            className="w-full rounded-xl border border-border bg-surface-2 p-3 font-mono text-xs text-text"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => vaultDialogRef.current?.close()}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
            >
              {t.common.save}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
