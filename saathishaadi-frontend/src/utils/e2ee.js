const PRIVATE_KEY_STORAGE = 'e2eePrivateKey';
const PUBLIC_KEY_STORAGE = 'e2eePublicKey';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

const fromBase64 = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const getCrypto = () => window.crypto?.subtle;

export const ensureE2EEKeys = async (api) => {
  if (!getCrypto()) return null;

  let publicKey = localStorage.getItem(PUBLIC_KEY_STORAGE);
  let privateKey = localStorage.getItem(PRIVATE_KEY_STORAGE);

  if (!publicKey || !privateKey) {
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );

    publicKey = JSON.stringify(await window.crypto.subtle.exportKey('jwk', keyPair.publicKey));
    privateKey = JSON.stringify(await window.crypto.subtle.exportKey('jwk', keyPair.privateKey));
    localStorage.setItem(PUBLIC_KEY_STORAGE, publicKey);
    localStorage.setItem(PRIVATE_KEY_STORAGE, privateKey);
  }

  if (api) {
    await api.put('/users/e2ee-key', { e2eePublicKey: JSON.parse(publicKey) });
  }

  return JSON.parse(publicKey);
};

const deriveConversationKey = async (otherPublicKey) => {
  const crypto = getCrypto();
  if (!crypto || !otherPublicKey) return null;

  const privateKeyData = localStorage.getItem(PRIVATE_KEY_STORAGE);
  if (!privateKeyData) return null;

  const privateKey = await crypto.importKey(
    'jwk',
    JSON.parse(privateKeyData),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  );

  const publicKey = await crypto.importKey(
    'jwk',
    otherPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  return crypto.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptMessage = async (plainText, otherPublicKey) => {
  const crypto = getCrypto();
  const key = await deriveConversationKey(otherPublicKey);
  if (!crypto || !key) throw new Error('E2EE key available nahi hai');

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plainText)
  );

  return JSON.stringify({
    v: 1,
    alg: 'ECDH-P256-AESGCM',
    iv: toBase64(iv),
    data: toBase64(encrypted),
  });
};

export const decryptMessage = async (content, otherPublicKey) => {
  try {
    const payload = typeof content === 'string' ? JSON.parse(content) : content;
    if (!payload?.data || !payload?.iv) return content;

    const crypto = getCrypto();
    const key = await deriveConversationKey(otherPublicKey);
    if (!crypto || !key) return '🔒 Encrypted message';

    const decrypted = await crypto.decrypt(
      { name: 'AES-GCM', iv: fromBase64(payload.iv) },
      key,
      fromBase64(payload.data)
    );

    return textDecoder.decode(decrypted);
  } catch {
    return content;
  }
};
