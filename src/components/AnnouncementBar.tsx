"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Megaphone, X, ArrowLeft, ArrowRight } from "lucide-react";
import { useApp } from "./AppProvider";

interface AnnouncementBarProps {
  active?: boolean;
  textFa?: string | null;
  textEn?: string | null;
  link?: string | null;
}

export function AnnouncementBar({
  active = true,
  textFa,
  textEn,
  link = "/store",
}: AnnouncementBarProps) {
  const { locale } = useApp();
  const [closed, setClosed] = useState(false);

  const text = locale === "fa" ? textFa : textEn;
  const ArrowIcon = locale === "fa" ? ArrowLeft : ArrowRight;

  if (!active || !text || closed) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white text-xs font-medium py-2 px-4 shadow-sm transition-all duration-300">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center justify-center gap-2 text-center truncate">
          <Megaphone className="h-4 w-4 shrink-0 text-amber-300 animate-pulse" aria-hidden="true" />
          <span className="truncate">{text}</span>
          {link && (
            <Link
              href={link}
              className="inline-flex items-center gap-1 font-bold underline underline-offset-2 hover:text-amber-200 transition shrink-0 mr-1"
            >
              <span>{locale === "fa" ? "مشاهده" : "View"}</span>
              <ArrowIcon className="h-3 w-3" />
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => setClosed(true)}
          className="shrink-0 p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition"
          aria-label={locale === "fa" ? "بستن پیام" : "Dismiss announcement"}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
