import { prisma } from "@/lib/prisma";

export type SmsTemplateType =
  | "OTP"
  | "ORDER_COMPLETE"
  | "EXPIRY_REMINDER"
  | "CRM_CAMPAIGN";

export interface SendSmsOptions {
  phone: string;
  templateType: SmsTemplateType;
  message: string;
  patternValues?: Record<string, string>;
}

export interface SendSmsResult {
  success: boolean;
  providerKey: string;
  status: "SENT" | "FAILED" | "SANDBOX_LOGGED";
  messageId?: string;
  sandboxCode?: string;
  error?: string;
}

function getDomainHost(): string {
  try {
    const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}

export function formatOriginBoundOtpSms(code: string, siteName = "DigiSub"): string {
  const domain = getDomainHost();
  return `${siteName} verification code: ${code}\n\n@${domain} #${code}`;
}

export async function getActiveSmsProvider() {
  const active = await prisma.smsProviderConfig.findFirst({
    where: { isActive: true },
  });
  if (active) return active;

  return prisma.smsProviderConfig.findUnique({
    where: { providerKey: "SANDBOX" },
  });
}

export async function sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
  const config = await getActiveSmsProvider();
  const providerKey = config?.providerKey ?? "SANDBOX";

  let result: SendSmsResult = {
    success: false,
    providerKey,
    status: "FAILED",
  };

  try {
    if (!config || providerKey === "SANDBOX" || !config.apiKey) {
      const fakeId = `SBX-${Date.now()}`;
      console.info(
        `[SMS SANDBOX] To: ${options.phone} | Type: ${options.templateType} | Msg: ${options.message.replace(/\n/g, " ")}`
      );
      result = {
        success: true,
        providerKey: "SANDBOX",
        status: "SANDBOX_LOGGED",
        messageId: fakeId,
        sandboxCode: options.patternValues?.code,
      };
    } else if (providerKey === "MELLIPAYAMAK") {
      const patternCode =
        options.templateType === "OTP"
          ? config.otpPatternCode
          : options.templateType === "ORDER_COMPLETE"
            ? config.orderPatternCode
            : config.expiryPatternCode;

      if (patternCode) {
        const res = await fetch(
          "https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: config.username,
              password: config.password || config.apiKey,
              text: Object.values(options.patternValues ?? {}).join(";"),
              to: options.phone,
              bodyId: Number(patternCode),
            }),
          }
        );
        const data = await res.json();
        const ok = res.ok && Number(data?.RetStatus) === 1;
        result = {
          success: ok,
          providerKey,
          status: ok ? "SENT" : "FAILED",
          messageId: String(data?.Value ?? ""),
          error: ok ? undefined : JSON.stringify(data),
        };
      } else {
        const res = await fetch(
          "https://rest.payamak-panel.com/api/SendSMS/SendSMS",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: config.username,
              password: config.password || config.apiKey,
              to: options.phone,
              from: config.senderLine,
              text: options.message,
            }),
          }
        );
        const data = await res.json();
        const ok = res.ok && Number(data?.RetStatus) === 1;
        result = {
          success: ok,
          providerKey,
          status: ok ? "SENT" : "FAILED",
          messageId: String(data?.Value ?? ""),
          error: ok ? undefined : JSON.stringify(data),
        };
      }
    } else if (providerKey === "SMSIR") {
      const patternCode =
        options.templateType === "OTP"
          ? config.otpPatternCode
          : options.templateType === "ORDER_COMPLETE"
            ? config.orderPatternCode
            : config.expiryPatternCode;

      if (patternCode) {
        const res = await fetch("https://api.sms.ir/v1/send/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
          },
          body: JSON.stringify({
            mobile: options.phone,
            templateId: Number(patternCode),
            parameters: Object.entries(options.patternValues ?? {}).map(
              ([name, value]) => ({ name, value })
            ),
          }),
        });
        const data = await res.json();
        const ok = res.ok && data?.status === 1;
        result = {
          success: ok,
          providerKey,
          status: ok ? "SENT" : "FAILED",
          messageId: String(data?.data?.messageId ?? ""),
          error: ok ? undefined : JSON.stringify(data),
        };
      } else {
        const res = await fetch("https://api.sms.ir/v1/send/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
          },
          body: JSON.stringify({
            lineNumber: Number(config.senderLine),
            messageText: options.message,
            mobiles: [options.phone],
          }),
        });
        const data = await res.json();
        const ok = res.ok && data?.status === 1;
        result = {
          success: ok,
          providerKey,
          status: ok ? "SENT" : "FAILED",
          messageId: String(data?.data?.packId ?? ""),
          error: ok ? undefined : JSON.stringify(data),
        };
      }
    } else if (providerKey === "KAVENEGAR") {
      const patternCode =
        options.templateType === "OTP"
          ? config.otpPatternCode
          : options.templateType === "ORDER_COMPLETE"
            ? config.orderPatternCode
            : config.expiryPatternCode;

      if (patternCode) {
        const params = new URLSearchParams({
          receptor: options.phone,
          template: patternCode,
          token: options.patternValues?.code ?? options.message,
        });
        const res = await fetch(
          `https://api.kavenegar.com/v1/${config.apiKey}/verify/lookup.json?${params.toString()}`
        );
        const data = await res.json();
        const ok = res.ok && data?.return?.status === 200;
        result = {
          success: ok,
          providerKey,
          status: ok ? "SENT" : "FAILED",
          messageId: String(data?.entries?.[0]?.messageid ?? ""),
          error: ok ? undefined : JSON.stringify(data),
        };
      } else {
        const params = new URLSearchParams({
          receptor: options.phone,
          sender: config.senderLine,
          message: options.message,
        });
        const res = await fetch(
          `https://api.kavenegar.com/v1/${config.apiKey}/sms/send.json?${params.toString()}`
        );
        const data = await res.json();
        const ok = res.ok && data?.return?.status === 200;
        result = {
          success: ok,
          providerKey,
          status: ok ? "SENT" : "FAILED",
          messageId: String(data?.entries?.[0]?.messageid ?? ""),
          error: ok ? undefined : JSON.stringify(data),
        };
      }
    } else if (providerKey === "IPPANEL") {
      const patternCode =
        options.templateType === "OTP"
          ? config.otpPatternCode
          : options.templateType === "ORDER_COMPLETE"
            ? config.orderPatternCode
            : config.expiryPatternCode;

      const res = await fetch("https://edge.ippanel.com/v1/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: config.apiKey,
        },
        body: JSON.stringify(
          patternCode
            ? {
                sending_type: "pattern",
                from_number: config.senderLine,
                code: patternCode,
                recipients: [options.phone],
                params: options.patternValues ?? {},
              }
            : {
                sending_type: "webservice",
                from_number: config.senderLine,
                message: options.message,
                params: { recipients: [options.phone] },
              }
        ),
      });
      const data = await res.json();
      const ok = res.ok && (data?.meta?.status === true || data?.status === "OK");
      result = {
        success: ok,
        providerKey,
        status: ok ? "SENT" : "FAILED",
        messageId: String(data?.data?.message_outbox_ids?.[0] ?? ""),
        error: ok ? undefined : JSON.stringify(data),
      };
    }
  } catch (err) {
    result = {
      success: false,
      providerKey,
      status: "FAILED",
      error: err instanceof Error ? err.message : "Unknown SMS error",
    };
  }

  await prisma.smsLog.create({
    data: {
      providerKey: result.providerKey,
      phone: options.phone,
      message: options.message,
      templateType: options.templateType,
      status: result.status,
      providerMessageId: result.messageId ?? result.error ?? null,
    },
  });

  return result;
}
