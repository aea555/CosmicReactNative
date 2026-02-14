package com.cosmic.vault

/**
 * Singleton object to hold the Vault encryption key in memory.
 * This key is NEVER written to disk.
 * If the app process is killed, this memory is cleared, locking the autofill service.
 */
object VaultSession {
    var sessionKey: String? = null
}
