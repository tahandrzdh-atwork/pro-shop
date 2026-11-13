"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, Zap, Headphones } from "lucide-react";
import { useApp } from "./AppProvider";

export function SiteFooter() {
  const { locale, t } = useApp();

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-base font-extrabold">{t.brand.name}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t.brand.tagline}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-text">
                {locale === "fa" ? "دسترسی سریع" : "Quick Links"}
              </p>
              <ul className="space-y-1.5 text-muted">
                <li>
                  <Link href="/store" className="hover:text-brand">
                    {t.nav.store}
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-brand">
                    {locale === "fa" ? "وبلاگ و مقالات سئو" : "Blog"}
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="hover:text-brand inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {locale === "fa" ? "وضعیت سرورها (Status)" : "Service Status"}
                  </Link>
                </li>
                <li>
                  <Link href="/panel" className="hover:text-brand">
                    {t.nav.panel}
                  </Link>
                </li>
                <li>
                  <Link href="/panel?tab=club" className="hover:text-brand">
                    {t.nav.club}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-text">
                {locale === "fa" ? "امکانات سامانه" : "Platform Highlights"}
              </p>
              <ul className="space-y-1.5 text-muted text-xs">
                <li className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  <span>{locale === "fa" ? "تکمیل خودکار API" : "Auto API Fulfillment"}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                  <span>{locale === "fa" ? "ورود پیامکی OTP" : "SMS OTP Auth"}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" />
                  <span>{locale === "fa" ? "CRM و باشگاه مشتریان" : "CRM & Loyalty Club"}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-2 p-4 text-xs leading-relaxed text-muted">
            <p className="font-semibold text-text mb-1">
              {locale === "fa"
                ? "معماری آماده تولید و نمونه کار"
                : "Production-Ready Portfolio Architecture"}
            </p>
            <p>
              {locale === "fa"
                ? "ساخته‌شده با Next.js App Router، Prisma ORM، احراز هویت OTP پیامکی، اتصال ماژولار به پنل‌های پیامکی ایرانی و سرورهای مادر API."
                : "Built with Next.js App Router, Prisma ORM, SMS OTP Auth, Iranian SMS Gateway Hub, and Upstream Provider API Engine."}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} {t.brand.name} — Full-Stack Digital Commerce Platform
        </div>
      </div>
    </footer>
  );
}
