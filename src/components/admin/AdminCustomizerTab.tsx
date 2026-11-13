"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layout,
  FileCode,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Edit,
  Eye,
  Megaphone,
  Phone,
  Send,
  CheckCircle2,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";

interface CustomPageItem {
  id: string;
  slug: string;
  titleFa: string;
  titleEn: string;
  contentFa: string;
  contentEn: string;
  isSystemPage: boolean;
  showInFooter: boolean;
  showInHeader: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  published: boolean;
  updatedAt: string;
}

export function AdminCustomizerTab() {
  const { locale } = useApp();
  const [subTab, setSubTab] = useState<"layout" | "pages">("layout");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // Layout & Homepage form state
  const [heroBadgeFa, setHeroBadgeFa] = useState("");
  const [heroTitleFa, setHeroTitleFa] = useState("");
  const [heroSubtitleFa, setHeroSubtitleFa] = useState("");
  const [heroCtaTextFa, setHeroCtaTextFa] = useState("");
  const [heroCtaLink, setHeroCtaLink] = useState("/store");

  const [announcementActive, setAnnouncementActive] = useState(true);
  const [announcementTextFa, setAnnouncementTextFa] = useState("");
  const [announcementLink, setAnnouncementLink] = useState("/store");

  const [supportPhone, setSupportPhone] = useState("");
  const [supportTelegram, setSupportTelegram] = useState("");
  const [supportInstagram, setSupportInstagram] = useState("");

  // Custom Pages state
  const [pages, setPages] = useState<CustomPageItem[]>([]);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  const [pageTitleFa, setPageTitleFa] = useState("");
  const [pageTitleEn, setPageTitleEn] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pageContentFa, setPageContentFa] = useState("");
  const [pageContentEn, setPageContentEn] = useState("");
  const [pageShowInFooter, setPageShowInFooter] = useState(true);
  const [pageShowInHeader, setPageShowInHeader] = useState(false);
  const [pagePublished, setPagePublished] = useState(true);
  const [pageSeoTitle, setPageSeoTitle] = useState("");
  const [pageSeoDescription, setPageSeoDescription] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [customizerRes, pagesRes] = await Promise.all([
        fetch("/api/admin/customizer", { cache: "no-store" }),
        fetch("/api/admin/pages", { cache: "no-store" }),
      ]);

      const customizerJson = await customizerRes.json();
      if (customizerJson.settings) {
        const s = customizerJson.settings;
        setHeroBadgeFa(s.heroBadgeFa || "تحویل ۱۰۰٪ اتوماتیک و اتصال مستقیم سرور مادر");
        setHeroTitleFa(s.heroTitleFa || "فروشگاه هوشمند اشتراک و اکانت‌های دیجیتال بین‌المللی");
        setHeroSubtitleFa(
          s.heroSubtitleFa ||
            "تحویل آنی تلگرام پرمیوم و استارز از شبکه فرگمنت TON، شماره مجازی اختصاصی و فعال‌سازی اکانت‌های هوش مصنوعی با گارانتی کامل و تخفیف باشگاه مشتریان"
        );
        setHeroCtaTextFa(s.heroCtaTextFa || "مشاهده و خرید اشتراک‌ها");
        setHeroCtaLink(s.heroCtaLink || "/store");

        setAnnouncementActive(s.announcementActive !== false);
        setAnnouncementTextFa(
          s.announcementTextFa || "🔥 تخفیف ویژه ۱۵ درصدی برای اولین خرید شما با کد تخفیف WELCOME15"
        );
        setAnnouncementLink(s.announcementLink || "/store");

        setSupportPhone(s.supportPhone || "021-91000000");
        setSupportTelegram(s.supportTelegram || "DigiSubSupport");
        setSupportInstagram(s.supportInstagram || "digisub_store");
      }

      const pagesJson = await pagesRes.json();
      if (pagesJson.pages) {
        setPages(pagesJson.pages);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/customizer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heroBadgeFa,
        heroTitleFa,
        heroSubtitleFa,
        heroCtaTextFa,
        heroCtaLink,
        announcementActive,
        announcementTextFa,
        announcementLink,
        supportPhone,
        supportTelegram,
        supportInstagram,
      }),
    });
    if (res.ok) {
      setMsg(locale === "fa" ? "تنظیمات صفحه اصلی و بنرها ذخیره شد!" : "Layout settings saved!");
      await loadData();
    }
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const payload = {
      id: editingPageId,
      titleFa: pageTitleFa,
      titleEn: pageTitleEn || pageTitleFa,
      slug: pageSlug,
      contentFa: pageContentFa,
      contentEn: pageContentEn || pageContentFa,
      showInFooter: pageShowInFooter,
      showInHeader: pageShowInHeader,
      published: pagePublished,
      seoTitle: pageSeoTitle || pageTitleFa,
      seoDescription: pageSeoDescription,
    };

    const method = editingPageId ? "PATCH" : "POST";
    const res = await fetch("/api/admin/pages", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (res.ok) {
      setMsg(locale === "fa" ? "برگه با موفقیت ذخیره شد!" : "Page saved!");
      setIsEditingPage(false);
      setEditingPageId(null);
      await loadData();
    } else {
      setMsg(json.error || "خطا در ذخیره برگه");
    }
  };

  const handleStartEditPage = (page: CustomPageItem) => {
    setEditingPageId(page.id);
    setPageTitleFa(page.titleFa);
    setPageTitleEn(page.titleEn);
    setPageSlug(page.slug);
    setPageContentFa(page.contentFa);
    setPageContentEn(page.contentEn);
    setPageShowInFooter(page.showInFooter);
    setPageShowInHeader(page.showInHeader);
    setPagePublished(page.published);
    setPageSeoTitle(page.seoTitle || "");
    setPageSeoDescription(page.seoDescription || "");
    setIsEditingPage(true);
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm(locale === "fa" ? "آیا از حذف این برگه اطمینان دارید؟" : "Delete this page?")) return;
    const res = await fetch(`/api/admin/pages?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) {
      setMsg(locale === "fa" ? "برگه حذف شد." : "Page deleted.");
      await loadData();
    } else {
      setMsg(json.error || "خطا در حذف برگه");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black text-text">
            {locale === "fa" ? "شخصی‌سازی و مدیریت صفحات (Page Customizer)" : "Site & Page Customizer"}
          </h2>
          <p className="text-xs text-muted mt-1">
            {locale === "fa"
              ? "مدیریت محتوای صفحه اصلی، نوار اعلان، اطلاعات تماس و ایجاد برگه‌های سفارشی (درباره ما، قوانین و...)"
              : "Customize hero banners, announcement bar, social links and manage custom pages"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setSubTab("layout")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              subTab === "layout" ? "bg-indigo-600 text-white shadow-sm" : "text-muted hover:text-text"
            }`}
          >
            <Layout className="h-3.5 w-3.5" />
            {locale === "fa" ? "طراحی صفحه اصلی و بنرها" : "Homepage & Layout"}
          </button>
          <button
            type="button"
            onClick={() => setSubTab("pages")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              subTab === "pages" ? "bg-indigo-600 text-white shadow-sm" : "text-muted hover:text-text"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            {locale === "fa" ? `مدیریت برگه‌ها (${pages.length})` : `Custom Pages (${pages.length})`}
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs font-semibold text-brand">
          {msg}
        </div>
      )}

      {/* SUBTAB 1: HOMEPAGE & BANNER CUSTOMIZER */}
      {subTab === "layout" && (
        <form onSubmit={handleSaveLayout} className="space-y-6">
          {/* Announcement Bar Customizer */}
          <div className="rounded-3xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-bold text-text">
                <Megaphone className="h-5 w-5 text-amber-500" />
                <h3>{locale === "fa" ? "نوار اعلان بالای سایت (Announcement Bar)" : "Top Announcement Bar"}</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={announcementActive}
                  onChange={(e) => setAnnouncementActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <span>{locale === "fa" ? "نمایش نوار اعلان" : "Active"}</span>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-text block">
                  {locale === "fa" ? "متن پیام نوار اعلان" : "Announcement Text"}
                </label>
                <input
                  type="text"
                  value={announcementTextFa}
                  onChange={(e) => setAnnouncementTextFa(e.target.value)}
                  placeholder="🔥 تخفیف ویژه ۱۵ درصدی با کد تخفیف WELCOME15..."
                  className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-xs text-text"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-text block">
                  {locale === "fa" ? "لینک دکمه نوار اعلان" : "Announcement Link"}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={announcementLink}
                  onChange={(e) => setAnnouncementLink(e.target.value)}
                  placeholder="/store or /product/telegram-premium"
                  className="w-full rounded-xl border border-border bg-surface-2 p-2 text-xs font-mono text-text"
                />
              </div>
            </div>
          </div>

          {/* Hero Banner Customizer */}
          <div className="rounded-3xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-text border-b border-border pb-3">
              <Sparkles className="h-5 w-5 text-brand" />
              <h3>{locale === "fa" ? "بخش بنر اصلی صفحه اول (Hero Banner)" : "Homepage Hero Section"}</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-text block mb-1">
                  {locale === "fa" ? "متن نشان بالای عنوان (Badge)" : "Hero Badge Text"}
                </label>
                <input
                  type="text"
                  value={heroBadgeFa}
                  onChange={(e) => setHeroBadgeFa(e.target.value)}
                  placeholder="تحویل ۱۰۰٪ اتوماتیک و اتصال مستقیم سرور مادر"
                  className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-xs text-text"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text block mb-1">
                  {locale === "fa" ? "عنوان اصلی هدر (H1)" : "Main Hero Title (H1)"}
                </label>
                <input
                  type="text"
                  value={heroTitleFa}
                  onChange={(e) => setHeroTitleFa(e.target.value)}
                  placeholder="فروشگاه هوشمند اشتراک و اکانت‌های دیجیتال بین‌المللی"
                  className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-sm font-extrabold text-text"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text block mb-1">
                  {locale === "fa" ? "توضیحات معرفی و زیرعنوان" : "Hero Subtitle Description"}
                </label>
                <textarea
                  rows={3}
                  value={heroSubtitleFa}
                  onChange={(e) => setHeroSubtitleFa(e.target.value)}
                  placeholder="تحویل آنی تلگرام پرمیوم و استارز از شبکه فرگمنت TON..."
                  className="w-full rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-text"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-text block mb-1">
                    {locale === "fa" ? "متن دکمه اصلی (CTA Text)" : "Primary Button Text"}
                  </label>
                  <input
                    type="text"
                    value={heroCtaTextFa}
                    onChange={(e) => setHeroCtaTextFa(e.target.value)}
                    placeholder="مشاهده و خرید اشتراک‌ها"
                    className="w-full rounded-xl border border-border bg-surface-2 p-2 text-xs text-text"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text block mb-1">
                    {locale === "fa" ? "لینک دکمه اصلی (CTA Link)" : "Primary Button Link"}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={heroCtaLink}
                    onChange={(e) => setHeroCtaLink(e.target.value)}
                    placeholder="/store"
                    className="w-full rounded-xl border border-border bg-surface-2 p-2 text-xs font-mono text-text"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social & Contact Information */}
          <div className="rounded-3xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-text border-b border-border pb-3">
              <Phone className="h-5 w-5 text-indigo-500" />
              <h3>{locale === "fa" ? "اطلاعات تماس و شبکه‌های اجتماعی" : "Contact & Social Media Links"}</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-text block mb-1">تلفن پشتیبانی</label>
                <input
                  type="text"
                  dir="ltr"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="021-91000000"
                  className="w-full rounded-xl border border-border bg-surface-2 p-2 text-xs font-mono text-text"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text block mb-1">آیدی تلگرام پشتیبانی</label>
                <input
                  type="text"
                  dir="ltr"
                  value={supportTelegram}
                  onChange={(e) => setSupportTelegram(e.target.value)}
                  placeholder="DigiSubSupport"
                  className="w-full rounded-xl border border-border bg-surface-2 p-2 text-xs font-mono text-text"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text block mb-1">پیج اینستاگرام</label>
                <input
                  type="text"
                  dir="ltr"
                  value={supportInstagram}
                  onChange={(e) => setSupportInstagram(e.target.value)}
                  placeholder="digisub_store"
                  className="w-full rounded-xl border border-border bg-surface-2 p-2 text-xs font-mono text-text"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" />
              {locale === "fa" ? "ذخیره تغییرات صفحه اصلی و بنرها" : "Save Customizer Settings"}
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 2: CUSTOM PAGES MANAGEMENT */}
      {subTab === "pages" && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text">
              {locale === "fa" ? "لیست برگه‌های سفارشی سایت" : "Custom Site Pages"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingPageId(null);
                setPageTitleFa("");
                setPageTitleEn("");
                setPageSlug("");
                setPageContentFa("");
                setPageContentEn("");
                setPageShowInFooter(true);
                setPageShowInHeader(false);
                setPagePublished(true);
                setPageSeoTitle("");
                setPageSeoDescription("");
                setIsEditingPage(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              {locale === "fa" ? "ایجاد برگه جدید" : "New Custom Page"}
            </button>
          </div>

          {/* Edit / Create Page Modal Form */}
          {isEditingPage && (
            <form onSubmit={handleSavePage} className="rounded-3xl border border-border bg-surface p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="font-extrabold text-text">
                  {editingPageId ? (locale === "fa" ? "ویرایش برگه" : "Edit Page") : (locale === "fa" ? "ایجاد برگه اختصاصی جدید" : "Create New Page")}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditingPage(false)}
                  className="rounded-lg bg-surface-2 px-3 py-1 text-xs font-bold text-muted"
                >
                  انصراف
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-text block mb-1">عنوان فارسی برگه *</label>
                  <input
                    type="text"
                    required
                    value={pageTitleFa}
                    onChange={(e) => setPageTitleFa(e.target.value)}
                    placeholder="مثال: درباره دیجی‌ساب"
                    className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-xs text-text"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text block mb-1">عنوان انگلیسی برگه</label>
                  <input
                    type="text"
                    value={pageTitleEn}
                    onChange={(e) => setPageTitleEn(e.target.value)}
                    placeholder="e.g. About DigiSub"
                    className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-xs text-text"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-text block mb-1">نامک آدرس (URL Slug) *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={pageSlug}
                    onChange={(e) => setPageSlug(e.target.value)}
                    placeholder="about-us"
                    className="w-full rounded-xl border border-border bg-surface-2 p-2 text-xs font-mono text-text"
                  />
                  <p className="text-[11px] text-muted mt-0.5">آدرس صفحه در سایت: /page/{pageSlug || "slug"}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text block mb-1">محتوا و متن برگه (پشتیبانی از Markdown و HTML) *</label>
                <textarea
                  rows={8}
                  required
                  value={pageContentFa}
                  onChange={(e) => setPageContentFa(e.target.value)}
                  placeholder="محتوا، توضیحات، آدرس‌ها یا قوانین مورد نظر خود را در این بخش وارد کنید..."
                  className="w-full rounded-2xl border border-border bg-surface-2 p-3 text-xs leading-relaxed font-mono text-text"
                />
              </div>

              {/* Page SEO */}
              <div className="grid gap-3 sm:grid-cols-2 rounded-2xl border border-border/80 bg-surface-2/40 p-4">
                <div>
                  <label className="text-xs font-bold text-text block mb-1">عنوان سئو برگه (SEO Title)</label>
                  <input
                    type="text"
                    value={pageSeoTitle}
                    onChange={(e) => setPageSeoTitle(e.target.value)}
                    placeholder="درباره ما | دیجی‌ساب"
                    className="w-full rounded-xl border border-border bg-surface p-2 text-xs text-text"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text block mb-1">توضیحات سئو (Meta Description)</label>
                  <input
                    type="text"
                    value={pageSeoDescription}
                    onChange={(e) => setPageSeoDescription(e.target.value)}
                    placeholder="توضیحات خلاصه برگه برای نمایش در گوگل..."
                    className="w-full rounded-xl border border-border bg-surface p-2 text-xs text-text"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 border-t border-border pt-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageShowInFooter}
                    onChange={(e) => setPageShowInFooter(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>نمایش در منوی فوتر سایت</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pagePublished}
                    onChange={(e) => setPagePublished(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>انتشار عمومی برگه</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingPage(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text hover:bg-surface-2"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-6 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
                >
                  {editingPageId ? "بروزرسانی برگه" : "انتشار برگه"}
                </button>
              </div>
            </form>
          )}

          {/* Pages List */}
          <div className="grid gap-3">
            {pages.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text">{p.titleFa}</span>
                    <span className="font-mono text-xs text-muted">({p.titleEn})</span>
                    {p.isSystemPage && (
                      <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                        برگه اصلی
                      </span>
                    )}
                    {!p.published && (
                      <span className="rounded-md bg-zinc-500/20 px-2 py-0.5 text-[10px] text-zinc-400">
                        پیش‌نویس
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted font-mono">
                    <span>/page/{p.slug}</span>
                    <span>•</span>
                    <span>{p.showInFooter ? "نمایش در فوتر: بله" : "نمایش در فوتر: خیر"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/page/${p.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text hover:border-brand"
                  >
                    <Eye className="h-3.5 w-3.5 text-brand" />
                    مشاهده
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleStartEditPage(p)}
                    className="inline-flex items-center gap-1 rounded-xl bg-indigo-600/10 px-3 py-1.5 text-xs font-bold text-brand hover:bg-indigo-600/20"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    ویرایش
                  </button>

                  {!p.isSystemPage && (
                    <button
                      type="button"
                      onClick={() => handleDeletePage(p.id)}
                      className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-rose-600 hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
