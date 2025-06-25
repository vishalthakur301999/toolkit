import { Injectable } from '@angular/core';

// Helper function to convert ArrayBuffer to a Base64 string
function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Helper function to convert a Base64 string back to an ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}


@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  private textEncoder = new TextEncoder();
  private textDecoder = new TextDecoder();

  // Derives an encryption key from a password and salt using PBKDF2
  private async getKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.textEncoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypts text content
  async encrypt(
    content: string,
    password: string
  ): Promise<{ encryptedContent: string; iv: string; salt: string }> { // Return type updated
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.getKey(password, salt);

    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      this.textEncoder.encode(content)
    );

    return {
      encryptedContent: bufferToBase64(encryptedContent),
      iv: bufferToBase64(iv), // Return the iv
      salt: bufferToBase64(salt),
    };
  }

  // Decrypts text content
  async decrypt(
    encryptedContent: string,
    iv: string,
    salt: string,
    password: string
  ): Promise<string> {
    try {
      const saltBuffer = base64ToBuffer(salt);
      const ivBuffer = base64ToBuffer(iv);
      const encryptedBuffer = base64ToBuffer(encryptedContent);

      const key = await this.getKey(password, saltBuffer);

      const decryptedContent = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        key,
        encryptedBuffer
      );

      return this.textDecoder.decode(decryptedContent);
    } catch (e) {
      console.error("Decryption failed. Check password or data integrity.", e);
      // Return a specific error message or throw
      throw new Error('DECRYPTION_FAILED');
    }
  }
}
