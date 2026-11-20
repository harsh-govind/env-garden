import { CRYPTO_KEY_BYTE_LENGTH } from "@/constants/crypto";
import { concatBytes, fromBase64, toBase64 } from "@/lib/crypto/encoding";
import type { Sodium } from "@/lib/crypto/sodium";

export function aeadEncrypt(
    sodium: Sodium,
    plaintext: Uint8Array,
    key: Uint8Array,
    associatedData: Uint8Array
) {
    if (key.length !== CRYPTO_KEY_BYTE_LENGTH) {
        throw new Error("Encryption key must be 32 bytes.");
    }

    const nonce = sodium.randombytes_buf(
        sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
    );
    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext,
        associatedData,
        null,
        nonce,
        key
    );

    return toBase64(sodium, concatBytes(nonce, ciphertext));
}

export function aeadDecrypt(
    sodium: Sodium,
    payload: string,
    key: Uint8Array,
    associatedData: Uint8Array
) {
    if (key.length !== CRYPTO_KEY_BYTE_LENGTH) {
        throw new Error("Encryption key must be 32 bytes.");
    }

    const bytes = fromBase64(sodium, payload);
    const nonceLength = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;

    if (bytes.length < nonceLength + sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES) {
        throw new Error("Encrypted payload is too short.");
    }

    try {
        return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
            null,
            bytes.subarray(nonceLength),
            associatedData,
            bytes.subarray(0, nonceLength),
            key
        );
    } catch {
        throw new Error("Decryption failed. The data was modified or the key is wrong.");
    }
}
