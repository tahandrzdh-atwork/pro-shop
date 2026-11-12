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
        "تحویل آنی تلگرام پرمیوم، استارز و اشتراک‌های هوش مصنوعی با اتصال مستقیم API",
      heroNoticeEn:
        "Instant delivery for Telegram Premium, Stars & AI subscriptions via direct API",
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

  const catAi = await prisma.category.upsert({
    where: { slug: "ai" },
    update: {},
    create: {
      slug: "ai",
      nameFa: "هوش مصنوعی",
      nameEn: "AI Subscriptions",
      descriptionFa: "اشتراک‌های ChatGPT Plus، Claude Pro و Cursor Pro",
      descriptionEn: "ChatGPT Plus, Claude Pro & Cursor Pro developer accounts",
      icon: "Bot",
      sortOrder: 2,
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
      sortOrder: 3,
    },
  });

  // 6. Products & Plans & Vault
  const existingProducts = await prisma.product.count();
  if (existingProducts === 0) {
    // Product 1: Telegram Premium (Upstream API)
    await prisma.product.create({
      data: {
        slug: "telegram-premium",
        categoryId: catTelegram.id,
        titleFa: "تلگرام پرمیوم (تحویل آنی بدون لاگین)",
        titleEn: "Telegram Premium (Instant Gift API)",
        shortDescFa: "فعال‌سازی رسمی و قانونی روی آیدی بدون نیاز به رمز و لاگین",
        shortDescEn: "Official activation via username without login credentials",
        descriptionFa:
          "اشتراک رسمی تلگرام پرمیوم از طریق درگاه مستقیم Fragment روی آیدی تلگرام شما فعال می‌شود. بدون نیاز به دسترسی به اکانت، کاملاً آنی و همراه با گارانتی کامل.",
        descriptionEn:
          "Official Telegram Premium subscription gifted directly to your username via Fragment API. Zero account access required, instant delivery, full warranty.",
        guideFa:
          "۱. آیدی تلگرام خود را بدون علامت @ وارد کنید.\n۲. مطمئن شوید اکانت شما دارای Username عمومی است.\n۳. بلافاصله پس از پرداخت، سفارش به سرور مادر ارسال و فعال می‌شود.",
        guideEn:
          "1. Enter your Telegram username without @.\n2. Ensure your account has an active public username.\n3. Activation triggers automatically via upstream API right after checkout.",
        deliveryType: "UPSTREAM_API",
        badgeFa: "تکمیل خودکار API",
        badgeEn: "Auto API",
        accentColor: "#0ea5e9",
        isFeatured: true,
        salesCount: 418,
        inputFieldsJson: JSON.stringify([
          {
            key: "telegramUsername",
            labelFa: "آیدی تلگرام (بدون @)",
            labelEn: "Telegram Username (without @)",
            placeholderFa: "مثال: ali_developer",
            placeholderEn: "e.g. ali_developer",
            required: true,
          },
        ]),
        plans: {
          create: [
            {
              titleFa: "اشتراک ۳ ماهه پرمیوم",
              titleEn: "3 Months Premium",
              durationDays: 90,
              priceToman: 890000,
              priceUsd: 13.0,
              useUsdRate: true,
              pointsReward: 60,
              upstreamProviderId: fragmentUpstream.id,
              upstreamServiceId: "tg_prem_3m",
              upstreamQuantity: 1,
              sortOrder: 1,
            },
            {
              titleFa: "اشتراک ۶ ماهه پرمیوم",
              titleEn: "6 Months Premium",
              durationDays: 180,
              priceToman: 1350000,
              priceUsd: 19.5,
              useUsdRate: true,
              pointsReward: 110,
              upstreamProviderId: fragmentUpstream.id,
              upstreamServiceId: "tg_prem_6m",
              upstreamQuantity: 1,
              sortOrder: 2,
            },
            {
              titleFa: "اشتراک ۱۲ ماهه پرمیوم",
              titleEn: "12 Months Premium",
              durationDays: 365,
              priceToman: 2390000,
              priceUsd: 34.5,
              useUsdRate: true,
              pointsReward: 220,
              upstreamProviderId: fragmentUpstream.id,
              upstreamServiceId: "tg_prem_12m",
              upstreamQuantity: 1,
              sortOrder: 3,
            },
          ],
        },
      },
    });

    // Product 2: Telegram Stars (Upstream API)
    await prisma.product.create({
      data: {
        slug: "telegram-stars",
        categoryId: catTelegram.id,
        titleFa: "تلگرام استارز (Telegram Stars)",
        titleEn: "Telegram Stars (Instant Top-up)",
        shortDescFa: "شارژ آنی ستاره تلگرام برای ربات‌ها، مینی‌اپ‌ها و گیفت‌ها",
        shortDescEn: "Instant Telegram Stars delivery for bots, mini-apps & gifts",
        descriptionFa:
          "خرید تلگرام استارز با کمترین کارمزد و تحویل لحظه‌ای روی آیدی تلگرام شما توسط موتور خودکار API.",
        descriptionEn:
          "Purchase Telegram Stars at competitive rates with instant delivery directly to your Telegram handle.",
        guideFa: "فقط آیدی تلگرام خود را وارد کنید؛ استارز ظرف چند ثانیه واریز می‌شود.",
        guideEn: "Provide your Telegram username; Stars arrive within seconds.",
        deliveryType: "UPSTREAM_API",
        badgeFa: "تحویل آنی",
        badgeEn: "Instant",
        accentColor: "#f59e0b",
        isFeatured: true,
        salesCount: 625,
        inputFieldsJson: JSON.stringify([
          {
            key: "telegramUsername",
            labelFa: "آیدی تلگرام دریافت‌کننده",
            labelEn: "Recipient Telegram Username",
            placeholderFa: "مثال: sara_design",
            placeholderEn: "e.g. sara_design",
            required: true,
          },
        ]),
        plans: {
          create: [
            {
              titleFa: "۱۰۰ استارز تلگرام",
              titleEn: "100 Telegram Stars",
              priceToman: 165000,
              priceUsd: 2.4,
              useUsdRate: true,
              pointsReward: 15,
              upstreamProviderId: fragmentUpstream.id,
              upstreamServiceId: "tg_stars_100",
              upstreamQuantity: 100,
              sortOrder: 1,
            },
            {
              titleFa: "۵۰۰ استارز تلگرام",
              titleEn: "500 Telegram Stars",
              priceToman: 740000,
              priceUsd: 10.8,
              useUsdRate: true,
              pointsReward: 55,
              upstreamProviderId: fragmentUpstream.id,
              upstreamServiceId: "tg_stars_500",
              upstreamQuantity: 500,
              sortOrder: 2,
            },
            {
              titleFa: "۱۰۰۰ استارز تلگرام",
              titleEn: "1,000 Telegram Stars",
              priceToman: 1420000,
              priceUsd: 20.5,
              useUsdRate: true,
              pointsReward: 120,
              upstreamProviderId: fragmentUpstream.id,
              upstreamServiceId: "tg_stars_1000",
              upstreamQuantity: 1000,
              sortOrder: 3,
            },
          ],
        },
      },
    });

    // Product 3: Telegram Channel Boost (Upstream SMM API)
    await prisma.product.create({
      data: {
        slug: "telegram-boost",
        categoryId: catTelegram.id,
        titleFa: "بوست کانال تلگرام (Telegram Boost)",
        titleEn: "Telegram Channel Boost",
        shortDescFa: "افزایش لول کانال، فعال‌سازی استوری و ایموجی‌های اختصاصی",
        shortDescEn: "Unlock channel stories, custom reactions and higher levels",
        descriptionFa:
          "بوست کانال تلگرام با سرورهای پرسرعت و بدون ریزش، متصل به پنل مادر برای شروع خودکار بلافاصله بعد از پرداخت.",
        descriptionEn:
          "High-retention Telegram Channel Boosts connected directly to our upstream fulfillment panel.",
        guideFa: "لینک بوست کانال (https://t.me/boost/yourchannel) را وارد کنید.",
        guideEn: "Paste your channel boost link (https://t.me/boost/yourchannel).",
        deliveryType: "UPSTREAM_API",
        badgeFa: "سرور مادر API",
        badgeEn: "Upstream API",
        accentColor: "#ec4899",
        isFeatured: false,
        salesCount: 194,
        inputFieldsJson: JSON.stringify([
          {
            key: "targetUrl",
            labelFa: "لینک بوست کانال",
            labelEn: "Channel Boost Link",
            placeholderFa: "https://t.me/boost/channel",
            placeholderEn: "https://t.me/boost/channel",
            required: true,
          },
        ]),
        plans: {
          create: [
            {
              titleFa: "۱۰ بوست (۱ ماهه)",
              titleEn: "10 Boosts (30 Days)",
              durationDays: 30,
              priceToman: 320000,
              pointsReward: 25,
              upstreamProviderId: smmUpstream.id,
              upstreamServiceId: "401",
              upstreamQuantity: 10,
              sortOrder: 1,
            },
            {
              titleFa: "۲۵ بوست (۱ ماهه)",
              titleEn: "25 Boosts (30 Days)",
              durationDays: 30,
              priceToman: 740000,
              pointsReward: 60,
              upstreamProviderId: smmUpstream.id,
              upstreamServiceId: "402",
              upstreamQuantity: 25,
              sortOrder: 2,
            },
          ],
        },
      },
    });

    // Product 4: ChatGPT Plus (Vault Instant Delivery)
    const chatgpt = await prisma.product.create({
      data: {
        slug: "chatgpt-plus",
        categoryId: catAi.id,
        titleFa: "اکانت اختصاصی ChatGPT Plus",
        titleEn: "ChatGPT Plus Dedicated Account",
        shortDescFa: "دسترسی کامل به مدل‌های GPT-4o / o1 با تحویل آنی از انبار امن",
        shortDescEn: "Full GPT-4o / o1 access with instant encrypted vault delivery",
        descriptionFa:
          "اکانت کاملاً اختصاصی ChatGPT Plus با ایمیل و رمز قابل تغییر. مشخصات ورود بلافاصله بعد از پرداخت در پنل کاربری شما آزاد می‌شود.",
        descriptionEn:
          "Private ChatGPT Plus account with full email access. Credentials are released immediately in your user panel upon checkout.",
        guideFa:
          "پس از پرداخت وارد بخش «سفارش‌های من» شوید و مشخصات ایمیل و رمز اکانت را کپی کنید.",
        guideEn:
          "Open 'My Orders' after payment to copy your account credentials securely.",
        deliveryType: "VAULT",
        badgeFa: "تحویل آنی انبار",
        badgeEn: "Instant Vault",
        accentColor: "#10b981",
        isFeatured: true,
        salesCount: 389,
        inputFieldsJson: JSON.stringify([]),
        plans: {
          create: [
            {
              titleFa: "اشتراک ۱ ماهه اختصاصی",
              titleEn: "1 Month Private Account",
              durationDays: 30,
              priceToman: 1450000,
              priceUsd: 21.0,
              useUsdRate: true,
              pointsReward: 100,
              sortOrder: 1,
            },
            {
              titleFa: "اشتراک ۳ ماهه اختصاصی",
              titleEn: "3 Months Private Account",
              durationDays: 90,
              priceToman: 4100000,
              priceUsd: 59.5,
              useUsdRate: true,
              pointsReward: 280,
              sortOrder: 2,
            },
          ],
        },
      },
      include: { plans: true },
    });

    // Seed Vault credentials for ChatGPT Plus
    await prisma.digitalVaultItem.createMany({
      data: [
        {
          planId: chatgpt.plans[0].id,
          secretPayload: "Email: gpt.pro.101@digisub.mail | Pass: Dg$9921Ax! | 2FA: Ready",
          note: "Batch #1 - Private",
        },
        {
          planId: chatgpt.plans[0].id,
          secretPayload: "Email: gpt.pro.102@digisub.mail | Pass: Dg$4418Kz! | 2FA: Ready",
          note: "Batch #1 - Private",
        },
        {
          planId: chatgpt.plans[1].id,
          secretPayload: "Email: gpt.qtr.201@digisub.mail | Pass: Dg$7781Qm! | 2FA: Ready",
          note: "3-Month Batch",
        },
      ],
    });

    // Product 5: Claude Pro (Vault Instant Delivery)
    const claude = await prisma.product.create({
      data: {
        slug: "claude-pro",
        categoryId: catAi.id,
        titleFa: "اشتراک Claude Pro (Anthropic)",
        titleEn: "Claude Pro Subscription",
        shortDescFa: "اکانت اختصاصی Claude Pro برای برنامه‌نویسان و تولید محتوا",
        shortDescEn: "Dedicated Claude Pro account for coding, writing & deep analysis",
        descriptionFa:
          "دسترسی نامحدودتر به مدل‌های پیشرفته Claude Sonnet و Opus همراه با پروژه‌ها و آرتیفکت‌ها، تحویل آنی و ضمانت تمام مدت.",
        descriptionEn:
          "Priority access to Claude models, Projects, and Artifacts with instant vault delivery.",
        guideFa: "اطلاعات لاگین بلافاصله پس از تکمیل پرداخت در پنل شما نمایش داده می‌شود.",
        guideEn: "Credentials appear instantly in your dashboard upon payment.",
        deliveryType: "VAULT",
        badgeFa: "مخصوص برنامه‌نویسان",
        badgeEn: "Dev Favorite",
        accentColor: "#f97316",
        isFeatured: true,
        salesCount: 247,
        inputFieldsJson: JSON.stringify([]),
        plans: {
          create: [
            {
              titleFa: "اشتراک ۱ ماهه Claude Pro",
              titleEn: "1 Month Claude Pro",
              durationDays: 30,
              priceToman: 1490000,
              priceUsd: 21.5,
              useUsdRate: true,
              pointsReward: 105,
              sortOrder: 1,
            },
          ],
        },
      },
      include: { plans: true },
    });

    await prisma.digitalVaultItem.createMany({
      data: [
        {
          planId: claude.plans[0].id,
          secretPayload: "Email: claude.dev.01@digisub.mail | Pass: Cl$8832Mn! | Region: US",
          note: "Claude Batch #1",
        },
        {
          planId: claude.plans[0].id,
          secretPayload: "Email: claude.dev.02@digisub.mail | Pass: Cl$5510Xp! | Region: US",
          note: "Claude Batch #1",
        },
      ],
    });

    // Product 6: Spotify Premium (Manual Concierge)
    await prisma.product.create({
      data: {
        slug: "spotify-premium",
        categoryId: catStreaming.id,
        titleFa: "اسپاتیفای پرمیوم (روی اکانت شخصی)",
        titleEn: "Spotify Premium (Personal Account)",
        shortDescFa: "فعال‌سازی قانونی پلن Individual روی ایمیل فعلی شما بدون حذف پلی‌لیست",
        shortDescEn: "Official Individual upgrade on your existing email keeping all playlists",
        descriptionFa:
          "اکانت شخصی اسپاتیفای شما بدون از دست رفتن پلی‌لیست‌ها به نسخه پرمیوم ارتقا پیدا می‌کند. کیفیت صدای بالا و دانلود آفلاین نامحدود.",
        descriptionEn:
          "Upgrade your personal Spotify account to Premium while preserving all playlists and saved tracks.",
        guideFa: "ایمیل اکانت اسپاتیفای خود را وارد کنید تا لینک دعوت خانواده/فعال‌سازی ارسال شود.",
        guideEn: "Provide your Spotify account email for official activation.",
        deliveryType: "MANUAL",
        badgeFa: "روی اکانت شخصی",
        badgeEn: "Personal Upgrade",
        accentColor: "#22c55e",
        isFeatured: true,
        salesCount: 312,
        inputFieldsJson: JSON.stringify([
          {
            key: "email",
            labelFa: "ایمیل اکانت اسپاتیفای",
            labelEn: "Spotify Account Email",
            placeholderFa: "name@example.com",
            placeholderEn: "name@example.com",
            required: true,
          },
        ]),
        plans: {
          create: [
            {
              titleFa: "اشتراک ۱ ماهه",
              titleEn: "1 Month Individual",
              durationDays: 30,
              priceToman: 245000,
              pointsReward: 20,
              sortOrder: 1,
            },
            {
              titleFa: "اشتراک ۳ ماهه",
              titleEn: "3 Months Individual",
              durationDays: 90,
              priceToman: 680000,
              pointsReward: 55,
              sortOrder: 2,
            },
            {
              titleFa: "اشتراک ۱۲ ماهه",
              titleEn: "12 Months Individual",
              durationDays: 365,
              priceToman: 2290000,
              pointsReward: 190,
              sortOrder: 3,
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
      name: "امیرحسین رضایی (ادمین)",
      email: "admin@digisub.ir",
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

  const expiringUser = await prisma.user.upsert({
    where: { phone: "09197778899" },
    update: {},
    create: {
      phone: "09197778899",
      name: "نیما حسینی",
      email: "nima@example.com",
      role: "USER",
      walletBalance: 320000,
      loyaltyPoints: 420,
      totalSpent: 2150000,
      referralCode: "DSNIMA88",
      referredById: vipUser.id,
      tagsJson: JSON.stringify(["تلگرام پرمیوم", "در آستانه تمدید"]),
      lastPurchaseAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
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

  // 9. Sample Orders, CRM Notes & Tickets (idempotent check)
  const existingOrders = await prisma.order.count();
  if (existingOrders === 0) {
    const firstPlan = await prisma.productPlan.findFirst({
      include: { product: true },
    });

    if (firstPlan) {
      const sampleOrder1 = await prisma.order.create({
        data: {
          orderNumber: "DS-10421",
          userId: vipUser.id,
          status: "COMPLETED",
          paymentMethod: "WALLET",
          paymentStatus: "PAID",
          subtotalToman: 1450000,
          tierDiscountToman: 116000,
          totalToman: 1334000,
          pointsEarned: 100,
          gatewayRef: "WLT-88412",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          items: {
            create: {
              planId: firstPlan.id,
              productTitleFa: firstPlan.product.titleFa,
              productTitleEn: firstPlan.product.titleEn,
              planTitleFa: firstPlan.titleFa,
              planTitleEn: firstPlan.titleEn,
              quantity: 1,
              unitPriceToman: 1450000,
              totalPriceToman: 1450000,
              deliveryType: firstPlan.product.deliveryType,
              customerInputsJson: JSON.stringify({ telegramUsername: "sara_design" }),
              deliveredSecret:
                "Activated automatically for sara_design via Fragment Direct Hub (#UP-994120)",
              fulfillmentStatus: "DELIVERED",
              upstreamOrderId: "UP-994120",
              expiresAt: new Date(Date.now() + 87 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });

      // Expiring soon order for CRM reminder demonstration
      await prisma.order.create({
        data: {
          orderNumber: "DS-10388",
          userId: expiringUser.id,
          status: "COMPLETED",
          paymentMethod: "GATEWAY",
          paymentStatus: "PAID",
          subtotalToman: 890000,
          totalToman: 890000,
          pointsEarned: 60,
          gatewayRef: "ZP-773190",
          createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
          items: {
            create: {
              planId: firstPlan.id,
              productTitleFa: firstPlan.product.titleFa,
              productTitleEn: firstPlan.product.titleEn,
              planTitleFa: firstPlan.titleFa,
              planTitleEn: firstPlan.titleEn,
              quantity: 1,
              unitPriceToman: 890000,
              totalPriceToman: 890000,
              deliveryType: firstPlan.product.deliveryType,
              customerInputsJson: JSON.stringify({ telegramUsername: "nima_h" }),
              deliveredSecret:
                "Activated automatically for nima_h via Fragment Direct Hub (#UP-882011)",
              fulfillmentStatus: "DELIVERED",
              upstreamOrderId: "UP-882011",
              expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });

      await prisma.walletTransaction.createMany({
        data: [
          {
            userId: vipUser.id,
            amount: 2800000,
            type: "DEPOSIT",
            descriptionFa: "شارژ کیف پول از طریق درگاه آنلاین",
            descriptionEn: "Wallet top-up via online payment gateway",
          },
          {
            userId: vipUser.id,
            amount: -1334000,
            type: "PURCHASE",
            descriptionFa: `پرداخت سفارش ${sampleOrder1.orderNumber}`,
            descriptionEn: `Payment for order ${sampleOrder1.orderNumber}`,
            referenceId: sampleOrder1.id,
          },
          {
            userId: vipUser.id,
            amount: 80040,
            type: "CASHBACK",
            descriptionFa: "کش‌بک سطح الماسی (۶٪) بابت سفارش DS-10421",
            descriptionEn: "Diamond VIP Cashback (6%) for order DS-10421",
            referenceId: sampleOrder1.id,
          },
        ],
      });

      await prisma.crmNote.create({
        data: {
          userId: vipUser.id,
          authorId: adminUser.id,
          content: "مشتری وفادار و خریدار همیشگی ابزارهای هوش مصنوعی؛ پیشنهاد تخفیف تمدید ارسال شود.",
        },
      });

      await prisma.ticket.create({
        data: {
          ticketNumber: "TK-4012",
          userId: vipUser.id,
          orderId: sampleOrder1.id,
          subject: "سوال درباره تمدید خودکار پلن ChatGPT Plus",
          category: "ORDER",
          priority: "NORMAL",
          status: "ANSWERED",
          messages: {
            create: [
              {
                senderId: vipUser.id,
                isAdmin: false,
                body: "سلام، می‌خواستم بپرسم برای ماه بعد همین اکانت تمدید می‌شه یا اکانت جدید تحویل می‌دید؟",
              },
              {
                senderId: adminUser.id,
                isAdmin: true,
                body: "سلام سارا خانم عزیز! بله با ثبت سفارش روی همین ایمیل می‌تونیم اشتراک شما رو بدون تغییر داده‌ها تمدید کنیم.",
              },
            ],
          },
        },
      });

      await prisma.upstreamApiLog.create({
        data: {
          providerId: fragmentUpstream.id,
          action: "SUBMIT_ORDER",
          requestPayload: JSON.stringify({
            serviceId: "tg_prem_3m",
            recipient: "sara_design",
            quantity: 1,
          }),
          responseBody: JSON.stringify({
            ok: true,
            order: "UP-994120",
            status: "Completed",
          }),
          httpStatus: 200,
          success: true,
          durationMs: 145,
        },
      });
    }
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
