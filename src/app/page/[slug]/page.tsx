import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cookies } from "next/headers";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  Phone,
  Send,
  Sparkles,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, Locale } from "@/lib/i18n";

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  const page = await prisma.customPage.findUnique({
    where: { slug: decoded },
  });

  if (!page || !page.published) {
    return {
      title: "صفحه یافت نشد | دیجی‌ساب",
    };
  }

  return {
    title: `${page.seoTitle || page.titleFa} | دیجی‌ساب`,
    description: page.seoDescription || page.contentFa.slice(0, 160),
    openGraph: {
      title: `${page.seoTitle || page.titleFa} | دیجی‌ساب`,
      description: page.seoDescription || page.contentFa.slice(0, 160),
      type: "website",
    },
  };
}

export default async function CustomPageView({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const cookieStore = await cookies();
  const locale: Locale =
    cookieStore.get("digisub_locale")?.value === "en" ? "en" : "fa";
  const ChevronIcon = locale === "fa" ? ChevronLeft : ChevronRight;

  const [page, settings, otherPages] = await Promise.all([
    prisma.customPage.findUnique({
      where: { slug: decodedSlug },
    }),
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
    prisma.customPage.findMany({
      where: { published: true, slug: { not: decodedSlug } },
      take: 4,
    }),
  ]);

  if (!page || !page.published) {
    notFound();
  }

  const title = locale === "fa" ? page.titleFa : page.titleEn;
  const content = locale === "fa" ? page.contentFa : page.contentEn;

  // Simple rich text markdown parser
  const renderContent = (raw: string) => {
    const lines = raw.split("\n");
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    const flushTable = (buf: string[], keyIdx: number) => {
      if (buf.length < 2) return null;
      const rows = buf.map((r) =>
        r
          .split("|")
          .map((c) => c.trim())
          .filter((c, i, a) => (i !== 0 || c !== "") && (i !== a.length - 1 || c !== ""))
      );

      const header = rows[0];
      const body = rows.slice(2);

      return (
        <div
          key={`tbl-${keyIdx}`}
          className="my-6 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm"
        >
          <table className="w-full text-start text-xs sm:text-sm">
            <thead className="border-b border-border bg-surface-2 font-bold text-text">
              <tr>
                {header.map((th, hIdx) => (
                  <th key={hIdx} className="p-3 text-start">
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-surface-2/40">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 text-text">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    let idx = 0;
    while (idx < lines.length) {
      const line = lines[idx];

      // Table row
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        inTable = true;
        tableBuffer.push(line.trim());
        idx++;
        continue;
      } else if (inTable) {
        elements.push(flushTable(tableBuffer, idx));
        tableBuffer = [];
        inTable = false;
      }

      // Headings
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={idx} className="mt-6 mb-3 text-lg font-bold text-text">
            {line.replace("### ", "")}
          </h3>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2
            key={idx}
            className="mt-8 mb-4 text-xl font-black text-text border-r-4 border-indigo-600 pr-3"
          >
            {line.replace("## ", "")}
          </h2>
        );
      } else if (line.startsWith("> ")) {
        // Callout box
        elements.push(
          <div
            key={idx}
            className="my-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/8 p-4 text-xs font-semibold text-text leading-relaxed"
          >
            {line.replace("> ", "")}
          </div>
        );
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        elements.push(
          <li
            key={idx}
            className="mr-4 list-disc text-sm text-zinc-700 dark:text-zinc-300 leading-loose"
          >
            {line.replace(/^[-*]\s+/, "")}
          </li>
        );
      } else if (line.trim()) {
        elements.push(
          <p
            key={idx}
            className="my-3 text-sm text-zinc-700 dark:text-zinc-300 leading-loose"
          >
            {line}
          </p>
        );
      }
      idx++;
    }

    if (inTable && tableBuffer.length > 0) {
      elements.push(flushTable(tableBuffer, idx));
    }

    return elements;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-xs text-muted"
      >
        <Link href="/" className="hover:text-brand transition">
          {locale === "fa" ? "صفحه اصلی" : "Home"}
        </Link>
        <ChevronIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-semibold text-text">{title}</span>
      </nav>

      {/* Page Header Banner */}
      <header className="rounded-3xl border border-border bg-gradient-to-br from-indigo-500/10 via-surface to-surface-2 p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-indigo-500 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {page.isSystemPage
              ? locale === "fa"
                ? "برگه رسمی دیجی‌ساب"
                : "Official Platform Page"
              : locale === "fa"
              ? "برگه اطلاعاتی"
              : "Information Page"}
          </span>
          <span className="inline-flex items-center gap-1 text-muted">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {locale === "fa" ? "بروزرسانی:" : "Updated:"}{" "}
            {formatDate(page.updatedAt, locale)}
          </span>
        </div>

        <h1 className="text-2xl font-black text-text sm:text-4xl leading-tight">
          {title}
        </h1>
        {page.seoDescription && (
          <p className="mt-3 text-sm text-muted leading-relaxed sm:text-base">
            {page.seoDescription}
          </p>
        )}

        {/* Quick Contact Bar if it's the contact page */}
        {decodedSlug === "contact" && settings && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 pt-4 border-t border-border/80">
            {settings.supportPhone && (
              <a
                href={`tel:${settings.supportPhone.replace(/\D/g, "")}`}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3 text-xs font-bold text-text hover:border-brand transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted">
                    {locale === "fa" ? "تماس تلفنی" : "Phone"}
                  </p>
                  <p className="font-mono text-xs">{settings.supportPhone}</p>
                </div>
              </a>
            )}

            {settings.supportTelegram && (
              <a
                href={`https://t.me/${settings.supportTelegram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3 text-xs font-bold text-text hover:border-brand transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted">
                    {locale === "fa" ? "پشتیبانی تلگرام" : "Telegram"}
                  </p>
                  <p className="font-mono text-xs">@{settings.supportTelegram.replace("@", "")}</p>
                </div>
              </a>
            )}

            {settings.supportInstagram && (
              <a
                href={`https://instagram.com/${settings.supportInstagram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3 text-xs font-bold text-text hover:border-brand transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500">
                  <InstagramIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted">
                    {locale === "fa" ? "اینستاگرام" : "Instagram"}
                  </p>
                  <p className="font-mono text-xs">@{settings.supportInstagram.replace("@", "")}</p>
                </div>
              </a>
            )}
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-10 shadow-sm leading-loose">
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          {renderContent(content)}
        </div>
      </main>

      {/* Other Pages Navigation */}
      {otherPages.length > 0 && (
        <section className="mt-12">
          <h3 className="text-base font-bold text-text mb-4">
            {locale === "fa" ? "سایر برگه‌های مرتبط" : "Related Pages"}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {otherPages.map((op) => (
              <Link
                key={op.id}
                href={`/page/${op.slug}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm font-semibold text-text hover:border-brand hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-indigo-500">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span>{locale === "fa" ? op.titleFa : op.titleEn}</span>
                </div>
                <ChevronIcon className="h-4 w-4 text-muted" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
