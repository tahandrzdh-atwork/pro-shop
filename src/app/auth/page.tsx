"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, ShieldCheck, KeyRound, Sparkles } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatNumber } from "@/lib/i18n";

export default function AuthPage() {
  const router = useRouter();
  const { locale, t, refreshUser } = useApp();

  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [otp, setOtp] = useState("");
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otpFormRef = useRef<HTMLFormElement>(null);
  const otpAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const stopWebOtp = () => {
    if (otpAbortRef.current) {
      otpAbortRef.current.abort();
      otpAbortRef.current = null;
    }
  };

  const startWebOtp = async () => {
    if (typeof window === "undefined" || !("OTPCredential" in window)) return;
    stopWebOtp();
    const ac = new AbortController();
    otpAbortRef.current = ac;

    try {
      const cred = (await navigator.credentials.get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      } as CredentialRequestOptions)) as { code?: string } | null;

      if (cred?.code) {
        setOtp(cred.code);
        otpFormRef.current?.requestSubmit();
      }
    } catch {
      // Aborted or unsupported
    }
  };

  useEffect(() => {
    if (step === "OTP") {
      startWebOtp();
    }
    return () => stopWebOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send OTP");
        return;
      }
      setPhone(data.phone);
      setSandboxCode(data.sandboxCode ?? null);
      setCooldown(45);
      setStep("OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    stopWebOtp();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp, referralCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid OTP");
        return;
      }
      await refreshUser();
      router.push(data.user.role === "ADMIN" ? "/admin" : "/panel");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (type: "ADMIN" | "USER") => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        await refreshUser();
        router.push(type === "ADMIN" ? "/admin" : "/panel");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-brand">
            <Smartphone className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-text">{t.auth.title}</h1>
            <p className="text-xs text-muted">{t.auth.subtitle}</p>
          </div>
        </div>

        {step === "PHONE" ? (
          <form onSubmit={handleSendOtp} method="POST" className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="phone-input"
                className="block text-xs font-semibold text-text mb-1.5"
              >
                {t.auth.phoneLabel}
              </label>
              <input
                id="phone-input"
                name="phone"
                type="tel"
                dir="ltr"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.auth.phonePlaceholder}
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 font-mono text-base text-text focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ref-input"
                className="block text-xs font-semibold text-muted mb-1.5"
              >
                {locale === "fa"
                  ? "کد دعوت دوستان (اختیاری)"
                  : "Referral Code (Optional)"}
              </label>
              <input
                id="ref-input"
                type="text"
                dir="ltr"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="DSSARA22"
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 font-mono text-sm text-text focus:border-brand focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 p-3 text-xs font-medium text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? t.common.loading : t.auth.sendOtp}
            </button>
          </form>
        ) : (
          <form
            ref={otpFormRef}
            onSubmit={handleVerifyOtp}
            method="POST"
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="otp-input"
                className="block text-xs font-semibold text-text mb-1"
              >
                {t.auth.otpLabel}
              </label>
              <p id="otp-format-hint" className="mb-2 text-xs text-muted">
                {t.auth.otpHint} ({phone})
              </p>
              <input
                id="otp-input"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                aria-describedby="otp-format-hint"
                dir="ltr"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-center font-mono text-xl tracking-[0.35em] text-text focus:border-brand focus:outline-none"
              />
            </div>

            {sandboxCode && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <p>{t.auth.sandboxNotice}</p>
                <button
                  type="button"
                  onClick={() => setOtp(sandboxCode)}
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 font-mono text-sm font-bold"
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {sandboxCode}
                </button>
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-red-500/10 p-3 text-xs font-medium text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? t.common.loading : t.auth.verifyOtp}
            </button>

            <div className="flex items-center justify-between text-xs text-muted">
              <button
                type="button"
                onClick={() => {
                  stopWebOtp();
                  setStep("PHONE");
                }}
                className="hover:text-brand"
              >
                {t.auth.changePhone}
              </button>

              {cooldown > 0 ? (
                <span>
                  {t.auth.resendIn} {formatNumber(cooldown, locale)} {t.auth.seconds}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="font-semibold text-brand hover:underline"
                >
                  {t.auth.resendNow}
                </button>
              )}
            </div>
          </form>
        )}

        {/* Quick Demo Showcase */}
        <div className="mt-8 border-t border-border pt-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-3">
            <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            <span>{t.auth.demoAccounts}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoLogin("USER")}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs font-bold text-text transition hover:border-brand"
            >
              {t.auth.demoUser}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoLogin("ADMIN")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/20"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.auth.demoAdmin}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
