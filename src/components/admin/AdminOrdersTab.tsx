"use client";

import React, { useEffect, useRef, useState } from "react";
import { RefreshCw, Send, RotateCcw } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatDateTime } from "@/lib/i18n";

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  totalToman: number;
  createdAt: string;
  user: { name: string | null; phone: string };
  items: Array<{
    id: string;
    productTitleFa: string;
    productTitleEn: string;
    planTitleFa: string;
    planTitleEn: string;
    deliveryType: string;
    fulfillmentStatus: string;
    customerInputsJson: string;
    deliveredSecret: string | null;
    upstreamOrderId: string | null;
    plan: {
      upstreamProviderId: string | null;
      upstreamServiceId: string | null;
    };
  }>;
}

export function AdminOrdersTab() {
  const { locale, t } = useApp();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [deliveryTarget, setDeliveryTarget] = useState<{
    orderId: string;
    orderItemId: string;
    title: string;
  } | null>(null);
  const [secretText, setSecretText] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const loadOrders = async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    const data = await res.json();
    setOrders(data.orders ?? []);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const openDeliveryModal = (orderId: string, orderItemId: string, title: string, existing: string | null) => {
    setDeliveryTarget({ orderId, orderItemId, title });
    setSecretText(existing ?? "");
    dialogRef.current?.showModal();
  };

  const handleDeliverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryTarget) return;
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "DELIVER_ITEM",
        orderId: deliveryTarget.orderId,
        orderItemId: deliveryTarget.orderItemId,
        deliveredSecret: secretText,
      }),
    });
    dialogRef.current?.close();
    setStatusMsg(locale === "fa" ? "تحویل سفارش ثبت و پیامک ارسال شد." : "Delivered & SMS dispatched.");
    await loadOrders();
  };

  const handleRetryUpstream = async (orderItemId: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RETRY_UPSTREAM", orderItemId }),
    });
    const data = await res.json();
    setStatusMsg(
      data.ok
        ? locale === "fa"
          ? "سفارش مجدداً به سرور مادر ارسال شد."
          : "Dispatched to upstream API."
        : "Upstream error"
    );
    await loadOrders();
  };

  const handleRefund = async (orderId: string) => {
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REFUND_ORDER", orderId }),
    });
    setStatusMsg(locale === "fa" ? "مبلغ به کیف پول مشتری عودت داده شد." : "Refunded to wallet.");
    await loadOrders();
  };

  return (
    <div className="space-y-4">
      {statusMsg && (
        <p className="rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-500">
          {statusMsg}
        </p>
      )}

      <div tabIndex={0} role="region" aria-labelledby="admin-orders-caption" className="table-wrapper">
        <table className="responsive-table">
          <caption id="admin-orders-caption" className="p-4 text-start font-bold text-text">
            {t.adminPanel.orders}
          </caption>
          <thead>
            <tr>
              <th>{locale === "fa" ? "شماره سفارش" : "Order #"}</th>
              <th>{locale === "fa" ? "مشتری" : "Customer"}</th>
              <th>{locale === "fa" ? "آیتم‌ها و ورودی مشتری" : "Items & Inputs"}</th>
              <th>{locale === "fa" ? "مبلغ" : "Amount"}</th>
              <th>{t.common.status}</th>
              <th>{t.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td data-label="Order #">
                  <span className="font-mono font-bold text-brand">{o.orderNumber}</span>
                  <p className="text-[11px] text-muted">{formatDateTime(o.createdAt, locale)}</p>
                </td>
                <td data-label="Customer">
                  <p className="font-semibold text-text">{o.user.name || "-"}</p>
                  <p className="font-mono text-xs text-muted">{o.user.phone}</p>
                </td>
                <td data-label="Items">
                  <div className="space-y-1.5">
                    {o.items.map((item) => (
                      <div key={item.id} className="rounded-lg bg-surface-2/60 p-2 text-xs">
                        <p className="font-bold text-text">
                          {locale === "fa" ? item.productTitleFa : item.productTitleEn} —{" "}
                          {locale === "fa" ? item.planTitleFa : item.planTitleEn}
                        </p>
                        <p className="font-mono text-[11px] text-muted mt-0.5">
                          {item.customerInputsJson !== "{}" ? item.customerInputsJson : ""}
                          {item.upstreamOrderId ? ` | Upstream: ${item.upstreamOrderId}` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              openDeliveryModal(
                                o.id,
                                item.id,
                                locale === "fa" ? item.productTitleFa : item.productTitleEn,
                                item.deliveredSecret
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white"
                          >
                            <Send className="h-3 w-3" aria-hidden="true" />
                            {locale === "fa" ? "ثبت/ارسال تحویل" : "Deliver"}
                          </button>

                          {item.plan.upstreamProviderId && (
                            <button
                              type="button"
                              onClick={() => handleRetryUpstream(item.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-text"
                            >
                              <RefreshCw className="h-3 w-3" aria-hidden="true" />
                              {locale === "fa" ? "ارسال مجدد API" : "Retry API"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
                <td data-label="Amount" className="font-bold">
                  {formatCurrency(o.totalToman, locale)}
                </td>
                <td data-label="Status">
                  <span className="rounded-full bg-indigo-500/12 px-2.5 py-1 text-xs font-bold text-brand">
                    {o.status}
                  </span>
                </td>
                <td data-label="Actions">
                  {o.status !== "REFUNDED" && (
                    <button
                      type="button"
                      onClick={() => handleRefund(o.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      {locale === "fa" ? "عودت به کیف پول" : "Refund"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Native Accessible Modal Dialog */}
      <dialog
        ref={dialogRef}
        aria-labelledby="deliver-dialog-title"
        className="m-auto w-full max-w-md rounded-2xl p-6 shadow-2xl"
      >
        <h2 id="deliver-dialog-title" className="text-lg font-extrabold text-text">
          {locale === "fa" ? "تحویل اطلاعات سفارش" : "Deliver Order Credentials"}
        </h2>
        <p className="mt-1 text-xs text-muted">{deliveryTarget?.title}</p>
        <form onSubmit={handleDeliverSubmit} className="mt-4 space-y-4">
          <textarea
            rows={4}
            required
            autoFocus
            value={secretText}
            onChange={(e) => setSecretText(e.target.value)}
            placeholder={
              locale === "fa"
                ? "مشخصات اکانت، لایسنس یا گزارش فعال‌سازی..."
                : "Account credentials, license key or activation note..."
            }
            className="w-full rounded-xl border border-border bg-surface-2 p-3 font-mono text-xs text-text"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
            >
              {locale === "fa" ? "ثبت تحویل و ارسال پیامک" : "Confirm & Notify"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
