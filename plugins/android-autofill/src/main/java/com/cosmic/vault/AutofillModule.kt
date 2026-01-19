package com.cosmic.vault

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AutofillModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "CosmicAutofillModule"

    @ReactMethod
    fun setSessionKey(key: String) {
        VaultSession.sessionKey = key
    }
    
    @ReactMethod
    fun clearSessionKey() {
        VaultSession.sessionKey = null
    }
}
