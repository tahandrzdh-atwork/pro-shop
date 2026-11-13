"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Table as TableIcon,
  Link as LinkIcon,
  Heading,
  Eye,
  Smartphone,
  Monitor,
  Layers,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatDate } from "@/lib/i18n";
import { analyzeSeo, SeoAnalysisResult } from "@/lib/seo-analyzer";

interface ArticleItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  author: string;
  category: string;
  readingTimeMin: number;
  published: boolean;
  views: number;
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword: string | null;
  secondaryKeywords: string | null;
  canonicalUrl: string | null;
  schemaType: string;
  faqItemsJson: string | null;
  seoScore: number;
  createdAt: string;
}

export function AdminArticlesTab() {
  const { locale } = useApp();
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("آموزش و مقالات");
  const [author, setAuthor] = useState("تیم تحریریه دیجی‌ساب");
  const [coverImage, setCoverImage] = useState("");
  const [published, setPublished] = useState(true);
  const [content, setContent] = useState("");

  // SEO & Snippet State
  const [focusKeyword, setFocusKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [faqList, setFaqList] = useState<Array<{ question: string; answer: string }>>([
    { question: "", answer: "" },
  ]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/articles", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setArticles(json.articles || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  // Compute live SEO analysis whenever fields change
  const liveSeo: SeoAnalysisResult = useMemo(() => {
    return analyzeSeo({
      title,
      seoTitle: seoTitle || title,
      seoDescription,
      slug,
      content,
      focusKeyword,
      secondaryKeywords,
      faqItems: faqList.filter((f) => f.question.trim() && f.answer.trim()),
    });
  }, [title, seoTitle, seoDescription, slug, content, focusKeyword, secondaryKeywords, faqList]);

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setCategory("آموزش و مقالات");
    setAuthor("تیم تحریریه دیجی‌ساب");
    setCoverImage("");
    setPublished(true);
    setContent("");
    setFocusKeyword("");
    setSecondaryKeywords("");
    setSeoTitle("");
    setSeoDescription("");
    setCanonicalUrl("");
    setFaqList([{ question: "", answer: "" }]);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleStartEdit = (art: ArticleItem) => {
    setEditingId(art.id);
    setTitle(art.title);
    setSlug(art.slug);
    setCategory(art.category);
    setAuthor(art.author);
    setCoverImage(art.coverImage ?? "");
    setPublished(art.published);
    setContent(art.content);
    setFocusKeyword(art.focusKeyword ?? "");
    setSecondaryKeywords(art.secondaryKeywords ?? "");
    setSeoTitle(art.seoTitle ?? "");
    setSeoDescription(art.seoDescription ?? "");
    setCanonicalUrl(art.canonicalUrl ?? "");

    let parsedFaq: Array<{ question: string; answer: string }> = [];
    try {
      if (art.faqItemsJson) parsedFaq = JSON.parse(art.faqItemsJson);
    } catch {}
    setFaqList(parsedFaq.length > 0 ? parsedFaq : [{ question: "", answer: "" }]);

    setIsEditing(true);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    const cleanFaq = faqList.filter((f) => f.question.trim() && f.answer.trim());
    const payload = {
      id: editingId,
      title,
      slug,
      category,
      author,
      coverImage,
      published,
      content,
      focusKeyword,
      secondaryKeywords,
      seoTitle: seoTitle || title,
      seoDescription,
      canonicalUrl,
      faqItemsJson: cleanFaq.length > 0 ? JSON.stringify(cleanFaq) : null,
    };

    const method = editingId ? "PATCH" : "POST";
    const res = await fetch("/api/admin/articles", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (res.ok) {
      setMsg(
        locale === "fa"
          ? `مقاله با نمره سئو ${json.seoResult?.score ?? liveSeo.score}/۱۰۰ ذخیره شد!`
          : `Article saved with SEO Score ${json.seoResult?.score ?? liveSeo.score}/100!`
      );
      resetForm();
      await loadArticles();
    } else {
      setMsg(json.error || "خطا در ذخیره مقاله");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === "fa" ? "آیا از حذف این مقاله اطمینان دارید؟" : "Delete this article?")) return;
    const res = await fetch(`/api/admin/articles?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg(locale === "fa" ? "مقاله حذف شد." : "Article deleted.");
      await loadArticles();
    }
  };

  // Helper insertions into content textarea
  const insertText = (template: string) => {
    setContent((prev) => prev + (prev.endsWith("\n") ? "" : "\n\n") + template + "\n");
  };

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black text-text">
            {locale === "fa" ? "مدیریت مقالات و سئو حرفه‌ای (Rank Math + GEO)" : "Articles & Advanced SEO Suite"}
          </h2>
          <p className="text-xs text-muted mt-1">
            {locale === "fa"
              ? "بارگزاری مقالات، ویرایش اسنیپت گوگل، ساخت جداول مقایسه‌ای و تحلیل زنده نمره سئو (0-100)"
              : "Publish articles, optimize Google snippets, build comparison tables, and monitor real-time SEO score"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsEditing(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {locale === "fa" ? "نوشتن مقاله جدید" : "New Article"}
        </button>
      </div>

      {msg && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 text-xs font-semibold text-brand">
          {msg}
        </div>
      )}

      {/* Editor Form Modal / Section */}
      {isEditing && (
        <form onSubmit={handleSave} className="space-y-6 rounded-3xl border border-border bg-surface p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 font-bold text-text">
              <FileText className="h-5 w-5 text-brand" />
              <h3>{editingId ? (locale === "fa" ? "ویرایش مقاله و سئو" : "Edit Article") : (locale === "fa" ? "مقاله و اسنیپت جدید" : "Create Article")}</h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg bg-surface-2 px-3 py-1 text-xs font-semibold text-muted hover:text-text"
            >
              {locale === "fa" ? "انصراف" : "Cancel"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Title (H1) */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-text block">
                {locale === "fa" ? "عنوان اصلی مقاله (H1) *" : "Article Main Title (H1) *"}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!seoTitle) setSeoTitle(e.target.value);
                  if (!slug) {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
                        .replace(/(^-|-$)/g, "")
                    );
                  }
                }}
                placeholder={locale === "fa" ? "مثال: راهنمای جامع خرید تلگرام پرمیوم بدون لاگین و مقایسه قیمت" : "e.g. Complete Guide to Buying Telegram Premium"}
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm font-semibold text-text focus:border-brand focus:outline-none"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-text block">
                {locale === "fa" ? "نامک پیوند یکتا (Slug - انگلیسی) *" : "URL Slug *"}
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="buy-telegram-premium-guide"
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-mono text-text focus:border-brand focus:outline-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-text block">
                {locale === "fa" ? "دسته‌بندی مقاله" : "Category"}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-text focus:border-brand focus:outline-none"
              >
                <option value="آموزش و مقالات">آموزش و مقالات</option>
                <option value="تلگرام و اشتراک">تلگرام و اشتراک</option>
                <option value="هوش مصنوعی">هوش مصنوعی</option>
                <option value="شماره مجازی">شماره مجازی</option>
                <option value="راهنمای استریم">راهنمای استریم</option>
              </select>
            </div>

            {/* Cover Image */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-text block">
                {locale === "fa" ? "تصویر شاخص مقاله (URL کاور)" : "Cover Image URL"}
              </label>
              <input
                type="url"
                dir="ltr"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/... or /images/..."
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-mono text-text focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Helper Toolbar for Content */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-text block">
                {locale === "fa" ? "متن و محتوای اصلی مقاله (پشتیبانی از تیتر، جدول، لیست و لینک) *" : "Article Content (Markdown/HTML) *"}
              </label>

              {/* Toolbar Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => insertText("## عنوان بخش جدید (H2)\nدر این قسمت پاسخ مستقیم و شفاف به سوال کاربر ارائه می‌شود...")}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text hover:border-brand"
                >
                  <Heading className="h-3 w-3 text-brand" />
                  + H2
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertText(
                      `| ویژگی | اکانت معمولی | اشتراک پرمیوم |\n| :--- | :---: | :---: |\n| محدودیت حجم آپلود | ۲ گیگابایت | ۴ گیگابایت |\n| سرعت دانلود | محدود | حداکثر سرعت سرور |\n| تبدیل صوت به متن | ❌ ندارد | ✅ نامحدود |`
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text hover:border-brand"
                >
                  <TableIcon className="h-3 w-3 text-emerald-500" />
                  + جدول مقایسه
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertText(
                      `[خرید تلگرام پرمیوم با تحویل آنی](/product/telegram-premium) و همچنین [خرید استارز تلگرام](/product/telegram-stars)`
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text hover:border-brand"
                >
                  <LinkIcon className="h-3 w-3 text-blue-500" />
                  + لینک داخلی محصول
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertText(
                      `> 💡 **نکته مهم امنیتی:** برای خرید اشتراک‌های دیجیتال هرگز نام کاربری و رمز عبور اصلی خود را در اختیار افراد ناشناس قرار ندهید.`
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text hover:border-brand"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  + باکس نقل‌قول
                </button>
              </div>
            </div>

            <textarea
              required
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={locale === "fa" ? "محتوای مقاله خود را در اینجا بنویسید یا کپی کنید..." : "Write article content in Markdown or HTML..."}
              className="w-full rounded-2xl border border-border bg-surface-2 p-4 text-xs font-mono leading-relaxed text-text focus:border-brand focus:outline-none"
            />
            <div className="flex justify-between text-[11px] text-muted">
              <span>تعداد کلمات: {liveSeo.stats.wordCount} کلمه</span>
              <span>تعداد کاراکترها: {liveSeo.stats.charCount}</span>
            </div>
          </div>

          {/* ADVANCED SEO & SNIPPET SECTION (Rank Math Style) */}
          <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-surface to-indigo-500/10 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-brand" />
                <div>
                  <h4 className="font-extrabold text-text">
                    {locale === "fa" ? "تنظیمات سئو پیشرفته و اسنیپت گوگل (Rank Math & GEO)" : "Advanced SEO & Google Snippet"}
                  </h4>
                  <p className="text-[11px] text-muted">
                    {locale === "fa" ? "بهینه‌سازی دقیق عنوان و متای توضیحات، کلمات کلیدی، اسکیما و نمره سئو زنده" : "Tune title tags, meta descriptions, keywords and structured schema"}
                  </p>
                </div>
              </div>

              {/* Live SEO Score Gauge */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black text-sm text-white shadow-md ${
                    liveSeo.score >= 85
                      ? "bg-emerald-600"
                      : liveSeo.score >= 70
                      ? "bg-blue-600"
                      : liveSeo.score >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                >
                  {liveSeo.score}
                </div>
                <div className="text-start">
                  <span className="text-[11px] font-bold text-text block">نمره سئو</span>
                  <span
                    className={`text-[10px] font-extrabold ${
                      liveSeo.score >= 85
                        ? "text-emerald-500"
                        : liveSeo.score >= 70
                        ? "text-blue-500"
                        : liveSeo.score >= 50
                        ? "text-amber-500"
                        : "text-rose-500"
                    }`}
                  >
                    {liveSeo.rating}
                  </span>
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text block">
                  {locale === "fa" ? "کلمه کلیدی کانونی (Focus Keyword) *" : "Focus Keyword *"}
                </label>
                <input
                  type="text"
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  placeholder={locale === "fa" ? "مثال: خرید تلگرام پرمیوم" : "e.g. buy telegram premium"}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-text focus:border-brand focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text block">
                  {locale === "fa" ? "کلمات کلیدی فرعی و LSI (با کاما جدا کنید)" : "Secondary / LSI Keywords"}
                </label>
                <input
                  type="text"
                  value={secondaryKeywords}
                  onChange={(e) => setSecondaryKeywords(e.target.value)}
                  placeholder="قیمت تلگرام پرمیوم، فعال‌سازی تلگرام پرمیوم، خرید استارز تلگرام"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {/* Google Snippet Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-text">
                <span>{locale === "fa" ? "عنوان اسنیپت سئو (SEO Title Tag) *" : "SEO Title Tag *"}</span>
                <span
                  className={`font-mono text-[11px] ${
                    seoTitle.length >= 40 && seoTitle.length <= 60
                      ? "text-emerald-500"
                      : seoTitle.length > 60
                      ? "text-rose-500"
                      : "text-muted"
                  }`}
                >
                  {seoTitle.length} / ۶۰ کاراکتر
                </span>
              </div>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="خرید تلگرام پرمیوم با تحویل آنی و قیمت مناسب | دیجی‌ساب"
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs font-semibold text-text focus:border-brand focus:outline-none"
              />
              {/* Pixel meter */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full transition-all ${
                    seoTitle.length >= 40 && seoTitle.length <= 60
                      ? "bg-emerald-500"
                      : seoTitle.length > 60
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, (seoTitle.length / 60) * 100)}%` }}
                />
              </div>
            </div>

            {/* Google Snippet Meta Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-text">
                <span>{locale === "fa" ? "توضیحات متای اسنیپت (Meta Description) *" : "SEO Meta Description *"}</span>
                <span
                  className={`font-mono text-[11px] ${
                    seoDescription.length >= 130 && seoDescription.length <= 158
                      ? "text-emerald-500"
                      : seoDescription.length > 158
                      ? "text-rose-500"
                      : "text-muted"
                  }`}
                >
                  {seoDescription.length} / ۱۵۸ کاراکتر (ایده‌آل: ۱۳۰ تا ۱۵۸)
                </span>
              </div>
              <textarea
                rows={3}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="راهنمای کامل و جامع خرید تلگرام پرمیوم بدون نیاز به پسورد یا لاگین با فعال‌سازی آنی از فرگمنت رسمی و گارانتی کامل دوره. همین حالا مشاهده قیمت کنید."
                className="w-full rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-text focus:border-brand focus:outline-none"
              />
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full transition-all ${
                    seoDescription.length >= 130 && seoDescription.length <= 158
                      ? "bg-emerald-500"
                      : seoDescription.length > 158
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, (seoDescription.length / 158) * 100)}%` }}
                />
              </div>
            </div>

            {/* LIVE GOOGLE SERP PREVIEW BOX */}
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-muted" />
                  {locale === "fa" ? "پیش‌نمایش زنده در گوگل (Google SERP Snippet Preview)" : "Live Google Search Snippet Preview"}
                </span>

                <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`rounded-md p-1 ${previewDevice === "desktop" ? "bg-surface text-brand shadow-sm" : "text-muted"}`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`rounded-md p-1 ${previewDevice === "mobile" ? "bg-surface text-brand shadow-sm" : "text-muted"}`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Rendered Google Result */}
              <div className={`space-y-1 p-2 ${previewDevice === "mobile" ? "max-w-sm rounded-xl border border-border/60 bg-surface-2/40" : ""}`}>
                {/* Google Breadcrumb */}
                <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  <div className="h-4 w-4 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold">D</div>
                  <span>digisub.ir › blog › {slug || "your-article-slug"}</span>
                </div>

                {/* Blue Title Link */}
                <h4 className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer leading-snug">
                  {seoTitle || title || "عنوان سئو مقاله در نتایج گوگل قرار می‌گیرد"}
                </h4>

                {/* Gray Description */}
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {seoDescription || "توضیحات متای مقاله در این قسمت از نتایج گوگل نمایش داده می‌شود و نرخ کلیک (CTR) ورودی‌های وبسایت شما را تعیین می‌کند..."}
                </p>
              </div>
            </div>

            {/* FAQ SCHEMA BUILDER (GEO 2026 Ready) */}
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-text flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-brand" />
                    {locale === "fa" ? "پرسش و پاسخ‌های اسکیما (FAQPage Schema - اسنیپت ستاره‌دار گوگل)" : "FAQPage Schema Generator"}
                  </h5>
                  <p className="text-[11px] text-muted">
                    {locale === "fa" ? "پاسخ مستقیم به سوالات هوش مصنوعی (Perplexity و ChatGPT Search) و ریچ اسنیپت گوگل" : "Powers Google Rich Snippets and AI Search citations"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setFaqList([...faqList, { question: "", answer: "" }])}
                  className="rounded-lg bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text hover:border-brand"
                >
                  + افزودن سوال
                </button>
              </div>

              {faqList.map((faq, idx) => (
                <div key={idx} className="rounded-xl border border-border/80 bg-surface-2/50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder={`سوال ${idx + 1}: مثلاً آیا برای خرید تلگرام پرمیوم نیاز به پسورد اکانت است؟`}
                      value={faq.question}
                      onChange={(e) => {
                        const next = [...faqList];
                        next[idx].question = e.target.value;
                        setFaqList(next);
                      }}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text"
                    />
                    {faqList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFaqList(faqList.filter((_, i) => i !== idx))}
                        className="text-muted hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="پاسخ کوتاه، صریح و مستقیم به این سوال (۴۰ تا ۸۰ کلمه)..."
                    value={faq.answer}
                    onChange={(e) => {
                      const next = [...faqList];
                      next[idx].answer = e.target.value;
                      setFaqList(next);
                    }}
                    className="w-full rounded-lg border border-border bg-surface p-2.5 text-xs text-text"
                  />
                </div>
              ))}
            </div>

            {/* LIVE SEO AUDIT CHECKLIST (Rank Math Style) */}
            <div className="space-y-2.5 rounded-2xl border border-border bg-surface p-4">
              <h5 className="text-xs font-bold text-text flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {locale === "fa" ? "چک‌لیست آنالیزور زنده سئو (Rank Math Audit)" : "Live SEO Audit Checklist"}
              </h5>

              <div className="grid gap-2 sm:grid-cols-2">
                {liveSeo.checks.map((chk) => (
                  <div
                    key={chk.id}
                    className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs ${
                      chk.passed
                        ? "border-emerald-500/20 bg-emerald-500/5 text-text"
                        : chk.severity === "warning"
                        ? "border-amber-500/20 bg-amber-500/5 text-text"
                        : "border-rose-500/20 bg-rose-500/5 text-text"
                    }`}
                  >
                    {chk.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${chk.severity === "warning" ? "text-amber-500" : "text-rose-500"}`} />
                    )}
                    <div>
                      <span className="font-bold block text-[11px]">{locale === "fa" ? chk.labelFa : chk.labelEn}</span>
                      <span className="text-[10px] text-muted block mt-0.5">{locale === "fa" ? chk.messageFa : chk.messageEn}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-text cursor-pointer">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-4 w-4"
              />
              <span>{locale === "fa" ? "انتشار مقاله روی وبلاگ (عمومی)" : "Publish article immediately"}</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text hover:bg-surface-2"
              >
                {locale === "fa" ? "انصراف" : "Cancel"}
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-6 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
              >
                {editingId ? (locale === "fa" ? "بروزرسانی مقاله و سئو" : "Update Article") : (locale === "fa" ? "انتشار مقاله و ثبت سئو" : "Publish Article")}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ARTICLES TABLE LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text">
            {locale === "fa" ? `لیست مقالات منتشر شده (${articles.length} مقاله)` : `Published Articles (${articles.length})`}
          </h3>
        </div>

        {loading ? (
          <p className="text-sm text-muted">در حال بارگزاری مقالات...</p>
        ) : articles.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-3">
            <BookOpen className="h-8 w-8 text-muted mx-auto" />
            <p className="text-sm font-semibold text-text">هنوز مقاله‌ای ثبت نشده است.</p>
            <p className="text-xs text-muted">با زدن دکمه «نوشتن مقاله جدید»، اولین مقاله سئو شده خود را بارگزاری کنید.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {articles.map((art) => (
              <div
                key={art.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">
                      {art.category}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-black text-white ${
                        art.seoScore >= 85
                          ? "bg-emerald-600"
                          : art.seoScore >= 70
                          ? "bg-blue-600"
                          : "bg-amber-500"
                      }`}
                    >
                      سئو: {art.seoScore}/۱۰۰
                    </span>
                    {!art.published && (
                      <span className="rounded-md bg-zinc-500/20 px-2 py-0.5 text-[10px] text-zinc-400">
                        پیش‌نویس
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-text">{art.title}</h4>
                  <div className="flex items-center gap-3 text-[11px] text-muted font-mono">
                    <span>/blog/{art.slug}</span>
                    <span>•</span>
                    <span>بازدید: {art.views}</span>
                    <span>•</span>
                    <span>{formatDate(art.createdAt, locale)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/blog/${art.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text hover:border-brand"
                  >
                    <Eye className="h-3.5 w-3.5 text-brand" />
                    {locale === "fa" ? "مشاهده" : "View"}
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleStartEdit(art)}
                    className="inline-flex items-center gap-1 rounded-xl bg-indigo-600/10 px-3 py-1.5 text-xs font-bold text-brand hover:bg-indigo-600/20"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    {locale === "fa" ? "ویرایش و سئو" : "Edit"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(art.id)}
                    className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-rose-600 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
