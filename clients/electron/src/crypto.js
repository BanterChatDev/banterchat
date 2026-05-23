const crypto = require('crypto');
const { CRYPTO } = require('./config');

const { MAGIC, FORMAT_VERSION, SALT_LEN, NONCE_LEN, KEY_LEN, TAG_LEN, SCRYPT_N, SCRYPT_R, SCRYPT_P, SCRYPT_MAXMEM } = CRYPTO;
const HEADER_LEN = MAGIC.length + 1 + SALT_LEN + NONCE_LEN + KEY_LEN + TAG_LEN;

function deriveKEK(passphraseBuf, salt) {
  return crypto.scryptSync(passphraseBuf, salt, KEY_LEN, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM,
  });
}

function aesEncrypt(key, plaintext) {
  const nonce = crypto.randomBytes(NONCE_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { nonce, ct, tag };
}

function aesDecrypt(key, nonce, ct, tag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

function initSession(passphrase, plaintext) {
  const passBuf = Buffer.from(passphrase, 'utf8');
  const salt = crypto.randomBytes(SALT_LEN);
  const kek = deriveKEK(passBuf, salt);
  passBuf.fill(0);

  const dek = crypto.randomBytes(KEY_LEN);
  const wrapped = aesEncrypt(kek, dek);
  kek.fill(0);

  const data = aesEncrypt(dek, Buffer.from(plaintext, 'utf8'));

  const blob = Buffer.concat([
    MAGIC,
    Buffer.from([FORMAT_VERSION]),
    salt,
    wrapped.nonce, wrapped.ct, wrapped.tag,
    data.nonce, data.ct, data.tag,
  ]);
  return { blob, dek };
}

function unlockSession(passphrase, blob) {
  if (!Buffer.isBuffer(blob) || blob.length < HEADER_LEN) throw new Error('blob too short');
  if (!blob.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('bad magic');
  if (blob[MAGIC.length] !== FORMAT_VERSION) throw new Error('bad version');

  let off = MAGIC.length + 1;
  const salt = blob.subarray(off, off + SALT_LEN); off += SALT_LEN;
  const kekNonce = blob.subarray(off, off + NONCE_LEN); off += NONCE_LEN;
  const wrappedDek = blob.subarray(off, off + KEY_LEN); off += KEY_LEN;
  const kekTag = blob.subarray(off, off + TAG_LEN); off += TAG_LEN;
  const dataNonce = blob.subarray(off, off + NONCE_LEN); off += NONCE_LEN;
  const dataTag = blob.subarray(blob.length - TAG_LEN);
  const dataCt = blob.subarray(off, blob.length - TAG_LEN);

  const passBuf = Buffer.from(passphrase, 'utf8');
  const kek = deriveKEK(passBuf, salt);
  passBuf.fill(0);

  const dek = aesDecrypt(kek, kekNonce, wrappedDek, kekTag);
  kek.fill(0);

  const plaintext = aesDecrypt(dek, dataNonce, dataCt, dataTag);
  return { plaintext: plaintext.toString('utf8'), dek, salt, wrappedDek: { nonce: kekNonce, ct: wrappedDek, tag: kekTag } };
}

function reencryptData(dek, salt, plaintext, existingBlob) {
  let off = MAGIC.length + 1 + SALT_LEN;
  const kekNonce = existingBlob.subarray(off, off + NONCE_LEN); off += NONCE_LEN;
  const wrappedDek = existingBlob.subarray(off, off + KEY_LEN); off += KEY_LEN;
  const kekTag = existingBlob.subarray(off, off + TAG_LEN);

  const data = aesEncrypt(dek, Buffer.from(plaintext, 'utf8'));
  return Buffer.concat([
    MAGIC,
    Buffer.from([FORMAT_VERSION]),
    salt,
    kekNonce, wrappedDek, kekTag,
    data.nonce, data.ct, data.tag,
  ]);
}

function rewrapDEK(oldPassphrase, newPassphrase, existingBlob) {
  const unlocked = unlockSession(oldPassphrase, existingBlob);

  const passBuf = Buffer.from(newPassphrase, 'utf8');
  const newSalt = crypto.randomBytes(SALT_LEN);
  const newKek = deriveKEK(passBuf, newSalt);
  passBuf.fill(0);

  const newWrapped = aesEncrypt(newKek, unlocked.dek);
  newKek.fill(0);

  let off = MAGIC.length + 1 + SALT_LEN + NONCE_LEN + KEY_LEN + TAG_LEN;
  const dataNonce = existingBlob.subarray(off, off + NONCE_LEN); off += NONCE_LEN;
  const dataTag = existingBlob.subarray(existingBlob.length - TAG_LEN);
  const dataCt = existingBlob.subarray(off, existingBlob.length - TAG_LEN);

  const blob = Buffer.concat([
    MAGIC,
    Buffer.from([FORMAT_VERSION]),
    newSalt,
    newWrapped.nonce, newWrapped.ct, newWrapped.tag,
    dataNonce, dataCt, dataTag,
  ]);

  return { blob, dek: unlocked.dek };
}

module.exports = { initSession, unlockSession, reencryptData, rewrapDEK };