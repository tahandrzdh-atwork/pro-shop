export interface SeoCheckItem {
  id: string;
  labelFa: string;
  labelEn: string;
  passed: boolean;
  score: number;
  maxScore: number;
  messageFa: string;
  messageEn: string;
  severity: "success" | "warning" | "error";
}

export interface SeoAnalysisResult {
  score: number; // 0 to 100
  rating: "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
  checks: SeoCheckItem[];
  stats: {
    wordCount: number;
    charCount: number;
    keywordDensity: number;
    keywordOccurrences: number;
    headingCount: number;
    internalLinkCount: number;
    externalLinkCount: number;
    tableCount: number;
    faqCount: number;
    titleLength: number;
    descriptionLength: number;
  };
}

export function analyzeSeo(params: {
  title: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  content: string;
  focusKeyword: string;
  secondaryKeywords?: string;
  faqItems?: Array<{ question: string; answer: string }>;
}): SeoAnalysisResult {
  const {
    title,
    seoTitle,
    seoDescription,
    slug,
    content,
    focusKeyword = "",
    faqItems = [],
  } = params;

  const kw = focusKeyword.trim().toLowerCase();
  const rawText = content.replace(/<[^>]*>/g, " ").replace(/[#*_`~\[\]()|]/g, " ");
  const words = rawText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = rawText.length;

  // Occurrences
  const kwRegex = kw ? new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi") : null;
  const occurrences = kw && kwRegex ? (content.match(kwRegex) || []).length : 0;
  const keywordDensity = wordCount > 0 ? Number(((occurrences / wordCount) * 100).toFixed(2)) : 0;

  // Headings
  const h2h3Matches = content.match(/<h[23][^>]*>.*?<\/h[23]>|^#{2,3}\s+.*$/gim) || [];
  const headingCount = h2h3Matches.length;
  const kwInHeadings = kw ? h2h3Matches.some((h) => h.toLowerCase().includes(kw)) : false;

  // Links
  const linkMatches = content.match(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>|\[([^\]]+)\]\(([^)]+)\)/gi) || [];
  let internalLinkCount = 0;
  let externalLinkCount = 0;
  linkMatches.forEach((l) => {
    if (l.includes("http://") || l.includes("https://")) {
      if (l.includes("digisub") || l.includes("localhost") || l.includes("tahandrzdh")) {
        internalLinkCount++;
      } else {
        externalLinkCount++;
      }
    } else {
      internalLinkCount++;
    }
  });

  // Tables
  const hasHtmlTable = /<table[^>]*>[\s\S]*?<\/table>/gi.test(content);
  const hasMdTable = /\|[\s\S]*?\|[\r\n]+\|[\s\-:|]+\|[\r\n]+\|[\s\S]*?\|/g.test(content);
  const tableCount = (hasHtmlTable ? 1 : 0) + (hasMdTable ? 1 : 0);

  // Intro text (first 10% or first 120 words)
  const introWords = words.slice(0, Math.min(120, Math.ceil(wordCount * 0.15))).join(" ").toLowerCase();
  const kwInIntro = kw ? introWords.includes(kw) : false;

  const checks: SeoCheckItem[] = [];

  // Check 1: Focus Keyword Defined
  checks.push({
    id: "focus_kw_defined",
    labelFa: "تعیین کلمه کلیدی اصلی",
    labelEn: "Focus keyword defined",
    passed: kw.length > 1,
    score: kw.length > 1 ? 5 : 0,
    maxScore: 5,
    messageFa: kw.length > 1 ? `کلمه کلیدی «${focusKeyword}» تعریف شده است.` : "لطفاً کلمه کلیدی اصلی را مشخص کنید.",
    messageEn: kw.length > 1 ? `Focus keyword is set to "${focusKeyword}".` : "Please set a primary focus keyword.",
    severity: kw.length > 1 ? "success" : "error",
  });

  // Check 2: Focus Keyword in SEO Title
  const kwInTitle = kw ? (seoTitle || title).toLowerCase().includes(kw) : false;
  checks.push({
    id: "kw_in_title",
    labelFa: "کلمه کلیدی در عنوان اسنیپت (Title Tag)",
    labelEn: "Focus keyword in SEO title",
    passed: kwInTitle,
    score: kwInTitle ? 15 : 0,
    maxScore: 15,
    messageFa: kwInTitle ? "کلمه کلیدی در عنوان سئو اسنیپت وجود دارد." : "کلمه کلیدی اصلی در عنوان اسنیپت یافت نشد.",
    messageEn: kwInTitle ? "Keyword is present in the SEO Title." : "Keyword missing in SEO Title.",
    severity: kwInTitle ? "success" : "error",
  });

  // Check 3: SEO Title Length
  const titleLen = (seoTitle || title).trim().length;
  const isTitleGood = titleLen >= 35 && titleLen <= 65;
  checks.push({
    id: "title_length",
    labelFa: "طول استاندارد عنوان سئو (۳۵ تا ۶۵ کاراکتر)",
    labelEn: "SEO Title optimal length (35-65 chars)",
    passed: isTitleGood,
    score: isTitleGood ? 10 : titleLen > 0 ? 5 : 0,
    maxScore: 10,
    messageFa: `طول عنوان فعلی ${titleLen} کاراکتر است (ایده‌آل: ۴۰ تا ۶۰ کاراکتر برای گوگل).`,
    messageEn: `Current title length is ${titleLen} chars (ideal: 40-60 chars).`,
    severity: isTitleGood ? "success" : "warning",
  });

  // Check 4: Focus Keyword in Meta Description
  const kwInDesc = kw ? seoDescription.toLowerCase().includes(kw) : false;
  checks.push({
    id: "kw_in_desc",
    labelFa: "کلمه کلیدی در توضیحات متای اسنیپت",
    labelEn: "Focus keyword in Meta Description",
    passed: kwInDesc,
    score: kwInDesc ? 15 : 0,
    maxScore: 15,
    messageFa: kwInDesc ? "کلمه کلیدی در توضیحات متا قرار دارد." : "کلمه کلیدی در توضیحات اسنیپت وجود ندارد.",
    messageEn: kwInDesc ? "Focus keyword found in Meta Description." : "Keyword missing in Meta Description.",
    severity: kwInDesc ? "success" : "error",
  });

  // Check 5: Meta Description Length (120 to 160 chars)
  const descLen = seoDescription.trim().length;
  const isDescGood = descLen >= 120 && descLen <= 165;
  checks.push({
    id: "desc_length",
    labelFa: "طول توضیحات متای اسنیپت (۱۲۰ تا ۱۶۰ کاراکتر)",
    labelEn: "Meta Description length (120-160 chars)",
    passed: isDescGood,
    score: isDescGood ? 10 : descLen >= 80 ? 5 : 0,
    maxScore: 10,
    messageFa: `طول توضیحات فعلی ${descLen} کاراکتر است (استاندارد: ۱۳۰ تا ۱۵۸ کاراکتر).`,
    messageEn: `Current description is ${descLen} chars (standard: 130-158 chars).`,
    severity: isDescGood ? "success" : "warning",
  });

  // Check 6: Focus Keyword in URL Slug
  const kwInSlug = kw ? slug.toLowerCase().replace(/-/g, " ").includes(kw.replace(/-/g, " ")) || slug.length >= 3 : false;
  checks.push({
    id: "kw_in_slug",
    labelFa: "کلمه کلیدی یا مفهوم آن در نامک (Slug)",
    labelEn: "Keyword in URL slug",
    passed: kwInSlug,
    score: kwInSlug ? 10 : 0,
    maxScore: 10,
    messageFa: kwInSlug ? `نامک مناسب است: /blog/${slug}` : "اسلاگ بهتر است انگلیسی و حاوی کلمه کلیدی باشد.",
    messageEn: kwInSlug ? `URL slug is optimized: /blog/${slug}` : "Slug should include the target keyword.",
    severity: kwInSlug ? "success" : "warning",
  });

  // Check 7: Focus Keyword in First 10%
  checks.push({
    id: "kw_in_intro",
    labelFa: "حضور کلمه کلیدی در پاراگراف اول (۱۰٪ اول متن)",
    labelEn: "Focus keyword in the first 10% of content",
    passed: kwInIntro,
    score: kwInIntro ? 10 : 0,
    maxScore: 10,
    messageFa: kwInIntro ? "کلمه کلیدی در مقدمه و پاراگراف اول به کار رفته است." : "کلمه کلیدی اصلی باید در ۱۰۰ کلمه اول مقاله ذکر شود.",
    messageEn: kwInIntro ? "Keyword appears in the opening paragraph." : "Keyword should appear in the first 100 words.",
    severity: kwInIntro ? "success" : "warning",
  });

  // Check 8: Headings H2 / H3 with keyword
  checks.push({
    id: "headings_check",
    labelFa: "تیترهای H2 و H3 به همراه کلمه کلیدی",
    labelEn: "H2/H3 headings containing keyword",
    passed: headingCount >= 2 && kwInHeadings,
    score: headingCount >= 2 && kwInHeadings ? 10 : headingCount >= 2 ? 6 : 0,
    maxScore: 10,
    messageFa: headingCount >= 2 && kwInHeadings
      ? `تعداد ${headingCount} تیتر یافت شد و کلمه کلیدی در آن‌ها تکرار شده است.`
      : `مقاله دارای ${headingCount} تیتر است. حداقل ۲ تیتر H2/H3 با کلمه کلیدی توصیه می‌شود.`,
    messageEn: headingCount >= 2 && kwInHeadings
      ? `Found ${headingCount} headings with keyword integration.`
      : `Found ${headingCount} headings. Recommend at least 2 H2/H3 with keyword.`,
    severity: headingCount >= 2 && kwInHeadings ? "success" : "warning",
  });

  // Check 9: Content Length (Word count)
  const isWordCountGood = wordCount >= 600;
  checks.push({
    id: "word_count",
    labelFa: "حجم محتوا (حداقل ۶۰۰ کلمه، ایده‌آل بالای ۱۰۰۰ کلمه)",
    labelEn: "Content length (min 600 words, ideal 1000+)",
    passed: isWordCountGood,
    score: wordCount >= 1000 ? 15 : wordCount >= 600 ? 10 : wordCount >= 300 ? 5 : 0,
    maxScore: 15,
    messageFa: `مقاله شامل ${wordCount} کلمه است (${wordCount >= 1000 ? "عالی برای سئو و GEO" : wordCount >= 600 ? "مطلوب" : "کوتاه"}).`,
    messageEn: `Content has ${wordCount} words.`,
    severity: wordCount >= 600 ? "success" : "warning",
  });

  // Check 10: Tables (Comparison / Data Tables for GEO)
  checks.push({
    id: "table_presence",
    labelFa: "جدول مقایسه یا جدول داده (الزامی برای GEO و Featured Snippets)",
    labelEn: "Comparison or Data Table (Critical for GEO & Rich Snippets)",
    passed: tableCount > 0,
    score: tableCount > 0 ? 5 : 0,
    maxScore: 5,
    messageFa: tableCount > 0
      ? "جدول اطلاعاتی یا مقایسه‌ای در متن وجود دارد."
      : "پیشنهاد: افزودن یک جدول مقایسه‌ای شانس دریافت Featured Snippet گوگل را تا ۴ برابر افزایش می‌دهد.",
    messageEn: tableCount > 0 ? "Table found in content." : "Add a data table to boost Featured Snippets.",
    severity: tableCount > 0 ? "success" : "warning",
  });

  // Check 11: Internal & External Linking
  const hasLinks = internalLinkCount >= 2;
  checks.push({
    id: "links_presence",
    labelFa: "لینک‌دهی داخلی به محصولات و صفحات فروشگاه",
    labelEn: "Internal links to products and categories",
    passed: hasLinks,
    score: hasLinks ? 5 : internalLinkCount > 0 ? 3 : 0,
    maxScore: 5,
    messageFa: `تعداد ${internalLinkCount} لینک داخلی و ${externalLinkCount} لینک خارجی در متن درج شده است.`,
    messageEn: `Found ${internalLinkCount} internal links and ${externalLinkCount} external links.`,
    severity: hasLinks ? "success" : "warning",
  });

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxPossible = checks.reduce((sum, c) => sum + c.maxScore, 0);
  const scaledScore = Math.min(100, Math.round((totalScore / maxPossible) * 100));

  const rating =
    scaledScore >= 85
      ? "EXCELLENT"
      : scaledScore >= 70
      ? "GOOD"
      : scaledScore >= 50
      ? "FAIR"
      : "POOR";

  return {
    score: scaledScore,
    rating,
    checks,
    stats: {
      wordCount,
      charCount,
      keywordDensity,
      keywordOccurrences: occurrences,
      headingCount,
      internalLinkCount,
      externalLinkCount,
      tableCount,
      faqCount: faqItems.length,
      titleLength: titleLen,
      descriptionLength: descLen,
    },
  };
}
