/**
 * 密码学与 token 工具（ESM）
 */
import crypto from 'node:crypto';

const JWT_SECRET = (process.env.JWT_SECRET || '').trim();
if (!JWT_SECRET) {
  throw new Error('[CopyCraft] 缺少环境变量 JWT_SECRET，启动被拒绝。');
}

const SESSION_TTL = parseInt(process.env.SESSION_TTL || `${30 * 24 * 3600}`, 10) * 1000;
const VERIFY_CODE_TTL = parseInt(process.env.VERIFY_CODE_TTL || '600', 10) * 1000;

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(pw, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST });
  return `${salt}:${derived.toString('hex')}`;
}

function verifyPassword(pw, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hex] = stored.split(':');
  const derived = crypto.scryptSync(pw, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST });
  const expected = Buffer.from(hex, 'hex');
  if (expected.length !== derived.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}
function unb64url(input) {
  return Buffer.from(input, 'base64url').toString();
}

function signToken(payloadObj) {
  const payload = base64url(JSON.stringify(payloadObj));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const dot = token.indexOf('.');
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig, 'base64url');
  const expBuf = Buffer.from(expected, 'base64url');
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try { return JSON.parse(unb64url(payload)); } catch { return null; }
}

function newSessionToken(userId, deviceId) {
  const now = Date.now();
  return signToken({ uid: userId, did: deviceId || null, iat: now, exp: now + SESSION_TTL });
}

const AES_KEY = crypto.scryptSync(JWT_SECRET || 'copycraft-fallback', 'copycraft-apikey-fixed-salt', 32);

function aesEncrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  const cip = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${cip.toString('base64')}`;
}

function aesDecrypt(enc) {
  if (!enc) return null;
  const [ivHex, tagHex, cip64] = enc.split(':');
  if (!ivHex || !tagHex || !cip64) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(cip64, 'base64')), decipher.final()]).toString('utf8');
}

function generateVerifyCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export {
  JWT_SECRET,
  SESSION_TTL,
  VERIFY_CODE_TTL,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  newSessionToken,
  aesEncrypt,
  aesDecrypt,
  generateVerifyCode,
};
