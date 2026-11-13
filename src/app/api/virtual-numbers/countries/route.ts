import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const provider = await prisma.upstreamProvider.findFirst({
    where: { protocol: "OZVINOO_CALLINOO", isActive: true },
  });

  if (!provider) {
    // Fallback popular countries list
    return NextResponse.json({
      countries: [
        { country: "لهستان 🇵🇱", price: 68000, range: 48, emoji: "🇵🇱", count: "✅ موجود" },
        { country: "کلمبیا 🇨🇴", price: 75000, range: 57, emoji: "🇨🇴", count: "✅ موجود" },
        { country: "بنگلادش 🇧🇩", price: 85000, range: 880, emoji: "🇧🇩", count: "✅ موجود" },
        { country: "فیلیپین 🇵🇭", price: 55000, range: 63, emoji: "🇵🇭", count: "✅ موجود" },
        { country: "برزیل 🇧🇷", price: 79000, range: 55, emoji: "🇧🇷", count: "✅ موجود" },
        { country: "انگلستان 🇬🇧", price: 95000, range: 44, emoji: "🇬🇧", count: "✅ موجود" },
        { country: "آمریکا 🇺🇸", price: 110000, range: 1, emoji: "🇺🇸", count: "✅ موجود" },
      ],
    });
  }

  try {
    const url = `${provider.baseUrl.replace(/\/$/, "")}/web/${provider.apiKey}/get-prices/1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (DigiSub)" },
      next: { revalidate: 300 }, // cache 5 min
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      // Filter out out-of-stock items or show them last
      const sorted = [...data].sort((a, b) => {
        const aAvail = a.count?.includes("موجود") && !a.count?.includes("ناموجود");
        const bAvail = b.count?.includes("موجود") && !b.count?.includes("ناموجود");
        if (aAvail && !bAvail) return -1;
        if (!aAvail && bAvail) return 1;
        return (a.price ?? 0) - (b.price ?? 0);
      });
      return NextResponse.json({ countries: sorted });
    }
  } catch (err) {
    console.error("Callinoo get-prices error:", err);
  }

  return NextResponse.json({
    countries: [
      { country: "لهستان 🇵🇱", price: 68000, range: 48, emoji: "🇵🇱", count: "✅ موجود" },
      { country: "کلمبیا 🇨🇴", price: 75000, range: 57, emoji: "🇨🇴", count: "✅ موجود" },
      { country: "بنگلادش 🇧🇩", price: 85000, range: 880, emoji: "🇧🇩", count: "✅ موجود" },
      { country: "فیلیپین 🇵🇭", price: 55000, range: 63, emoji: "🇵🇭", count: "✅ موجود" },
    ],
  });
}
