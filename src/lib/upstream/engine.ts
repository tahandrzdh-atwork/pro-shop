import { prisma } from "@/lib/prisma";
import { getUserTier } from "@/lib/auth";
import { sendSms } from "@/lib/sms/providers";

export interface UpstreamDispatchResult {
  success: boolean;
  upstreamOrderId?: string;
  deliveredSecret?: string;
  status: "DELIVERED" | "PROCESSING" | "FAILED";
  rawResponse: string;
}

export async function dispatchToUpstreamProvider(params: {
  providerId: string;
  orderItemId: string;
  serviceId: string;
  quantity: number;
  customerInputs: Record<string, string>;
}): Promise<UpstreamDispatchResult> {
  const provider = await prisma.upstreamProvider.findUnique({
    where: { id: params.providerId },
  });

  if (!provider || !provider.isActive) {
    return {
      success: false,
      status: "FAILED",
      rawResponse: JSON.stringify({ error: "Upstream provider inactive or missing" }),
    };
  }

  const startedAt = Date.now();
  const targetInput =
    params.customerInputs.telegramUsername ??
    params.customerInputs.targetUrl ??
    params.customerInputs.email ??
    Object.values(params.customerInputs)[0] ??
    "unknown";

  const requestBody =
    provider.protocol === "SMM_PANEL"
      ? {
          key: "***MASKED***",
          action: "add",
          service: params.serviceId,
          link: targetInput,
          quantity: params.quantity,
        }
      : {
          serviceId: params.serviceId,
          recipient: targetInput,
          quantity: params.quantity,
          metadata: params.customerInputs,
        };

  if (provider.isSandbox) {
    const fakeUpstreamId = `UP-${Math.floor(100000 + Math.random() * 900000)}`;
    const simulatedResponse = {
      ok: true,
      sandbox: true,
      order: fakeUpstreamId,
      provider: provider.name,
      protocol: provider.protocol,
      service: params.serviceId,
      recipient: targetInput,
      quantity: params.quantity,
      status: "Completed",
      activationNote: `Activated automatically for ${targetInput} via ${provider.name} (#${fakeUpstreamId})`,
    };

    const durationMs = Date.now() - startedAt + 42;
    await prisma.upstreamApiLog.create({
      data: {
        providerId: provider.id,
        orderItemId: params.orderItemId,
        action: "SUBMIT_ORDER",
        requestPayload: JSON.stringify(requestBody),
        responseBody: JSON.stringify(simulatedResponse),
        httpStatus: 200,
        success: true,
        durationMs,
      },
    });

    return {
      success: true,
      upstreamOrderId: fakeUpstreamId,
      deliveredSecret: simulatedResponse.activationNote,
      status: "DELIVERED",
      rawResponse: JSON.stringify(simulatedResponse),
    };
  }

  // Live HTTP call to upstream mother server
  try {
    let res: Response;
    if (provider.protocol === "SMM_PANEL") {
      const form = new URLSearchParams({
        key: provider.apiKey,
        action: "add",
        service: params.serviceId,
        link: targetInput,
        quantity: String(params.quantity),
      });
      res = await fetch(provider.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
    } else {
      res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          serviceId: params.serviceId,
          recipient: targetInput,
          quantity: params.quantity,
          inputs: params.customerInputs,
        }),
      });
    }

    const text = await res.text();
    const durationMs = Date.now() - startedAt;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    const upstreamOrderId =
      typeof parsed.order === "string" || typeof parsed.order === "number"
        ? String(parsed.order)
        : typeof parsed.orderId === "string"
          ? parsed.orderId
          : undefined;

    const ok = res.ok && !parsed.error;

    await prisma.upstreamApiLog.create({
      data: {
        providerId: provider.id,
        orderItemId: params.orderItemId,
        action: "SUBMIT_ORDER",
        requestPayload: JSON.stringify(requestBody),
        responseBody: text.slice(0, 4000),
        httpStatus: res.status,
        success: ok,
        durationMs,
      },
    });

    return {
      success: ok,
      upstreamOrderId,
      deliveredSecret: ok
        ? `Submitted to ${provider.name} (Ref: ${upstreamOrderId ?? "N/A"})`
        : undefined,
      status: ok ? "PROCESSING" : "FAILED",
      rawResponse: text.slice(0, 4000),
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : "Network error";
    await prisma.upstreamApiLog.create({
      data: {
        providerId: provider.id,
        orderItemId: params.orderItemId,
        action: "SUBMIT_ORDER",
        requestPayload: JSON.stringify(requestBody),
        responseBody: JSON.stringify({ error: msg }),
        httpStatus: 500,
        success: false,
        durationMs,
      },
    });
    return {
      success: false,
      status: "FAILED",
      rawResponse: JSON.stringify({ error: msg }),
    };
  }
}

