const crypto = require('crypto');

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex chars in .env');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plainText) {
  if (plainText === null || plainText === undefined) return null;
  const key    = getKey();
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc    = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':');
}

function decrypt(encryptedValue) {
  if (!encryptedValue) return null;
  const key               = getKey();
  const [ivH, tagH, encH] = encryptedValue.split(':');
  const decipher          = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivH, 'hex'));
  decipher.setAuthTag(Buffer.from(tagH, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encH, 'hex')),
    decipher.final()
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };