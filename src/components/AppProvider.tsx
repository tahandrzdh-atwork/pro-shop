"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dictionary, getDictionary, Locale } from "@/lib/i18n";

export interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: string;
  walletBalance: number;
  loyaltyPoints: number;
  totalSpent: number;
  referralCode: string;
  preferredLocale: string;
  unreadNotifications?: number;
  tier?: {
    key: string;
    nameFa: string;
    nameEn: string;
    discountPercent: number;
    cashbackPercent: number;
    colorHex: string;
  } | null;
}

export interface CartItem {
  id: string;
  planId: string;
  productId: string;
  productSlug: string;
  productTitleFa: string;
  productTitleEn: string;
  planTitleFa: string;
  planTitleEn: string;
  unitPriceToman: number;
  pointsReward: number;
  deliveryType: string;
  quantity: number;
  customerInputs: Record<string, string>;
}

interface AppContextValue {
  locale: Locale;
  t: Dictionary;
  switchLocale: (next: Locale) => Promise<void>;
  user: AuthUser | null;
  loadingUser: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  updateCartQty: (id: string, qty: number) => void;
  clearCart: () => void;
  colorScheme: "light dark" | "light" | "dark";
  toggleColorScheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const CART_STORAGE_KEY = "digisub_cart_v1";

export function AppProvider({
  initialLocale,
  initialUser,
  children,
}: {
  initialLocale: Locale;
  initialUser: AuthUser | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loadingUser, setLoadingUser] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [colorScheme, setColorScheme] = useState<"light dark" | "light" | "dark">("light dark");

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      const savedTheme = localStorage.getItem("color-scheme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setColorScheme(savedTheme);
      }
    } catch {
      // ignore storage access issues
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "color-scheme") {
        const next = e.newValue === "light" || e.newValue === "dark" ? e.newValue : "light dark";
        setColorScheme(next);
        const meta = document.querySelector('meta[name="color-scheme"]');
        if (meta) meta.setAttribute("content", next);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const persistCart = useCallback((next: CartItem[]) => {
    setCart(next);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const addToCart = useCallback(
    (item: Omit<CartItem, "id">) => {
      const id = `${item.planId}-${Date.now()}`;
      persistCart([...cart, { ...item, id }]);
    },
    [cart, persistCart]
  );

  const removeFromCart = useCallback(
    (id: string) => {
      persistCart(cart.filter((i) => i.id !== id));
    },
    [cart, persistCart]
  );

  const updateCartQty = useCallback(
    (id: string, qty: number) => {
      const clamped = Math.max(1, Math.min(20, qty));
      persistCart(cart.map((i) => (i.id === id ? { ...i, quantity: clamped } : i)));
    },
    [cart, persistCart]
  );

  const clearCart = useCallback(() => {
    persistCart([]);
  }, [persistCart]);

  const refreshUser = useCallback(async () => {
    setLoadingUser(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data.user ?? null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }, [router]);

  const switchLocale = useCallback(
    async (next: Locale) => {
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "fa" ? "rtl" : "ltr";
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    },
    [router]
  );

  const toggleColorScheme = useCallback(() => {
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentRendered =
      colorScheme === "light dark" ? (systemDark ? "dark" : "light") : colorScheme;
    const target = currentRendered === "dark" ? "light" : "dark";
    const systemMatchesTarget =
      (target === "dark" && systemDark) || (target === "light" && !systemDark);

    try {
      if (systemMatchesTarget) {
        localStorage.removeItem("color-scheme");
      } else {
        localStorage.setItem("color-scheme", target);
      }
    } catch {
      // ignore
    }

    const nextContent = systemMatchesTarget ? "light dark" : target;
    setColorScheme(nextContent);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute("content", nextContent);
  }, [colorScheme]);

  const t = getDictionary(locale);

  return (
    <AppContext.Provider
      value={{
        locale,
        t,
        switchLocale,
        user,
        loadingUser,
        refreshUser,
        logout,
        cart,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        colorScheme,
        toggleColorScheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
