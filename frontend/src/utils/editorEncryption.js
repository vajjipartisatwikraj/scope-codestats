import CryptoJS from 'crypto-js';

/**
 * Get the encryption key from environment variables
 * This is a shared secret key used across the platform
 */
export const getEncryptionKey = () => {
  const key = import.meta.env.VITE_ENCODING_ENCRYPT_KEY;
  if (!key) {
    console.error('⚠️ VITE_ENCODING_ENCRYPT_KEY not found in environment variables');
    return null;
  }
  return key;
};

/**
 * Encrypt code content using AES encryption with the platform key
 * @param {string} code - The code to encrypt
 * @returns {string|null} - Encrypted string or null on failure
 */
export const encryptCode = (code) => {
  try {
    const key = getEncryptionKey();
    if (!key) {
      throw new Error('Encryption key not available');
    }
    
    const encrypted = CryptoJS.AES.encrypt(code, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    return null;
  }
};

/**
 * Decrypt code content using AES decryption with the platform key
 * @param {string} encryptedCode - The encrypted code
 * @returns {string|null} - Decrypted string or null on failure
 */
export const decryptCode = (encryptedCode) => {
  try {
    const key = getEncryptionKey();
    if (!key) {
      throw new Error('Decryption key not available');
    }
    
    const decrypted = CryptoJS.AES.decrypt(encryptedCode, key);
    const originalCode = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!originalCode) {
      throw new Error('Decryption failed - invalid content or wrong key');
    }
    
    return originalCode;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

/**
 * Check if clipboard content is encrypted by SCOPE system
 * @param {string} content - Content to check
 * @returns {boolean}
 */
export const isEncryptedContent = (content) => {
  return content.includes('[SCOPE_ENCRYPTED]') && content.includes('[/SCOPE_ENCRYPTED]');
};

/**
 * Wrap encrypted content with identifiable markers
 * @param {string} encrypted - Encrypted content
 * @returns {string}
 */
export const wrapEncryptedContent = (encrypted) => {
  return `[SCOPE_ENCRYPTED]${encrypted}[/SCOPE_ENCRYPTED]`;
};

/**
 * Extract encrypted content from wrapper
 * @param {string} content - Wrapped content
 * @returns {string|null} - Extracted encrypted content or null
 */
export const unwrapEncryptedContent = (content) => {
  const match = content.match(/\[SCOPE_ENCRYPTED\](.*?)\[\/SCOPE_ENCRYPTED\]/s);
  return match ? match[1] : null;
};
