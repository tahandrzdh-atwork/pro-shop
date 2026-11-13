import { prisma } from "@/lib/prisma";
import { getUserTier } from "@/lib/auth";
import { sendSms } from "@/lib/sms/providers";

export interface UpstreamDispatchResult {
  success: boolean;
  upstreamOrderId?: string;
  deliveredSecret?: string;
  status: "DELIVERED" | "PROCESSING" | "FAILED";
  rawResponse: string;
  virtualNumber?: string;
  virtualCountry?: string;
  virtualRequestId?: string;
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
    params.customerInputs.country ??
    params.customerInputs.telegramUsername ??
    params.customerInputs.targetUrl ??
    params.customerInputs.email ??
    Object.values(params.customerInputs)[0] ??
    "48";

  // 1. CALLINOO / OZVINOO VIRTUAL NUMBERS
  if (provider.protocol === "OZVINOO_CALLINOO") {
    const serviceId = params.serviceId || "1";
    const country = encodeURIComponent(targetInput.trim() || "48");
    const endpoint = `${provider.baseUrl.replace(/\/$/, "")}/web/${provider.apiKey}/getNumber/${serviceId}/${country}`;

    if (provider.isSandbox) {
      const fakeReqId = `242${Math.floor(100000 + Math.random() * 900000)}`;
      const fakeNum = `+48459${Math.floor(100000 + Math.random() * 900000)}`;
      const simResp = {
        number: fakeNum,
        request_id: fakeReqId,
        price: 75000,
        country: targetInput,
        range: 48,
        service: "تلگرام (پنل کالینو)",
      };
      await prisma.upstreamApiLog.create({
        data: {
          providerId: provider.id,
          orderItemId: params.orderItemId,
          action: "GET_VIRTUAL_NUMBER",
          requestPayload: JSON.stringify({ serviceId, country }),
          responseBody: JSON.stringify(simResp),
          httpStatus: 200,
          success: true,
          durationMs: 45,
        },
      });
      return {
        success: true,
        upstreamOrderId: fakeReqId,
        virtualNumber: fakeNum,
        virtualRequestId: fakeReqId,
        virtualCountry: targetInput,
        deliveredSecret: `شماره مجازی: ${fakeNum} (در انتظار پیامک کد تایید)`,
        status: "PROCESSING",
        rawResponse: JSON.stringify(simResp),
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0 (DigiSub Platform)" },
      });
      const text = await res.text();
      const durationMs = Date.now() - startedAt;
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }

      const ok = res.ok && !parsed.error_code && !parsed.error && !!parsed.number;
      const num = parsed.number ? String(parsed.number) : undefined;
      const reqId = parsed.request_id ? String(parsed.request_id) : undefined;
      const cName = parsed.country || parsed.countery ? String(parsed.country || parsed.countery) : targetInput;

      await prisma.upstreamApiLog.create({
        data: {
          providerId: provider.id,
          orderItemId: params.orderItemId,
          action: "GET_VIRTUAL_NUMBER",
          requestPayload: JSON.stringify({ serviceId, country }),
          responseBody: text.slice(0, 4000),
          httpStatus: res.status,
          success: ok,
          durationMs,
        },
      });

      if (ok && num && reqId) {
        return {
          success: true,
          upstreamOrderId: reqId,
          virtualNumber: num,
          virtualRequestId: reqId,
          virtualCountry: cName,
          deliveredSecret: `شماره دریافت شد: ${num} | در انتظار کد پیامک...`,
          status: "PROCESSING",
          rawResponse: text.slice(0, 4000),
        };
      }