export async function testUpstreamConnection(providerId: string) {
  const provider = await prisma.upstreamProvider.findUnique({
    where: { id: providerId },
  });
  if (!provider) {
    return { ok: false, message: "Provider not found" };
  }

  const startedAt = Date.now();

  if (provider.isSandbox) {
    const balance = "$428.50 (Sandbox)";
    await prisma.upstreamProvider.update({
      where: { id: provider.id },
      data: { balanceText: balance, lastSyncAt: new Date() },
    });
    await prisma.upstreamApiLog.create({
      data: {
        providerId: provider.id,
        action: "TEST_CONNECTION",
        requestPayload: JSON.stringify({ action: "balance", sandbox: true }),
        responseBody: JSON.stringify({ balance: "428.50", currency: "USD" }),
        httpStatus: 200,
        success: true,
        durationMs: Date.now() - startedAt + 18,
      },
    });
    return { ok: true, balance, servicesCount: 12 };
  }

  try {
    let res: Response;
    if (provider.protocol === "SMM_PANEL") {
      const form = new URLSearchParams({
        key: provider.apiKey,
        action: "balance",
      });
      res = await fetch(provider.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
    } else {
      res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/balance`, {
        headers: { Authorization: `Bearer ${provider.apiKey}` },
      });
    }
    const text = await res.text();
    const durationMs = Date.now() - startedAt;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
    const ok = res.ok && !parsed.error;
    const balance =
      parsed.balance !== undefined
        ? `${parsed.balance} ${parsed.currency ?? "USD"}`
        : "Connected";

    if (ok) {
      await prisma.upstreamProvider.update({
        where: { id: provider.id },
        data: { balanceText: balance, lastSyncAt: new Date() },
      });
    }

    await prisma.upstreamApiLog.create({
      data: {
        providerId: provider.id,
        action: "TEST_CONNECTION",
        requestPayload: JSON.stringify({ action: "balance" }),
        responseBody: text.slice(0, 2000),
        httpStatus: res.status,
        success: ok,
        durationMs,
      },
    });

    return { ok, balance, raw: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    await prisma.upstreamApiLog.create({
      data: {
        providerId: provider.id,
        action: "TEST_CONNECTION",
        requestPayload: JSON.stringify({ action: "balance" }),
        responseBody: JSON.stringify({ error: msg }),
        httpStatus: 500,
        success: false,
        durationMs: Date.now() - startedAt,
      },
    });
    return { ok: false, message: msg };
  }
}

export async function fulfillOrderAfterPayment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        include: {
          plan: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!order) return null;

  let deliveredCount = 0;
  let processingCount = 0;
  let failedCount = 0;
  let totalPointsEarned = 0;

  for (const item of order.items) {
    const customerInputs: Record<string, string> = (() => {
      try {
        return JSON.parse(item.customerInputsJson);
      } catch {
        return {};
      }
    })();

    const expiresAt = item.plan.durationDays
      ? new Date(Date.now() + item.plan.durationDays * 24 * 60 * 60 * 1000)
      : null;

    totalPointsEarned += item.plan.pointsReward * item.quantity;

    if (item.deliveryType === "VAULT") {
      const vaultItems = await prisma.digitalVaultItem.findMany({
        where: { planId: item.planId, isUsed: false },
        take: item.quantity,
      });

      if (vaultItems.length > 0) {
        const secrets = vaultItems.map((v) => v.secretPayload).join("\n---\n");
        await prisma.$transaction([
          ...vaultItems.map((v, idx) =>
            prisma.digitalVaultItem.update({
              where: { id: v.id },
              data: {
                isUsed: true,
                usedAt: new Date(),
                orderItemId: idx === 0 ? item.id : undefined,
              },
            })
          ),
          prisma.orderItem.update({
            where: { id: item.id },
            data: {
              deliveredSecret: secrets,
              fulfillmentStatus: "DELIVERED",
              expiresAt,
            },
          }),
        ]);
        deliveredCount++;
      } else {
        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            fulfillmentStatus: "PROCESSING",
            expiresAt,
          },
        });
        processingCount++;
      }
    } else if (
      item.deliveryType === "UPSTREAM_API" &&
      item.plan.upstreamProviderId &&
      item.plan.upstreamServiceId
    ) {
      const dispatch = await dispatchToUpstreamProvider({
        providerId: item.plan.upstreamProviderId,
        orderItemId: item.id,
        serviceId: item.plan.upstreamServiceId,
        quantity: item.plan.upstreamQuantity * item.quantity,
        customerInputs,
      });

      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          fulfillmentStatus: dispatch.status,
          upstreamOrderId: dispatch.upstreamOrderId ?? null,
          upstreamResponseJson: dispatch.rawResponse,
          deliveredSecret: dispatch.deliveredSecret ?? null,
          expiresAt,
        },
      });

      if (dispatch.status === "DELIVERED") deliveredCount++;
      else if (dispatch.status === "PROCESSING") processingCount++;
      else failedCount++;
    } else {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          fulfillmentStatus: "PROCESSING",
          expiresAt,
        },
      });
      processingCount++;
    }

    await prisma.product.update({
      where: { id: item.plan.productId },
      data: { salesCount: { increment: item.quantity } },
    });
  }

  const finalOrderStatus =
    failedCount > 0 && deliveredCount === 0
      ? "FAILED"
      : processingCount > 0 && deliveredCount === 0
        ? "PROCESSING"
        : processingCount > 0 || failedCount > 0
          ? "PARTIAL"
          : "COMPLETED";

  const tier = await getUserTier(order.user.loyaltyPoints);
  const cashbackToman =
    tier && tier.cashbackPercent > 0
      ? Math.round((order.totalToman * tier.cashbackPercent) / 100)
      : 0;

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: finalOrderStatus,
      pointsEarned: totalPointsEarned,
    },
  });

  await prisma.user.update({
    where: { id: order.userId },
    data: {
      loyaltyPoints: { increment: totalPointsEarned },
      totalSpent: { increment: order.totalToman },
      lastPurchaseAt: new Date(),
      ...(cashbackToman > 0
        ? { walletBalance: { increment: cashbackToman } }
        : {}),
    },
  });

  if (cashbackToman > 0) {
    await prisma.walletTransaction.create({
      data: {
        userId: order.userId,
        amount: cashbackToman,
        type: "CASHBACK",
        descriptionFa: `کش‌بک باشگاه مشتریان (${tier?.nameFa}) بابت سفارش ${order.orderNumber}`,
        descriptionEn: `Loyalty cashback (${tier?.nameEn}) for order ${order.orderNumber}`,
        referenceId: order.id,
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId: order.userId,
      titleFa:
        finalOrderStatus === "COMPLETED"
          ? `سفارش ${order.orderNumber} تکمیل شد`
          : `سفارش ${order.orderNumber} ثبت و در حال پردازش است`,
      titleEn:
        finalOrderStatus === "COMPLETED"
          ? `Order ${order.orderNumber} completed`
          : `Order ${order.orderNumber} is processing`,
      bodyFa: `امتیاز کسب‌شده: +${totalPointsEarned} امتیاز${cashbackToman > 0 ? ` | کش‌بک کیف پول: +${cashbackToman} تومان` : ""}`,
      bodyEn: `Points earned: +${totalPointsEarned} pts${cashbackToman > 0 ? ` | Wallet cashback: +${cashbackToman} Toman` : ""}`,
    },
  });

  await sendSms({
    phone: order.user.phone,
    templateType: "ORDER_COMPLETE",
    message: `سفارش ${order.orderNumber} با موفقیت ثبت شد. وضعیت: ${finalOrderStatus} | دیجی‌ساب`,
    patternValues: {
      orderNumber: order.orderNumber,
      status: finalOrderStatus,
    },
  });

  return updatedOrder;
}
