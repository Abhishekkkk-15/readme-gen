import crypto from 'crypto';

type StoredProvider = 'openai' | 'gemini' | 'groq';

const PROVIDER_LABELS: Record<StoredProvider, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  groq: 'Groq',
};

const ENCRYPTED_PREFIX = 'enc:v1';

type UserWithApiKeys = {
  apiKeys?: {
    provider: string;
    key: string;
    lastUsed: string;
  }[];
};

function getEncryptionSecret() {
  return process.env.API_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'dev-only-change-me';
}

function getDerivedKey() {
  return crypto.scryptSync(getEncryptionSecret(), 'readme-gen-api-keys', 32);
}

export function normalizeStoredProvider(value: unknown): StoredProvider | null {
  const provider = String(value || '').trim().toLowerCase();
  if (provider === 'openai') return 'openai';
  if (provider === 'gemini' || provider === 'google') return 'gemini';
  if (provider === 'groq') return 'groq';
  return null;
}

export function getProviderLabel(provider: StoredProvider): string {
  return PROVIDER_LABELS[provider];
}

export function maskApiKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 2)}••••`;
  }
  return `${trimmed.slice(0, 6)}••••${trimmed.slice(-4)}`;
}

export function encryptApiKey(rawKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getDerivedKey(), iv);
  const encrypted = Buffer.concat([cipher.update(rawKey.trim(), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENCRYPTED_PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decryptApiKey(value: string): string {
  if (!value.startsWith(`${ENCRYPTED_PREFIX}:`)) {
    return value;
  }

  const [, , ivBase64, tagBase64, encryptedBase64] = value.split(':');
  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error('Invalid API key payload');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getDerivedKey(),
    Buffer.from(ivBase64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function sanitizeUserApiKeys<T extends UserWithApiKeys>(user: T) {
  const plain =
    typeof (user as any)?.toObject === 'function' ? (user as any).toObject() : { ...user };

  return {
    ...plain,
    apiKeys: (plain.apiKeys || [])
      .map((entry: { provider: string; key: string; lastUsed: string }) => {
        const provider = normalizeStoredProvider(entry.provider);
        if (!provider) return null;
        return {
          provider: getProviderLabel(provider),
          key: maskApiKey(decryptApiKey(entry.key)),
          lastUsed: entry.lastUsed,
        };
      })
      .filter(Boolean),
  };
}

export function upsertEncryptedApiKey(
  user: UserWithApiKeys,
  provider: StoredProvider,
  rawKey: string,
) {
  const next = (user.apiKeys || []).filter((entry) => normalizeStoredProvider(entry.provider) !== provider);
  next.push({
    provider,
    key: encryptApiKey(rawKey),
    lastUsed: new Date().toISOString(),
  });
  user.apiKeys = next;
}

export function removeStoredApiKey(user: UserWithApiKeys, provider: StoredProvider) {
  user.apiKeys = (user.apiKeys || []).filter(
    (entry) => normalizeStoredProvider(entry.provider) !== provider,
  );
}

export function getStoredApiKey(user: UserWithApiKeys, provider: StoredProvider): string | null {
  const entry = (user.apiKeys || []).find(
    (item) => normalizeStoredProvider(item.provider) === provider,
  );
  if (!entry) return null;
  return decryptApiKey(entry.key);
}

export function markStoredApiKeyUsed(user: UserWithApiKeys, provider: StoredProvider) {
  const entry = (user.apiKeys || []).find(
    (item) => normalizeStoredProvider(item.provider) === provider,
  );
  if (entry) {
    entry.lastUsed = new Date().toISOString();
  }
}
