"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  User,
  ShieldCheck,
  Sun,
  Moon,
  Languages,
  Menu,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useApp } from "./AppProvider";
import { formatNumber } from "@/lib/i18n";

export function SiteHeader() {
  const pathname = usePathname();
  const { locale, t, switchLocale, user, cart, logout, toggleColorScheme } = useApp();
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (typeof HTMLElement !== "undefined" && !Object.hasOwn(HTMLElement.prototype, "popover")) {
      // Fallback progressive enhancement note: modern browsers support native popover
    }
  }, []);

  const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);

  const navItems = [
    { href: "/", label: t.nav.home },
    { href: "/store", label: t.nav.store },
    { href: "/panel?tab=club", label: t.nav.club },
    { href: "/panel?tab=tickets", label: t.nav.support },
  ];

  const closeMobilePopover = () => {
    try {
      menuRef.current?.hidePopover?.();
    } catch {
      // ignore if not open
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-text"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/30">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-extrabold">{t.brand.name}</span>
          </Link>

          <nav className="hidden md:block" aria-label={locale === "fa" ? "منوی اصلی" : "Primary"}>
            <ul className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href.split("?")[0]);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-500/12 text-brand font-semibold"
                          : "text-muted hover:bg-surface-2 hover:text-text"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Bilingual Switcher */}
          <button
            type="button"
            onClick={() => switchLocale(locale === "fa" ? "en" : "fa")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-xs font-bold text-text transition hover:border-brand"
            aria-label={locale === "fa" ? "Switch to English" : "تغییر زبان به فارسی"}
          >
            <Languages className="h-4 w-4 text-brand" aria-hidden="true" />
            <span>{t.nav.switchLang}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleColorScheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-text transition hover:border-brand"
            aria-label={locale === "fa" ? "تغییر پوسته روشن/تیره" : "Toggle light/dark theme"}
          >
            <Sun className="h-4 w-4 hidden dark:block" aria-hidden="true" />
            <Moon className="h-4 w-4 block dark:hidden" aria-hidden="true" />
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            aria-current={pathname === "/cart" ? "page" : undefined}
            className="relative inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium text-text transition hover:border-brand"
          >
            <ShoppingBag className="h-4 w-4 text-brand" aria-hidden="true" />
            <span className="hidden sm:inline">{t.nav.cart}</span>
            {totalQty > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white">
                {formatNumber(totalQty, locale)}
              </span>
            )}
          </Link>

          {/* Auth / Panel / Admin */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/panel"
                aria-current={pathname === "/panel" ? "page" : undefined}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                <span>{t.nav.panel}</span>
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  aria-current={pathname === "/admin" ? "page" : undefined}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-semibold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/20"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{t.nav.admin}</span>
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:border-red-500/50 hover:text-red-500"
                aria-label={t.nav.logout}
                title={t.nav.logout}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span>{t.nav.login}</span>
            </Link>
          )}

          {/* Mobile Native Popover Trigger */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-text md:hidden"
            popoverTarget="mobile-site-menu"
            aria-controls="mobile-site-menu"
            aria-label={t.nav.menu}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <ul
            ref={menuRef}
            id="mobile-site-menu"
            popover="auto"
            className="fixed inset-y-auto top-16 inset-inline-end-4 m-0 w-72 rounded-2xl border border-border bg-surface p-3 shadow-2xl md:hidden"
          >
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMobilePopover}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-text hover:bg-surface-2"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="my-2 border-t border-border" />
            {user ? (
              <>
                <li>
                  <Link
                    href="/panel"
                    onClick={closeMobilePopover}
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-brand hover:bg-surface-2"
                  >
                    {t.nav.panel}
                  </Link>
                </li>
                {user.role === "ADMIN" && (
                  <li>
                    <Link
                      href="/admin"
                      onClick={closeMobilePopover}
                      className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-500 hover:bg-surface-2"
                    >
                      {t.nav.admin}
                    </Link>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobilePopover();
                      logout();
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-start text-sm font-medium text-red-500 hover:bg-surface-2"
                  >
                    {t.nav.logout}
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth"
                  onClick={closeMobilePopover}
                  className="block rounded-xl bg-indigo-600 px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  {t.nav.login}
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </header>
  );
}
