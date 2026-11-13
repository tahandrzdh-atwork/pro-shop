import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { BookOpen, Clock, Eye, Search, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "وبلاگ و مقالات تخصصی | راهنمای تلگرام پرمیوم، استارز و هوش مصنوعی",
  description:
    "مجموعه مقالات آموزشی و تخصصی درباره نحوه خرید و فعال‌سازی تلگرام پرمیوم، استارز، اکانت‌های هوش مصنوعی (ChatGPT Plus، Claude Pro) و شماره‌های مجازی با راهنمای جامع.",
  keywords: [
    "وبلاگ دیجی ساب",
    "راهنمای خرید تلگرام پرمیوم",
    "آموزش تلگرام استارز",
    "خرید اکانت هوش مصنوعی",
    "راهنمای شماره مجازی",
  ],
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const { category, search } = await searchParams;

  const where: any = { published: true };
  if (category) {
    where.category = category;
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
      { focusKeyword: { contains: search } },
    ];
  }

  const articles = await prisma.article.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const categories = [
    "همه",
    "آموزش و مقالات",
    "تلگرام و اشتراک",
    "هوش مصنوعی",
    "شماره مجازی",
    "راهنمای استریم",
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold text-brand">
          <BookOpen className="h-4 w-4" />
          وبلاگ و دانشنامه تخصصی دیجی‌ساب
        </div>

        <h1 className="text-3xl font-black text-text sm:text-4xl">
          راهنماها، مقالات و آموزش‌های تخصصی اشتراک‌های دیجیتال
        </h1>

        <p className="text-sm leading-relaxed text-muted sm:text-base">
          بررسی جامع، مقایسه قیمت‌ها، آموزش‌های گام‌به‌گام و ترفندهای کاربردی تلگرام پرمیوم،
          استارز، هوش مصنوعی و سرویس‌های بین‌المللی با بهینه‌سازی کامل سئو.
        </p>

        {/* Search Input */}
        <form action="/blog" method="GET" className="mt-6 flex max-w-lg mx-auto items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-muted" />
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="جستجو در مقالات (مثلاً: تلگرام پرمیوم، استارز...)"
              className="w-full rounded-2xl border border-border bg-surface py-2.5 pr-10 pl-4 text-xs font-semibold text-text shadow-sm focus:border-brand focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
          >
            جستجو
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {categories.map((c) => {
            const isSelected = (!category && c === "همه") || category === c;
            const href = c === "همه" ? "/blog" : `/blog?category=${encodeURIComponent(c)}`;
            return (
              <Link
                key={c}
                href={href}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border border-border bg-surface text-muted hover:border-brand/40 hover:text-text"
                }`}
              >
                {c}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="mt-12">
        {articles.length === 0 ? (
          <div className="rounded-3xl border border-border bg-surface p-12 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-muted mx-auto" />
            <h3 className="text-base font-bold text-text">مقاله‌ای در این دسته‌بندی یافت نشد.</h3>
            <p className="text-xs text-muted">لطفاً واژه جستجو را تغییر دهید یا همه دسته‌ها را مشاهده کنید.</p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline pt-2"
            >
              مشاهده تمام مقالات
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((art) => (
              <article
                key={art.id}
                className="group flex flex-col justify-between rounded-3xl border border-border bg-surface p-5 transition duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div className="space-y-4">
                  {/* Optional Cover image */}
                  {art.coverImage ? (
                    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-surface-2">
                      <img
                        src={art.coverImage}
                        alt={art.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 via-surface-2 to-indigo-500/20 text-brand">
                      <Sparkles className="h-8 w-8 opacity-60" />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                    <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 font-bold text-brand">
                      {art.category}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3 text-muted" />
                        {art.readingTimeMin} دقیقه
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Eye className="h-3 w-3 text-muted" />
                        {art.views}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-base font-extrabold text-text leading-snug group-hover:text-brand transition">
                    <Link href={`/blog/${art.slug}`}>{art.title}</Link>
                  </h2>

                  <p className="text-xs leading-relaxed text-muted line-clamp-3">
                    {art.excerpt || art.seoDescription || art.content.slice(0, 140)}...
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border/80 pt-3 text-xs">
                  <span className="text-muted text-[11px]">{formatDate(art.createdAt, "fa")}</span>
                  <Link
                    href={`/blog/${art.slug}`}
                    className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
                  >
                    مطالعه کامل
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
