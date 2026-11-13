import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  Calendar,
  Clock,
  Eye,
  User,
  Share2,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  List,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/i18n";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  const article = await prisma.article.findUnique({
    where: { slug: decoded },
  });

  if (!article) {
    return { title: "مقاله یافت نشد | دیجی‌ساب" };
  }

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt || article.title;
  const keywords = [
    article.focusKeyword,
    ...(article.secondaryKeywords ? article.secondaryKeywords.split(",") : []),
  ].filter(Boolean) as string[];

  const canonical = article.canonicalUrl || `https://digisub.ir/blog/${article.slug}`;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "دیجی‌ساب",
      type: "article",
      publishedTime: article.createdAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [article.author],
      images: article.coverImage ? [{ url: article.coverImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  const article = await prisma.article.findUnique({
    where: { slug: decoded },
  });

  if (!article || !article.published) {
    notFound();
  }

  // Increment views
  await prisma.article.update({
    where: { id: article.id },
    data: { views: { increment: 1 } },
  });

  // Related articles
  const related = await prisma.article.findMany({
    where: {
      category: article.category,
      id: { not: article.id },
      published: true,
    },
    take: 3,
  });

  // Parse FAQs if present
  let faqList: Array<{ question: string; answer: string }> = [];
  try {
    if (article.faqItemsJson) {
      faqList = JSON.parse(article.faqItemsJson);
    }
  } catch {}

  // Build JSON-LD structured data
  const canonicalUrl = article.canonicalUrl || `https://digisub.ir/blog/${article.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seoDescription || article.excerpt,
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: "دیجی‌ساب",
      logo: {
        "@type": "ImageObject",
        url: "https://digisub.ir/icon.png",
      },
    },
    datePublished: article.createdAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    image: article.coverImage || undefined,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "صفحه اصلی",
        item: "https://digisub.ir",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "وبلاگ",
        item: "https://digisub.ir/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: canonicalUrl,
      },
    ],
  };

  const faqSchema =
    faqList.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqList.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        }
      : null;

  // Render markdown content to structured HTML with headers & tables
  const renderFormattedContent = (raw: string) => {
    // Process markdown tables: | ... |
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
      const body = rows.slice(2); // Skip separator row

      return (
        <div key={`tbl-${keyIdx}`} className="my-6 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
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
          <h2 key={idx} className="mt-8 mb-4 text-xl font-black text-text border-r-4 border-indigo-600 pr-3">
            {line.replace("## ", "")}
          </h2>
        );
      } else if (line.startsWith("> ")) {
        // Callout box
        elements.push(
          <div key={idx} className="my-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/8 p-4 text-xs font-semibold text-text leading-relaxed">
            {line.replace("> ", "")}
          </div>
        );
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        elements.push(
          <li key={idx} className="mr-4 list-disc text-sm text-text leading-loose">
            {line.replace(/^[-*]\s+/, "")}
          </li>
        );
      } else if (line.trim()) {
        // Paragraph with basic link replacement
        elements.push(
          <p key={idx} className="my-3 text-sm text-zinc-700 dark:text-zinc-300 leading-loose">
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
    <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* JSON-LD Schema Tags */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-text">صفحه اصلی</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/blog" className="hover:text-text">وبلاگ</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-text font-semibold truncate max-w-xs">{article.title}</span>
      </nav>

      {/* Article Header */}
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-brand">
            {article.category}
          </span>
          <span className="rounded-md bg-surface-2 px-2.5 py-1 font-mono text-[11px] font-bold text-muted">
            نمره سئو: {article.seoScore}/۱۰۰
          </span>
        </div>

        <h1 className="text-2xl font-black text-text sm:text-3xl leading-snug">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="text-sm font-medium leading-relaxed text-muted sm:text-base">
            {article.excerpt}
          </p>
        )}

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-brand" />
              {article.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted" />
              {formatDate(article.createdAt, "fa")}
            </span>
            <span className="flex items-center gap-1.5 font-mono">
              <Clock className="h-4 w-4 text-muted" />
              زمان مطالعه: {article.readingTimeMin} دقیقه
            </span>
            <span className="flex items-center gap-1.5 font-mono">
              <Eye className="h-4 w-4 text-muted" />
              {article.views} بازدید
            </span>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {article.coverImage && (
        <div className="my-6 aspect-video w-full overflow-hidden rounded-3xl bg-surface-2 shadow-lg">
          <img
            src={article.coverImage}
            alt={article.focusKeyword || article.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Main Content Body */}
      <main className="mt-8 prose prose-zinc dark:prose-invert max-w-none">
        {renderFormattedContent(article.content)}
      </main>

      {/* Product CTA Box */}
      <div className="my-10 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-surface to-indigo-500/15 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-brand font-extrabold text-sm">
          <ShoppingBag className="h-5 w-5" />
          تهیه اشتراک با تحویل فوری و گارانتی کامل
        </div>
        <h3 className="text-lg font-black text-text">
          قصد خرید اشتراک مطمئن و قانونی را دارید؟
        </h3>
        <p className="text-xs leading-relaxed text-muted sm:text-sm">
          در فروشگاه دیجی‌ساب تمامی اشتراک‌های تلگرام پرمیوم، استارز، شماره مجازی و هوش مصنوعی با اتصال مستقیم به سرورهای مادر، پشتیبانی ۲۴ ساعته و بدون واسطه ارائه می‌شوند.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700"
          >
            مشاهده تمام محصولات و قیمت‌ها
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/product/telegram-premium"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-bold text-text hover:border-brand"
          >
            خرید تلگرام پرمیوم
          </Link>
        </div>
      </div>

      {/* FAQ Section (Google Rich Snippet & GEO) */}
      {faqList.length > 0 && (
        <section className="my-10 rounded-3xl border border-border bg-surface p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-black text-text">
              سوالات متداول کاربران (FAQ)
            </h2>
          </div>

          <div className="divide-y divide-border/70">
            {faqList.map((faq, idx) => (
              <div key={idx} className="py-4 space-y-1.5">
                <h3 className="text-sm font-bold text-text">
                  {faq.question}
                </h3>
                <p className="text-xs leading-relaxed text-muted">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Focus Keywords Tags */}
      {article.focusKeyword && (
        <div className="my-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-xs font-bold text-muted">برچسب‌ها و کلمات کلیدی:</span>
          <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-brand">
            #{article.focusKeyword}
          </span>
          {article.secondaryKeywords &&
            article.secondaryKeywords.split(",").map((sk, idx) => (
              <span key={idx} className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                #{sk.trim()}
              </span>
            ))}
        </div>
      )}

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="mt-12 border-t border-border pt-8 space-y-6">
          <h3 className="text-lg font-black text-text">مقالات پیشنهادی دیگر</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/blog/${r.slug}`}
                className="group rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40"
              >
                <span className="text-[10px] font-bold text-brand block mb-1">{r.category}</span>
                <h4 className="text-xs font-bold text-text group-hover:text-brand transition line-clamp-2">
                  {r.title}
                </h4>
                <span className="text-[10px] text-muted block mt-2 font-mono">
                  زمان مطالعه: {r.readingTimeMin} دقیقه
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
