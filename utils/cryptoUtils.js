// utils/cryptoUtils.js
const crypto = require('crypto');

// Generate RSA Key Pair (4096-bit)
function generateRSAKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
  });
  return { publicKey, privateKey };
}

// Encrypt AES key using recipient's RSA public key
function encryptAESKeyWithRSA(aesKey, publicKey) {
  return crypto.publicEncrypt(publicKey, Buffer.from(aesKey)).toString('base64');
}

// Decrypt AES key using recipient's RSA private key
function decryptAESKeyWithRSA(encryptedKey, privateKey) {
  return crypto.privateDecrypt(privateKey, Buffer.from(encryptedKey, 'base64')).toString();
}

// Encrypt chat message using AES key
function encryptMessage(plaintext, aesKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(aesKey, 'hex'), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt chat message using AES key
function decryptMessage(encryptedMessage, aesKey) {
  const [ivHex, encryptedHex] = encryptedMessage.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(aesKey, 'hex'), iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = {
  generateRSAKeys,
  encryptAESKeyWithRSA,
  decryptAESKeyWithRSA,
  encryptMessage,
  decryptMessage,
};
