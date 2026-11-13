import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Vazirmatn, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser, getUserTier } from "@/lib/auth";
import { isRtl, Locale } from "@/lib/i18n";
import { AppProvider } from "@/components/AppProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { prisma } from "@/lib/prisma";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DigiSub | دیجی‌ساب - فروشگاه اشتراک‌های دیجیتال و سرویس‌های AI",
  description:
    "پلتفرم فروشگاهی اشتراک‌های خارجی، تلگرام پرمیوم، استارز، بوست و اکانت‌های هوش مصنوعی با تحویل خودکار API، باشگاه مشتریان و CRM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("digisub_locale")?.value;
  const locale: Locale = localeCookie === "en" ? "en" : "fa";

  const [rawUser, settings] = await Promise.all([
    getCurrentUser(),
    prisma.siteSetting.findUnique({ where: { id: "default" } }).catch(() => null),
  ]);
  const tier = rawUser ? await getUserTier(rawUser.loyaltyPoints) : null;
  const initialUser = rawUser
    ? {
        ...rawUser,
        tier: tier
          ? {
              key: tier.key,
              nameFa: tier.nameFa,
              nameEn: tier.nameEn,
              discountPercent: tier.discountPercent,
              cashbackPercent: tier.cashbackPercent,
              colorHex: tier.colorHex,
            }
          : null,
      }
    : null;

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${vazirmatn.variable} ${jakarta.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=document.querySelector('meta[name="color-scheme"]');if(m){m.content=localStorage.getItem("color-scheme")??"light dark";}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProvider initialLocale={locale} initialUser={initialUser}>
          <AnnouncementBar
            active={settings?.announcementActive}
            textFa={settings?.announcementTextFa}
            textEn={settings?.announcementTextEn}
            link={settings?.announcementLink}
          />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </AppProvider>
      </body>
    </html>
  );
}