      return {
        success: false,
        status: "FAILED",
        rawResponse: text.slice(0, 4000),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Callinoo error";
      return {
        success: false,
        status: "FAILED",
        rawResponse: JSON.stringify({ error: msg }),
      };
    }
  }

  // 2. ALTIVOX AI PARTNER API
  if (provider.protocol === "ALTIVOX_AI") {
    const endpoint = `${provider.baseUrl.replace(/\/$/, "")}/internal-source/v1/orders`;
    const payload = {
      productId: params.serviceId,
      quantity: params.quantity,
      clientOrderCode: params.orderItemId,
      customerEmail: params.customerInputs.email || undefined,
    };

    if (provider.isSandbox) {
      const fakeCode = `ALTI-${Date.now().toString().slice(-6)}`;
      const simResp = {
        success: true,
        orderCode: fakeCode,
        status: "DELIVERED",
        credentials: "Email: altivox.user@ai.dev | License: Ready",
      };
      return {
        success: true,
        upstreamOrderId: fakeCode,
        deliveredSecret: simResp.credentials,
        status: "DELIVERED",
        rawResponse: JSON.stringify(simResp),
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Source-Api-Key": provider.apiKey,
          "User-Agent": "DigiSub/1.0",
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const durationMs = Date.now() - startedAt;
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }

      const ok = res.ok && parsed.success === true;
      const orderCode =
        parsed.orderCode || parsed.code || (parsed.order as Record<string, unknown>)?.code || `ALTI-${params.orderItemId.slice(-6)}`;

      await prisma.upstreamApiLog.create({
        data: {
          providerId: provider.id,
          orderItemId: params.orderItemId,
          action: "ALTIVOX_ORDER",
          requestPayload: JSON.stringify(payload),
          responseBody: text.slice(0, 4000),
          httpStatus: res.status,
          success: ok,
          durationMs,
        },
      });

      return {
        success: ok,
        upstreamOrderId: String(orderCode),
        deliveredSecret: ok
          ? `سفارش در Altivox AI ثبت شد (شناسه: ${orderCode})`
          : undefined,
        status: ok ? "PROCESSING" : "FAILED",
        rawResponse: text.slice(0, 4000),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Altivox error";
      return {
        success: false,
        status: "FAILED",
        rawResponse: JSON.stringify({ error: msg }),
      };
    }
  }

  // 3. ROBYNHOOD TELEGRAM FRAGMENT API (Telegram Premium, Stars, TON)
  if (provider.protocol === "ROBYNHOOD_FRAGMENT") {
    const rawRecipient =
      params.customerInputs.telegramUsername ||
      params.customerInputs.recipient ||
      params.customerInputs.username ||
      targetInput;
    const recipient = rawRecipient
      .replace(/^@/, "")
      .replace(/^https?:\/\/t\.me\//, "")
      .trim();

    let productType = "premium";
    let months = "3";
    let starsQty = String(params.quantity || 50);

    const sLower = params.serviceId.toLowerCase();
    if (sLower.includes("star") || sLower.startsWith("tg_stars")) {
      productType = "stars";
      if (sLower.includes("50") && !sLower.includes("500")) starsQty = "50";
      else if (sLower.includes("100") && !sLower.includes("1000")) starsQty = "100";
      else if (sLower.includes("250")) starsQty = "250";
      else if (sLower.includes("500")) starsQty = "500";
      else if (sLower.includes("1000")) starsQty = "1000";
      else starsQty = String(params.quantity || 50);
    } else if (sLower.includes("prem") || sLower.startsWith("tg_prem")) {
      productType = "premium";
      if (sLower.includes("12") || sLower.includes("1y") || sLower.includes("year")) months = "12";
      else if (sLower.includes("6")) months = "6";
      else months = "3";
    }

    const payload: Record<string, unknown> = {
      product_type: productType,
      recipient,
      payment_method: "ton",
      idempotency_key: params.orderItemId,
    };
    if (productType === "premium") {
      payload.months = months;
    } else if (productType === "stars") {
      payload.quantity = starsQty;
    }

    if (provider.isSandbox) {
      const fakeTxId = `TX-ROBYN-${Math.floor(100000 + Math.random() * 900000)}`;
      const fakeTonHash = `fragment_ton_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      const simResp = {
        transaction_id: fakeTxId,
        ton_tx_id: fakeTonHash,
        status: "COMPLETED",
        product_type: productType,
        recipient: `@${recipient}`,
        item_name: productType === "premium" ? `Telegram Premium ${months} Months` : `${starsQty} Telegram Stars`,
        sandbox: true,
      };

      await prisma.upstreamApiLog.create({
        data: {
          providerId: provider.id,
          orderItemId: params.orderItemId,
          action: "SUBMIT_ORDER",
          requestPayload: JSON.stringify(payload),
          responseBody: JSON.stringify(simResp),
          httpStatus: 200,
          success: true,
          durationMs: 45,
        },
      });

      return {
        success: true,
        upstreamOrderId: fakeTxId,
        deliveredSecret: `✅ فعال‌سازی آنی از فرگمنت تلگرام (Sandbox Mode)\nشناسه تراکنش: ${fakeTxId}\nهش بلاکچین TON: ${fakeTonHash}\nکاربر دریافت‌کننده: @${recipient}\nسرویس: ${simResp.item_name}`,
        status: "DELIVERED",
        rawResponse: JSON.stringify(simResp),
      };
    }

    try {
      const endpoint = `${provider.baseUrl.replace(/\/$/, "")}/api/purchase`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": provider.apiKey,
          "User-Agent": "DigiSub/1.0",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const durationMs = Date.now() - startedAt;
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }

      const ok =
        res.ok &&
        !parsed.error &&
        (Boolean(parsed.transaction_id) || parsed.status === "COMPLETED" || parsed.status === "PENDING");
      const txId = (parsed.transaction_id || parsed.id || `TX-${Date.now()}`) as string;
      const tonHash = (parsed.ton_tx_id || "در حال ثبت روی بلاکچین TON") as string;

      await prisma.upstreamApiLog.create({
        data: {
          providerId: provider.id,
          orderItemId: params.orderItemId,
          action: "SUBMIT_ORDER",
          requestPayload: JSON.stringify(payload),
          responseBody: text.slice(0, 4000),
          httpStatus: res.status,
          success: ok,
          durationMs,
        },
      });

      return {
        success: ok,
        upstreamOrderId: String(txId),
        deliveredSecret: ok
          ? `✅ فعال‌سازی فرگمنت تلگرام با موفقیت انجام شد\nشناسه تراکنش: ${txId}\nهش بلاکچین TON: ${tonHash}\nکاربر: @${recipient}\nسرویس: ${String(parsed.item_name || productType)}`
          : undefined,
        status: ok ? "DELIVERED" : "FAILED",
        rawResponse: text.slice(0, 4000),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Robynhood Fragment error";
      return {
        success: false,
        status: "FAILED",
        rawResponse: JSON.stringify({ error: msg }),
      };
    }
  }

  // 4. SMM PANEL & GENERIC REST
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

  // 1. OZVINOO / CALLINOO
  if (provider.protocol === "OZVINOO_CALLINOO") {
    try {
      const url = `${provider.baseUrl.replace(/\/$/, "")}/web/${provider.apiKey}/get-balance`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const data = await res.json();
      const ok = res.ok && data.balance !== undefined;
      const balance = ok ? `${Number(data.balance).toLocaleString("fa-IR")} تومان` : "خطا در دریافت موجودی";

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
          requestPayload: JSON.stringify({ url }),
          responseBody: JSON.stringify(data),
          httpStatus: res.status,
          success: ok,
          durationMs: Date.now() - startedAt,
        },
      });

      return { ok, balance, raw: JSON.stringify(data) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Callinoo error";
      return { ok: false, message: msg };
    }
  }

  // 2. ALTIVOX AI
  if (provider.protocol === "ALTIVOX_AI") {
    try {
      const url = `${provider.baseUrl.replace(/\/$/, "")}/internal-source/v1/balance`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "DigiSub/1.0",
          "X-Source-Api-Key": provider.apiKey,
        },
      });
      const data = await res.json();
      const ok = res.ok && data.success === true;
      const balance = ok
        ? `${Number(data.balance ?? 0).toLocaleString()} ${data.currency ?? "VND"}`
        : "Failed to read balance";

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
          requestPayload: JSON.stringify({ url }),
          responseBody: JSON.stringify(data),
          httpStatus: res.status,
          success: ok,
          durationMs: Date.now() - startedAt,
        },
      });

      return { ok, balance, raw: JSON.stringify(data) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Altivox connection error";
      return { ok: false, message: msg };
    }
  }

  // 3. ROBYNHOOD TELEGRAM FRAGMENT API
  if (provider.protocol === "ROBYNHOOD_FRAGMENT") {
    try {
      const url = `${provider.baseUrl.replace(/\/$/, "")}/api/balance`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "DigiSub/1.0",
          "X-API-Key": provider.apiKey,
        },
      });
      const data = await res.json();
      const ok = res.ok && data.mainnet_balance !== undefined;
      const balance = ok
        ? `${data.mainnet_balance} TON (تست‌نت: ${data.testnet_balance} TON)`
        : "خطا در دریافت موجودی Fragment";

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
          requestPayload: JSON.stringify({ url }),
          responseBody: JSON.stringify(data),
          httpStatus: res.status,
          success: ok,
          durationMs: Date.now() - startedAt,
        },
      });

      return { ok, balance, raw: JSON.stringify(data) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Robynhood Fragment connection error";
      return { ok: false, message: msg };
    }
  }

  // 4. Fallback Sandbox / SMM Panel
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

// Check virtual number SMS OTP code from Callinoo
export async function pollCallinooCode(orderItemId: string) {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      plan: { include: { upstreamProvider: true } },
      order: { include: { user: true } },
    },
  });

  if (!item || !item.virtualRequestId || !item.plan.upstreamProvider) {
    return { ok: false, error: "Order item or virtual number request not found" };
  }

  const provider = item.plan.upstreamProvider;
  if (provider.isSandbox) {
    const fakeCode = "74192";
    await prisma.orderItem.update({
      where: { id: item.id },
      data: {
        virtualSmsCode: fakeCode,
        virtualStatus: "CODE_RECEIVED",
        fulfillmentStatus: "DELIVERED",
        deliveredSecret: `شماره: ${item.virtualNumber} | کد تایید پیامک: ${fakeCode}`,
      },
    });
    await prisma.order.update({
      where: { id: item.orderId },
      data: { status: "COMPLETED" },
    });
    return { ok: true, code: fakeCode, status: "CODE_RECEIVED" };
  }

  const url = `${provider.baseUrl.replace(/\/$/, "")}/web/${provider.apiKey}/getCode/${item.virtualRequestId}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await res.json();

    if (data.code) {
      const code = String(data.code);
      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          virtualSmsCode: code,
          virtualStatus: "CODE_RECEIVED",
          fulfillmentStatus: "DELIVERED",
          deliveredSecret: `شماره: ${item.virtualNumber} | کد تایید پیامک: ${code}`,
        },
      });

      // Update parent order
      await prisma.order.update({
        where: { id: item.orderId },
        data: { status: "COMPLETED" },
      });

      // Notify customer
      await prisma.notification.create({
        data: {
          userId: item.order.userId,
          titleFa: `کد پیامک شماره مجازی دریافت شد: ${code}`,
          titleEn: `Virtual Number SMS Code Received: ${code}`,
          bodyFa: `کد تایید شماره ${item.virtualNumber}: ${code}`,
          bodyEn: `Verification code for ${item.virtualNumber}: ${code}`,
        },
      });

      await sendSms({
        phone: item.order.user.phone,
        templateType: "ORDER_COMPLETE",
        message: `کد تایید شماره مجازی شما: ${code} | دیجی‌ساب`,
        patternValues: { code },
      });

      return { ok: true, code, status: "CODE_RECEIVED" };
    }

    if (data.error_code === "wait_code") {
      return { ok: true, status: "WAITING_CODE", message: "Still waiting for SMS..." };
    }

    if (data.error_code === "canceled") {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { virtualStatus: "CANCELED", fulfillmentStatus: "FAILED" },
      });
      return { ok: false, status: "CANCELED", error: "Order canceled" };
    }

    return { ok: false, status: "PENDING", raw: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Polling failed" };
  }
}

