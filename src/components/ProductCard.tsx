"use client";

import React from "react";
import Link from "next/link";
import { Zap, Cpu, Clock, Award, ArrowLeft, ArrowRight } from "lucide-react";
import { useApp } from "./AppProvider";
import { formatCurrency, formatNumber } from "@/lib/i18n";

export interface ProductCardData {
  id: string;
  slug: string;
  titleFa: string;
  titleEn: string;
  shortDescFa: string;
  shortDescEn: string;
  deliveryType: string;
  badgeFa: string | null;
  badgeEn: string | null;
  accentColor: string;
  salesCount: number;
  category: {
    slug: string;
    nameFa: string;
    nameEn: string;
  };
  plans: Array<{
    id: string;
    titleFa: string;
    titleEn: string;
    effectivePriceToman: number;
    pointsReward: number;
    useUsdRate: boolean;
  }>;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const { locale, t } = useApp();
  const minPrice =
    product.plans.length > 0
      ? Math.min(...product.plans.map((p) => p.effectivePriceToman))
      : 0;
  const maxPoints =
    product.plans.length > 0
      ? Math.max(...product.plans.map((p) => p.pointsReward))
      : 0;

  const title = locale === "fa" ? product.titleFa : product.titleEn;
  const desc = locale === "fa" ? product.shortDescFa : product.shortDescEn;
  const catName = locale === "fa" ? product.category.nameFa : product.category.nameEn;

  const DeliveryIcon =
    product.deliveryType === "VAULT"
      ? Zap
      : product.deliveryType === "UPSTREAM_API"
        ? Cpu
        : Clock;

  const deliveryLabel =
    product.deliveryType === "VAULT"
      ? t.store.instantBadge
      : product.deliveryType === "UPSTREAM_API"
        ? t.store.apiBadge
        : t.store.manualBadge;

  const ArrowIcon = locale === "fa" ? ArrowLeft : ArrowRight;

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-xl hover:shadow-indigo-500/5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
            {catName}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `${product.accentColor}18`,
              color: product.accentColor,
            }}
          >
            <DeliveryIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {deliveryLabel}
          </span>
        </div>

        <h3 className="mt-4 text-lg font-bold text-text group-hover:text-brand transition-colors">
          <Link href={`/product/${product.slug}`}>{title}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {desc}
        </p>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-muted">{t.store.fromPrice}</p>
            <p className="text-base font-extrabold text-text">
              {formatCurrency(minPrice, locale)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            +{formatNumber(maxPoints, locale)} {t.store.points}
          </span>
        </div>

        <Link
          href={`/product/${product.slug}`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          <span>{t.store.selectPlan}</span>
          <ArrowIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
