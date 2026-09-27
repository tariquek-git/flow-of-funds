export type DeepSeekBalance = {
  configured: boolean;
  ok: boolean;
  isAvailable: boolean | null;
  currency: string | null;
  totalBalanceUsd: number | null;
  grantedBalanceUsd: number | null;
  toppedUpBalanceUsd: number | null;
  lowBalance: boolean;
  overConfiguredCap: boolean;
  error: string | null;
};

type DeepSeekBalanceResponse = {
  is_available?: boolean;
  balance_infos?: {
    currency?: string;
    total_balance?: string;
    granted_balance?: string;
    topped_up_balance?: string;
  }[];
  error?: { message?: string };
};

const DEFAULT_DEEPSEEK_SPEND_CAP_USD = 30;
const DEFAULT_DEEPSEEK_LOW_BALANCE_USD = 5;

function numberEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function usd(value: string | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function deepSeekSpendCapUsd(): number {
  return numberEnv("DEEPSEEK_SPEND_CAP_USD", DEFAULT_DEEPSEEK_SPEND_CAP_USD);
}

export function deepSeekLowBalanceUsd(): number {
  return numberEnv("DEEPSEEK_LOW_BALANCE_USD", DEFAULT_DEEPSEEK_LOW_BALANCE_USD);
}

/**
 * Read-only DeepSeek account balance check for admin/status and ops watchdogs.
 * DeepSeek does not expose a public hard-cap API; this lets us verify the
 * provider-side prepaid balance ceiling and flag low balance before fallback dies.
 */
export async function getDeepSeekBalance(): Promise<DeepSeekBalance> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const cap = deepSeekSpendCapUsd();
  const low = deepSeekLowBalanceUsd();
  if (!apiKey) {
    return {
      configured: false,
      ok: false,
      isAvailable: null,
      currency: null,
      totalBalanceUsd: null,
      grantedBalanceUsd: null,
      toppedUpBalanceUsd: null,
      lowBalance: false,
      overConfiguredCap: false,
      error: "missing-key",
    };
  }

  // Timeout-guarded: this runs on every /admin status load, so a hung DeepSeek
  // connection must not stall the admin response. AbortController fires after
  // timeoutMs and surfaces as a calm `timeout-*` marker via the catch below.
  const controller = new AbortController();
  const timeoutMs = 2500;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/user/balance`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as DeepSeekBalanceResponse;
    if (!res.ok) {
      return {
        configured: true,
        ok: false,
        isAvailable: null,
        currency: null,
        totalBalanceUsd: null,
        grantedBalanceUsd: null,
        toppedUpBalanceUsd: null,
        lowBalance: false,
        overConfiguredCap: false,
        error: json.error?.message ? `http-${res.status}: ${json.error.message.slice(0, 120)}` : `http-${res.status}`,
      };
    }

    const usdInfo = json.balance_infos?.find((b) => b.currency === "USD") ?? json.balance_infos?.[0];
    const totalBalanceUsd = usd(usdInfo?.total_balance);
    const grantedBalanceUsd = usd(usdInfo?.granted_balance);
    const toppedUpBalanceUsd = usd(usdInfo?.topped_up_balance);
    return {
      configured: true,
      ok: true,
      isAvailable: json.is_available ?? null,
      currency: usdInfo?.currency ?? null,
      totalBalanceUsd,
      grantedBalanceUsd,
      toppedUpBalanceUsd,
      lowBalance: totalBalanceUsd != null && totalBalanceUsd <= low,
      overConfiguredCap: totalBalanceUsd != null && totalBalanceUsd > cap,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      isAvailable: null,
      currency: null,
      totalBalanceUsd: null,
      grantedBalanceUsd: null,
      toppedUpBalanceUsd: null,
      lowBalance: false,
      overConfiguredCap: false,
      error: controller.signal.aborted
        ? `timeout-${timeoutMs}ms`
        : error instanceof Error
          ? error.message.slice(0, 120)
          : "balance-check-failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