// Cancel virtual number order & refund user wallet
export async function cancelVirtualNumberOrder(orderItemId: string) {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      plan: { include: { upstreamProvider: true } },
      order: true,
    },
  });

  if (!item || !item.virtualRequestId || !item.plan.upstreamProvider) {
    return { ok: false, error: "Not found" };
  }

  if (item.virtualStatus === "CODE_RECEIVED") {
    return { ok: false, error: "کد تایید دریافت شده و سفارش قابل لغو نیست." };
  }

  const provider = item.plan.upstreamProvider;
  if (!provider.isSandbox) {
    try {
      const url = `${provider.baseUrl.replace(/\/$/, "")}/web/${provider.apiKey}/logout/${item.virtualRequestId}`;
      await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    } catch {
      // ignore upstream logout errors
    }
  }

  await prisma.$transaction([
    prisma.orderItem.update({
      where: { id: item.id },
      data: { virtualStatus: "CANCELED", fulfillmentStatus: "FAILED" },
    }),
    prisma.user.update({
      where: { id: item.order.userId },
      data: { walletBalance: { increment: item.totalPriceToman } },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: item.order.userId,
        amount: item.totalPriceToman,
        type: "REFUND",
        descriptionFa: `بازگشت وجه لغو شماره مجازی ${item.virtualNumber ?? ""}`,
        descriptionEn: `Refund for canceled virtual number ${item.virtualNumber ?? ""}`,
        referenceId: item.id,
      },
    }),
  ]);

  return { ok: true, refundedToman: item.totalPriceToman };
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
          virtualNumber: dispatch.virtualNumber ?? null,
          virtualCountry: dispatch.virtualCountry ?? null,
          virtualRequestId: dispatch.virtualRequestId ?? null,
          virtualStatus: dispatch.virtualNumber ? "WAITING_CODE" : null,
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

export async function getRobynhoodPrices(provider: { baseUrl: string; apiKey: string }) {
  try {
    const url = `${provider.baseUrl.replace(/\/$/, "")}/api/prices/list`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "DigiSub/1.0",
        "X-API-Key": provider.apiKey,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.prices || []) as Array<{
      product_type: string;
      item_name: string;
      price: string;
      gas_fee: string;
      total: string;
      currency: string;
    }>;
  } catch {
    return [];
  }
}
