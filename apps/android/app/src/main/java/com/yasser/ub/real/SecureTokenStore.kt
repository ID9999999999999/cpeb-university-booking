package com.yasser.ub.real

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Stores only the bearer token with an Android Keystore backed AES/GCM key.
 *
 * Non-sensitive display metadata (name/student id) can remain in ordinary
 * private SharedPreferences. The legacy plaintext token is migrated once and
 * removed. If a device restore/key invalidation makes ciphertext unreadable,
 * the secure session is discarded and the user signs in again.
 */
internal class SecureTokenStore(context: Context) {
    private val preferences =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun get(): String? {
        val encrypted = preferences.getString(ENCRYPTED_TOKEN, null)
        val iv = preferences.getString(TOKEN_IV, null)

        if (encrypted != null && iv != null) {
            return try {
                decrypt(encrypted, iv)
            } catch (_: Throwable) {
                clearSecureValues()
                null
            }
        }

        // One-time migration from releases that stored the token directly.
        val legacy = preferences.getString(LEGACY_TOKEN, null)
        if (!legacy.isNullOrBlank()) {
            return try {
                set(legacy)
                legacy
            } catch (_: Throwable) {
                preferences.edit().remove(LEGACY_TOKEN).apply()
                null
            }
        }

        return null
    }

    fun set(value: String?) {
        if (value.isNullOrBlank()) {
            clear()
            return
        }

        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key())

        val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        val encodedCiphertext = Base64.encodeToString(encrypted, Base64.NO_WRAP)
        val encodedIv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)

        preferences.edit()
            .putString(ENCRYPTED_TOKEN, encodedCiphertext)
            .putString(TOKEN_IV, encodedIv)
            .remove(LEGACY_TOKEN)
            .apply()
    }

    fun clear() {
        clearSecureValues()
        preferences.edit().remove(LEGACY_TOKEN).apply()
    }

    private fun clearSecureValues() {
        preferences.edit()
            .remove(ENCRYPTED_TOKEN)
            .remove(TOKEN_IV)
            .apply()
    }

    private fun decrypt(ciphertext: String, iv: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val decodedIv = Base64.decode(iv, Base64.NO_WRAP)
        cipher.init(
            Cipher.DECRYPT_MODE,
            key(),
            GCMParameterSpec(128, decodedIv),
        )

        val plaintext = cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP))
        return plaintext.toString(Charsets.UTF_8)
    }

    private fun key(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }

        val generator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEY_STORE,
        )

        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        )

        return generator.generateKey()
    }

    private companion object {
        const val PREFERENCES_NAME = "cpeb_session"
        const val LEGACY_TOKEN = "token"
        const val ENCRYPTED_TOKEN = "token_secure_v1"
        const val TOKEN_IV = "token_iv_v1"
        const val KEY_ALIAS = "cpeb_session_token_key_v1"
        const val ANDROID_KEY_STORE = "AndroidKeyStore"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}