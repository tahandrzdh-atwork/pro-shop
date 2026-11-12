"use client";

import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useApp } from "./AppProvider";
import { ProductCard, ProductCardData } from "./ProductCard";

interface CategoryItem {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
}

export function StoreCatalogClient({
  initialProducts,
  categories,
  initialCategory = "ALL",
}: {
  initialProducts: ProductCardData[];
  categories: CategoryItem[];
  initialCategory?: string;
}) {
  const { locale, t } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [delivery, setDelivery] = useState("ALL");
  const [sort, setSort] = useState<"POPULAR" | "PRICE_ASC" | "PRICE_DESC">("POPULAR");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = initialProducts.filter((p) => {
      if (category !== "ALL" && p.category.slug !== category) return false;
      if (delivery !== "ALL" && p.deliveryType !== delivery) return false;
      if (q) {
        const hay = `${p.titleFa} ${p.titleEn} ${p.shortDescFa} ${p.shortDescEn}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const minPrice = (p: ProductCardData) =>
      p.plans.length > 0 ? Math.min(...p.plans.map((pl) => pl.effectivePriceToman)) : 0;

    return [...list].sort((a, b) => {
      if (sort === "PRICE_ASC") return minPrice(a) - minPrice(b);
      if (sort === "PRICE_DESC") return minPrice(b) - minPrice(a);
      return b.salesCount - a.salesCount;
    });
  }, [initialProducts, query, category, delivery, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text sm:text-3xl">
            {t.store.allProducts}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {locale === "fa"
              ? "انتخاب از بین اشتراک‌های فوری انبار دیجیتال و سرویس‌های متصل به API"
              : "Choose from instant digital vault accounts and upstream API-fulfilled subscriptions"}
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 h-4 w-4 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.store.searchPlaceholder}
            aria-label={t.store.searchPlaceholder}
            className="w-full rounded-xl border border-border bg-surface py-2.5 ps-10 pe-4 text-sm text-text placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span>{t.store.filterCategory}:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              category === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-surface-2 text-muted hover:text-text"
            }`}
          >
            {t.store.allCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.slug)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                category === cat.slug
                  ? "bg-indigo-600 text-white"
                  : "bg-surface-2 text-muted hover:text-text"
              }`}
            >
              {locale === "fa" ? cat.nameFa : cat.nameEn}
            </button>
          ))}
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <select
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            aria-label={t.store.filterDelivery}
            className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text"
          >
            <option value="ALL">{t.store.allDeliveries}</option>
            <option value="VAULT">{t.store.deliveryVault}</option>
            <option value="UPSTREAM_API">{t.store.deliveryUpstream}</option>
            <option value="MANUAL">{t.store.deliveryManual}</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label={t.store.sortBy}
            className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text"
          >
            <option value="POPULAR">{t.store.sortPopular}</option>
            <option value="PRICE_ASC">{t.store.sortPriceAsc}</option>
            <option value="PRICE_DESC">{t.store.sortPriceDesc}</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted">
          {t.store.noProducts}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
