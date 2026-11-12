"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Cpu,
  Clock,
  Award,
  CheckCircle2,
  ShoppingBag,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useApp } from "./AppProvider";
import { formatCurrency, formatNumber } from "@/lib/i18n";

interface InputFieldDef {
  key: string;
  labelFa: string;
  labelEn: string;
  placeholderFa: string;
  placeholderEn: string;
  required?: boolean;
}

interface ProductDetailProps {
  product: {
    id: string;
    slug: string;
    titleFa: string;
    titleEn: string;
    shortDescFa: string;
    shortDescEn: string;
    descriptionFa: string;
    descriptionEn: string;
    guideFa: string;
    guideEn: string;
    deliveryType: string;
    accentColor: string;
    inputFieldsJson: string;
    category: { nameFa: string; nameEn: string; slug: string };
    plans: Array<{
      id: string;
      titleFa: string;
      titleEn: string;
      durationDays: number | null;
      effectivePriceToman: number;
      priceUsd: number | null;
      useUsdRate: boolean;
      pointsReward: number;
      vaultStock: number;
    }>;
  };
}

export function ProductDetailClient({ product }: ProductDetailProps) {
  const router = useRouter();
  const { locale, t, addToCart } = useApp();

  const inputFields: InputFieldDef[] = useMemo(() => {
    try {
      return JSON.parse(product.inputFieldsJson);
    } catch {
      return [];
    }
  }, [product.inputFieldsJson]);

  const [selectedPlanId, setSelectedPlanId] = useState(
    product.plans[0]?.id ?? ""
  );
  const [quantity, setQuantity] = useState(1);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [addedBanner, setAddedBanner] = useState(false);
  const [error, setError] = useState("");

  const selectedPlan =
    product.plans.find((p) => p.id === selectedPlanId) ?? product.plans[0];

  const title = locale === "fa" ? product.titleFa : product.titleEn;
  const description =
    locale === "fa" ? product.descriptionFa : product.descriptionEn;
  const guide = locale === "fa" ? product.guideFa : product.guideEn;
  const catName =
    locale === "fa" ? product.category.nameFa : product.category.nameEn;

  const DeliveryIcon =
    product.deliveryType === "VAULT"
      ? Zap
      : product.deliveryType === "UPSTREAM_API"
        ? Cpu
        : Clock;

  const deliveryLabel =
    product.deliveryType === "VAULT"
      ? t.store.deliveryVault
      : product.deliveryType === "UPSTREAM_API"
        ? t.store.deliveryUpstream
        : t.store.deliveryManual;

  const handleSubmit = (e: React.FormEvent, goToCart: boolean) => {
    e.preventDefault();
    setError("");
    if (!selectedPlan) return;

    for (const field of inputFields) {
      if (field.required && !inputs[field.key]?.trim()) {
        setError(
          locale === "fa"
            ? `لطفاً فیلد «${field.labelFa}» را وارد کنید.`
            : `Please fill in "${field.labelEn}".`
        );
        return;
      }
    }

    addToCart({
      planId: selectedPlan.id,
      productId: product.id,
      productSlug: product.slug,
      productTitleFa: product.titleFa,
      productTitleEn: product.titleEn,
      planTitleFa: selectedPlan.titleFa,
      planTitleEn: selectedPlan.titleEn,
      unitPriceToman: selectedPlan.effectivePriceToman,
      pointsReward: selectedPlan.pointsReward,
      deliveryType: product.deliveryType,
      quantity,
      customerInputs: inputs,
    });

    if (goToCart) {
      router.push("/cart");
    } else {
      setAddedBanner(true);
      setTimeout(() => setAddedBanner(false), 3000);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Info Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
                {catName}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: `${product.accentColor}18`,
                  color: product.accentColor,
                }}
              >
                <DeliveryIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {deliveryLabel}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold text-text sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              {description}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-3.5 text-xs">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>
                  {locale === "fa"
                    ? "ضمانت کامل اشتراک در تمام دوره خریداری‌شده"
                    : "Full subscription warranty throughout the active period"}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-3.5 text-xs">
                <Award className="h-5 w-5 text-amber-500 shrink-0" aria-hidden="true" />
                <span>
                  {t.store.loyaltyReward}{" "}
                  <strong className="text-text">
                    +{formatNumber((selectedPlan?.pointsReward ?? 0) * quantity, locale)}{" "}
                    {t.store.points}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 font-bold text-text">
              <Info className="h-5 w-5 text-brand" aria-hidden="true" />
              <h2>{t.store.activationGuide}</h2>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-loose text-muted">
              {guide}
            </p>
          </div>
        </div>

        {/* Purchase Configurator */}
        <div className="lg:col-span-5">
          <form
            onSubmit={(e) => handleSubmit(e, true)}
            className="sticky top-24 rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-indigo-500/5"
          >
            <h2 className="text-lg font-extrabold text-text">
              {t.store.selectPlan}
            </h2>

            <div className="mt-4 space-y-2.5">
              {product.plans.map((plan) => {
                const isSelected = plan.id === selectedPlan?.id;
                return (
                  <label
                    key={plan.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                      isSelected
                        ? "border-brand bg-indigo-500/8"
                        : "border-border bg-surface-2/40 hover:border-brand/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="planId"
                        value={plan.id}
                        checked={isSelected}
                        onChange={() => setSelectedPlanId(plan.id)}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="text-sm font-bold text-text">
                          {locale === "fa" ? plan.titleFa : plan.titleEn}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                          {plan.useUsdRate && plan.priceUsd && (
                            <span>(${plan.priceUsd})</span>
                          )}
                          {product.deliveryType === "VAULT" && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {locale === "fa"
                                ? `موجودی انبار: ${formatNumber(plan.vaultStock, locale)}`
                                : `Vault Stock: ${plan.vaultStock}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-end">
                      <p className="text-sm font-extrabold text-text">
                        {formatCurrency(plan.effectivePriceToman, locale)}
                      </p>
                      <p className="text-[11px] text-amber-500">
                        +{formatNumber(plan.pointsReward, locale)} {t.store.points}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {inputFields.length > 0 && (
              <div className="mt-5 space-y-3 border-t border-border pt-4">
                {inputFields.map((field) => (
                  <div key={field.key}>
                    <label
                      htmlFor={`field-${field.key}`}
                      className="block text-xs font-semibold text-text mb-1.5"
                    >
                      {locale === "fa" ? field.labelFa : field.labelEn}
                      {field.required && <span className="text-red-500 ms-1">*</span>}
                    </label>
                    <input
                      id={`field-${field.key}`}
                      type="text"
                      dir="ltr"
                      required={field.required}
                      value={inputs[field.key] ?? ""}
                      onChange={(e) =>
                        setInputs({ ...inputs, [field.key]: e.target.value })
                      }
                      placeholder={
                        locale === "fa" ? field.placeholderFa : field.placeholderEn
                      }
                      className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus:border-brand focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-semibold text-text">
                {locale === "fa" ? "تعداد" : "Quantity"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-8 w-8 rounded-lg border border-border bg-surface-2 font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-bold">
                  {formatNumber(quantity, locale)}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  className="h-8 w-8 rounded-lg border border-border bg-surface-2 font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500">
                {error}
              </p>
            )}

            {addedBanner && (
              <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t.store.addedToCart}
              </p>
            )}

            <div className="mt-5 space-y-2.5">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
                <span>
                  {locale === "fa" ? "خرید و تحویل فوری" : "Instant Checkout"} —{" "}
                  {formatCurrency(
                    (selectedPlan?.effectivePriceToman ?? 0) * quantity,
                    locale
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-text transition hover:border-brand"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                <span>{t.store.addToCart}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
