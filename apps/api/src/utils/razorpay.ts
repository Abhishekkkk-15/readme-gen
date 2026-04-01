import crypto from 'crypto';

type RazorpayPlanCode = 'pro-monthly' | 'pro-annual';

type RazorpaySubscription = {
  id: string;
  plan_id: string;
  customer_id?: string | null;
  status: string;
  current_start?: number | null;
  current_end?: number | null;
  short_url?: string;
};

const API_BASE = 'https://api.razorpay.com/v1';

function getAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured');
  }
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

export function getPlanConfig(planCode: RazorpayPlanCode) {
  const planId =
    planCode === 'pro-annual'
      ? process.env.RAZORPAY_PLAN_PRO_ANNUAL_ID
      : process.env.RAZORPAY_PLAN_PRO_MONTHLY_ID;

  if (!planId) {
    throw new Error(`Missing Razorpay plan id for ${planCode}`);
  }

  return {
    planId,
    totalCount: planCode === 'pro-annual' ? 100 : 1200,
  };
}

async function razorpayRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const description =
      (data as any)?.error?.description ||
      (data as any)?.error?.reason ||
      `Razorpay request failed with status ${response.status}`;
    throw new Error(description);
  }

  return data as T;
}

export async function createRazorpaySubscription(input: {
  planCode: RazorpayPlanCode;
  userId: string;
  email: string;
}) {
  const { planId, totalCount } = getPlanConfig(input.planCode);
  return razorpayRequest<RazorpaySubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: true,
      notes: {
        userId: input.userId,
        email: input.email,
        planCode: input.planCode,
      },
    }),
  });
}

export async function fetchRazorpaySubscription(subscriptionId: string) {
  return razorpayRequest<RazorpaySubscription>(`/subscriptions/${subscriptionId}`, {
    method: 'GET',
  });
}

export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean,
) {
  return razorpayRequest<RazorpaySubscription>(`/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd }),
  });
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Razorpay webhook secret is not configured');
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export type { RazorpayPlanCode, RazorpaySubscription };
