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

    @ReactMethod
    fun hasEnabledAutofillServices(promise: com.facebook.react.bridge.Promise) {
        val context = reactApplicationContext
        val autofillManager = context.getSystemService(android.view.autofill.AutofillManager::class.java)
        
        if (autofillManager != null) {
            // Check if ANY autofill service is enabled (API 26+)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                promise.resolve(autofillManager.hasEnabledAutofillServices())
            } else {
                promise.resolve(false)
            }
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestSetAutofillService() {
        val context = reactApplicationContext
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val intent = android.content.Intent(android.provider.Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE)
            intent.data = android.net.Uri.parse("package:com.cosmic.vault")
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
    }
}
