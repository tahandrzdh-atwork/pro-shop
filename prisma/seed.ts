import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding DigiSub database...");

  // 1. Site Settings
  await prisma.siteSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      usdToTomanRate: 68500,
      siteNameFa: "دیجی‌ساب",
      siteNameEn: "DigiSub",
      heroNoticeFa:
        "تحویل آنی تلگرام پرمیوم، استارز، شماره مجازی و اشتراک‌های هوش مصنوعی با اتصال مستقیم API",
      heroNoticeEn:
        "Instant delivery for Telegram Premium, Stars, Virtual Numbers & AI subscriptions via direct API",
      pointsPer10kToman: 5,
      referralBonusPoints: 100,
    },
  });

  // 2. SMS Provider Configs (Hub)
  const smsProviders = [
    {
      providerKey: "SANDBOX",
      title: "حالت تست لوکال (Sandbox Console)",
      isActive: true,
      senderLine: "3000505",
    },
    {
      providerKey: "MELLIPAYAMAK",
      title: "ملی‌پیامک (MelliPayamak)",
      isActive: false,
      senderLine: "50004001",
    },
    {
      providerKey: "SMSIR",
      title: "اس‌ام‌اس.آی‌آر (SMS.ir v1)",
      isActive: false,
      senderLine: "30007732",
    },
    {
      providerKey: "KAVENEGAR",
      title: "کاوه‌نگار (Kavenegar)",
      isActive: false,
      senderLine: "10004346",
    },
    {
      providerKey: "IPPANEL",
      title: "فراز اس‌ام‌اس / IPPanel",
      isActive: false,
      senderLine: "+983000505",
    },
  ];

  for (const p of smsProviders) {
    await prisma.smsProviderConfig.upsert({
      where: { providerKey: p.providerKey },
      update: {},
      create: p,
    });
  }

  // 3. Loyalty Tiers
  const tiers = [
    {
      key: "BRONZE",
      nameFa: "برنزی",
      nameEn: "Bronze",
      minPoints: 0,
      discountPercent: 0,
      cashbackPercent: 1,
      colorHex: "#cd7f32",
      sortOrder: 1,
    },
    {
      key: "SILVER",
      nameFa: "نقره‌ای",
      nameEn: "Silver",
      minPoints: 300,
      discountPercent: 3,
      cashbackPercent: 2,
      colorHex: "#94a3b8",
      sortOrder: 2,
    },
    {
      key: "GOLD",
      nameFa: "طلایی",
      nameEn: "Gold",
      minPoints: 800,
      discountPercent: 5,
      cashbackPercent: 4,
      colorHex: "#f59e0b",
      sortOrder: 3,
    },
    {
      key: "VIP",
      nameFa: "الماسی (VIP)",
      nameEn: "Diamond VIP",
      minPoints: 1500,
      discountPercent: 8,
      cashbackPercent: 6,
      colorHex: "#8b5cf6",
      sortOrder: 4,
    },
  ];

  for (const t of tiers) {
    await prisma.loyaltyTier.upsert({
      where: { key: t.key },
      update: t,
      create: t,
    });
  }

  // 4. Upstream Mother Servers
  const callinooUpstream = await prisma.upstreamProvider.upsert({
    where: { slug: "callinoo-virtual-numbers" },
    update: {
      apiKey: "1314004723:FZv5lUYEmEDuyjOW78nz6v1NVJ2cbVb7F7Kee0x7xIxD",
      baseUrl: "https://api.ozvinoo.xyz",
      protocol: "OZVINOO_CALLINOO",
      balanceText: "1,000 تومان",
      isActive: true,
      isSandbox: false,
    },
    create: {
      name: "کالینو — سامانه شماره مجازی (Callinoo API)",
      slug: "callinoo-virtual-numbers",
      baseUrl: "https://api.ozvinoo.xyz",
      apiKey: "1314004723:FZv5lUYEmEDuyjOW78nz6v1NVJ2cbVb7F7Kee0x7xIxD",
      protocol: "OZVINOO_CALLINOO",
      balanceText: "1,000 تومان",
      isActive: true,
      isSandbox: false,
      lastSyncAt: new Date(),
    },
  });

  const altivoxUpstream = await prisma.upstreamProvider.upsert({
    where: { slug: "altivox-ai" },
    update: {
      apiKey: "isk_ff27d94a9db4fa3b10bc49e98e5c0ca7b7655776d9ae5dc8",
      baseUrl: "https://api.altivoxai.com/api/v1",
      protocol: "ALTIVOX_AI",
      balanceText: "0 VND",
      isActive: true,
      isSandbox: false,
    },
    create: {
      name: "Altivox AI Partner API",
      slug: "altivox-ai",
      baseUrl: "https://api.altivoxai.com/api/v1",
      apiKey: "isk_ff27d94a9db4fa3b10bc49e98e5c0ca7b7655776d9ae5dc8",
      protocol: "ALTIVOX_AI",
      balanceText: "0 VND",
      isActive: true,
      isSandbox: false,
      lastSyncAt: new Date(),
    },
  });

  const fragmentUpstream = await prisma.upstreamProvider.upsert({
    where: { slug: "fragment-direct-hub" },
    update: {},
    create: {
      name: "Fragment Direct Hub (Telegram API)",
      slug: "fragment-direct-hub",
      baseUrl: "https://api.fragment-partner.example/v1",
      apiKey: "frag_live_sandbox_9918273645",
      protocol: "FRAGMENT_API",
      balanceText: "$1,240.00 (Sandbox)",
      isActive: true,
      isSandbox: true,
      lastSyncAt: new Date(),
    },
  });

  const smmUpstream = await prisma.upstreamProvider.upsert({
    where: { slug: "global-smm-boost-panel" },
    update: {},
    create: {
      name: "Global SMM & Boost Mother Panel",
      slug: "global-smm-boost-panel",
      baseUrl: "https://motherpanel.example/api/v2",
      apiKey: "smm_sandbox_key_7721",
      protocol: "SMM_PANEL",
      balanceText: "$428.50 (Sandbox)",
      isActive: true,
      isSandbox: true,
      lastSyncAt: new Date(),
    },
  });

  // 5. Categories
  const catTelegram = await prisma.category.upsert({
    where: { slug: "telegram" },
    update: {},
    create: {
      slug: "telegram",
      nameFa: "خدمات تلگرام",
      nameEn: "Telegram Services",
      descriptionFa: "تلگرام پرمیوم، استارز و بوست کانال با تحویل فوری",
      descriptionEn: "Telegram Premium, Stars & Channel Boosts with instant API delivery",
      icon: "Send",
      sortOrder: 1,
    },
  });

  const catVirtualNumber = await prisma.category.upsert({
    where: { slug: "virtual-numbers" },
    update: {},
    create: {
      slug: "virtual-numbers",
      nameFa: "شماره مجازی",
      nameEn: "Virtual Numbers",
      descriptionFa: "خرید شماره مجازی تلگرام و اپلیکیشن‌ها با تحویل فوری کد پیامک",
      descriptionEn: "Instant Telegram & app virtual numbers with real-time SMS codes",
      icon: "PhoneCall",
      sortOrder: 2,
    },
  });

  const catAi = await prisma.category.upsert({
    where: { slug: "ai" },
    update: {},
    create: {
      slug: "ai",
      nameFa: "هوش مصنوعی",
      nameEn: "AI Subscriptions",
      descriptionFa: "اشتراک‌های ChatGPT Plus، Claude Pro و Gemini Pro",
      descriptionEn: "ChatGPT Plus, Claude Pro & Gemini Pro developer accounts",
      icon: "Bot",
      sortOrder: 3,
    },
  });

  const catStreaming = await prisma.category.upsert({
    where: { slug: "streaming" },
    update: {},
    create: {
      slug: "streaming",
      nameFa: "موزیک و استریم",
      nameEn: "Music & Streaming",
      descriptionFa: "اسپاتیفای پرمیوم، نتفلیکس 4K و یوتیوب پرمیوم",
      descriptionEn: "Spotify Premium, Netflix 4K & YouTube Premium",
      icon: "Music",
      sortOrder: 4,
    },
  });

  // 6. Ensure Virtual Numbers & Altivox Gemini Pro products exist
  const existingVirt = await prisma.product.findUnique({
    where: { slug: "telegram-virtual-number" },
  });
  if (!existingVirt) {
    await prisma.product.create({
      data: {
        slug: "telegram-virtual-number",
        categoryId: catVirtualNumber.id,
        titleFa: "شماره مجازی تلگرام (دریافت آنی کد پیامک)",
        titleEn: "Telegram Virtual Number (Instant SMS OTP)",
        shortDescFa: "شماره اختصاصی برای ساخت و تایید اکانت تلگرام با دریافت آنی پیامک کد ورود",
        shortDescEn: "Dedicated phone number for Telegram activation with instant SMS code delivery",
        descriptionFa:
          "شماره مجازی معتبر بین‌المللی متصل مستقیم به وب‌سرویس کالینو. بلافاصله پس از پرداخت، شماره در پنل شما فعال می‌شود و به مدت ۲۰ دقیقه منتظر دریافت پیامک کد تایید می‌ماند. در صورت عدم دریافت کد، مبلغ کامل به کیف پول شما بازگردانده می‌شود.",
        descriptionEn:
          "Official virtual number directly integrated with Callinoo API. Number is assigned immediately with live SMS code reception and instant auto-refund guarantee.",
        guideFa:
          "۱. پس از خرید، شماره را کپی کرده و در اپلیکیشن تلگرام وارد کنید.\n۲. دکمه «دریافت کد پیامک» را در سفارش‌های من بزنید تا کد ورود استخراج و نمایش داده شود.\n۳. تا زمان دریافت کد پیامک، امکان لغو و بازگشت کامل وجه وجود دارد.",
        guideEn:
          "1. Copy the assigned number and enter it into Telegram.\n2. Click 'Check SMS Code' in your orders dashboard.\n3. Zero risk: cancel anytime before receiving the code for a full refund.",
        deliveryType: "UPSTREAM_API",
        badgeFa: "کالینو API",
        badgeEn: "Callinoo API",
        accentColor: "#3b82f6",
        isFeatured: true,
        salesCount: 520,
        inputFieldsJson: JSON.stringify([
          {
            key: "country",
            labelFa: "پیش‌شماره یا نام کشور",
            labelEn: "Country Range or Name",
            placeholderFa: "مثال: 48 یا لهستان",
            placeholderEn: "e.g. 48 or Poland",
            required: true,
          },
        ]),
        plans: {
          create: [
            {
              titleFa: "لهستان 🇵🇱 (پیش‌شماره ۴۸)",
              titleEn: "Poland 🇵🇱 (+48)",
              durationDays: 1,
              priceToman: 68000,
              pointsReward: 10,
              upstreamProviderId: callinooUpstream.id,
              upstreamServiceId: "1",
              sortOrder: 1,
            },
            {
              titleFa: "کلمبیا 🇨🇴 (پیش‌شماره ۵۷)",
              titleEn: "Colombia 🇨🇴 (+57)",
              durationDays: 1,
              priceToman: 75000,
              pointsReward: 12,
              upstreamProviderId: callinooUpstream.id,
              upstreamServiceId: "1",
              sortOrder: 2,
            },
            {
              titleFa: "بنگلادش 🇧🇩 (پیش‌شماره ۸۸۰)",
              titleEn: "Bangladesh 🇧🇩 (+880)",
              durationDays: 1,
              priceToman: 85000,
              pointsReward: 15,
              upstreamProviderId: callinooUpstream.id,
              upstreamServiceId: "1",
              sortOrder: 3,
            },
            {
              titleFa: "فیلیپین 🇵🇭 (پیش‌شماره ۶۳)",
              titleEn: "Philippines 🇵🇭 (+63)",
              durationDays: 1,
              priceToman: 55000,
              pointsReward: 8,
              upstreamProviderId: callinooUpstream.id,
              upstreamServiceId: "1",
              sortOrder: 4,
            },
            {
              titleFa: "انگلستان 🇬🇧 (پیش‌شماره ۴۴)",
              titleEn: "United Kingdom 🇬🇧 (+44)",
              durationDays: 1,
              priceToman: 95000,
              pointsReward: 18,
              upstreamProviderId: callinooUpstream.id,
              upstreamServiceId: "1",
              sortOrder: 5,
            },
          ],
        },
      },
    });
  }

  const existingAlti = await prisma.product.findUnique({
    where: { slug: "gemini-pro-18m" },
  });
  if (!existingAlti) {
    await prisma.product.create({
      data: {
        slug: "gemini-pro-18m",
        categoryId: catAi.id,
        titleFa: "اشتراک Gemini Pro (۱۸ ماهه اختصاصی)",
        titleEn: "Gemini Pro 18 Months Subscription",
        shortDescFa: "دسترسی پیشرفته به مدل‌های برتر گوگل با فعال‌سازی از سورس Altivox",
        shortDescEn: "Advanced Google Gemini Pro 18-month plan via Altivox Partner API",
        descriptionFa:
          "اکانت و دسترسی ۱۸ ماهه به قابلیت‌های ویژه هوش مصنوعی Gemini Pro گوگل متصل به درگاه سورس بین‌المللی Altivox با فعال‌سازی مطمئن و تضمین دوره.",
        descriptionEn:
          "18-month dedicated subscription for Google Gemini Pro powered by Altivox AI Internal Source.",
        guideFa: "سفارش شما بلافاصله پس از پرداخت به API ارسال شده و فعال‌سازی انجام می‌گردد.",
        guideEn: "Order dispatches to the upstream API instantly upon checkout.",
        deliveryType: "UPSTREAM_API",
        badgeFa: "Altivox AI",
        badgeEn: "Altivox API",
        accentColor: "#4f46e5",
        isFeatured: true,
        salesCount: 182,
        inputFieldsJson: JSON.stringify([
          {
            key: "email",
            labelFa: "ایمیل جیمیل کاربر",
            labelEn: "Customer Gmail Address",
            placeholderFa: "yourname@gmail.com",
            placeholderEn: "yourname@gmail.com",
            required: false,
          },
        ]),
        plans: {
          create: [
            {
              titleFa: "اشتراک ۱۸ ماهه Gemini Pro",
              titleEn: "18 Months Gemini Pro",
              durationDays: 540,
              priceToman: 790000,
              priceUsd: 11.5,
              useUsdRate: true,
              pointsReward: 120,
              upstreamProviderId: altivoxUpstream.id,
              upstreamServiceId: "cmw6cvyfl1kjtcav04k64m906",
              sortOrder: 1,
            },
          ],
        },
      },
    });
  }

  // 7. Demo Users
  const adminUser = await prisma.user.upsert({
    where: { phone: "09120000001" },
    update: {},
    create: {
      phone: "09120000001",
      name: "طه نادرزاده (ادمین)",
      email: "tahandrzdh.official@gmail.com",
      role: "ADMIN",
      walletBalance: 5000000,
      loyaltyPoints: 1850,
      totalSpent: 12400000,
      referralCode: "DSADMIN1",
      tagsJson: JSON.stringify(["ادمین", "VIP"]),
      lastPurchaseAt: new Date(),
    },
  });

  const vipUser = await prisma.user.upsert({
    where: { phone: "09121112233" },
    update: {},
    create: {
      phone: "09121112233",
      name: "سارا محمدی",
      email: "sara@example.com",
      role: "USER",
      walletBalance: 1450000,
      loyaltyPoints: 1620,
      totalSpent: 8650000,
      referralCode: "DSSARA22",
      tagsJson: JSON.stringify(["VIP", "خریدار AI", "خریدار پرمیوم"]),
      lastPurchaseAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // 8. Coupons
  await prisma.coupon.upsert({
    where: { code: "WELCOME15" },
    update: {},
    create: {
      code: "WELCOME15",
      discountType: "PERCENT",
      value: 15,
      minOrderToman: 200000,
      maxUses: 500,
      usedCount: 24,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "VIP50K" },
    update: {},
    create: {
      code: "VIP50K",
      discountType: "FIXED",
      value: 50000,
      minOrderToman: 500000,
      maxUses: 200,
      usedCount: 7,
      isActive: true,
    },
  });

  console.log("Seed completed successfully with Callinoo & Altivox AI providers!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
