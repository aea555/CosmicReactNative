package com.cosmic.vault

import android.app.assist.AssistStructure
import android.app.assist.AssistStructure.ViewNode
import android.content.Context
import android.service.autofill.AutofillService
import android.service.autofill.Dataset
import android.service.autofill.FillCallback
import android.service.autofill.FillContext
import android.service.autofill.FillRequest
import android.service.autofill.FillResponse
import android.service.autofill.SaveCallback
import android.service.autofill.SaveInfo
import android.service.autofill.SaveRequest
import android.util.Log
import android.view.autofill.AutofillId
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import android.os.CancellationSignal
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class CosmicAutofillService : AutofillService() {

    // Must match the filename used in autofillSync.ts
    private val REF_FILE_NAME = "vault_mirror.json"
    private val SAVE_FILE_NAME = "pending_saves.json"

    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: CancellationSignal,
        callback: FillCallback
    ) {
        val structure = request.fillContexts.lastOrNull()?.structure
        if (structure == null) {
            Log.d("CosmicAutofill", "onFillRequest: No structure found")
            callback.onSuccess(null)
            return
        }

        // 1. Identify target package (the app being filled)
        val targetPackageName = structure.activityComponent.packageName
        // OUR app's package name for resources
        val ourPackageName = applicationContext.packageName
        Log.d("CosmicAutofill", "onFillRequest for: $targetPackageName (our pkg: $ourPackageName)")

        // CRITICAL FIX: Do not attempt to autofill our own app (login page, unlock screen, etc.)
        if (targetPackageName == ourPackageName) {
            Log.d("CosmicAutofill", "Skipping autofill for self")
            callback.onSuccess(null)
            return
        }

        // 2. Identify fields (Traverse structure)
        val parser = StructureParser(structure)
        parser.parse()

        Log.d("CosmicAutofill", "Parsed fields - usernameId: ${parser.usernameId}, passwordId: ${parser.passwordId}")

        if (parser.usernameId == null && parser.passwordId == null) {
            Log.d("CosmicAutofill", "No autofillable fields found")
            callback.onSuccess(null)
            return
        }

        // 3. Load Vault Data
        val secrets = loadVaultData()
        Log.d("CosmicAutofill", "Loaded ${secrets.size} secrets from vault")
        
        if (secrets.isEmpty()) {
            // Still configure SaveInfo so we can capture new credentials
            if (parser.usernameId != null && parser.passwordId != null) {
                val responseBuilder = FillResponse.Builder()
                val saveInfo = SaveInfo.Builder(
                    SaveInfo.SAVE_DATA_TYPE_PASSWORD or SaveInfo.SAVE_DATA_TYPE_USERNAME,
                    arrayOf(parser.usernameId, parser.passwordId)
                ).build()
                responseBuilder.setSaveInfo(saveInfo)
                callback.onSuccess(responseBuilder.build())
            } else {
                callback.onSuccess(null)
            }
            return
        }

        // 4. Get web domain if available (for web forms in Chrome)
        val webDomain = getWebDomain(structure)
        Log.d("CosmicAutofill", "Web domain: $webDomain")

        // 5. Filter secrets by relevance
        val relevantSecrets = if (webDomain != null && webDomain.isNotEmpty()) {
            // For web forms, match against the domain
            // ONLY match secrets that have a URL set
            secrets.filter { secret ->
                val url = secret.optString("url", "").lowercase()
                val title = secret.optString("title", "").lowercase()
                val domain = webDomain.lowercase()
                
                // Must have a non-empty URL for web form matching
                if (url.isEmpty()) {
                    false
                } else {
                    val cleanUrl = url.replace("https://", "").replace("http://", "").replace("www.", "")
                    // Check if URL contains domain, or domain contains URL, or title equals domain
                    url.contains(domain) || domain.contains(cleanUrl) || title == domain
                }
            }.also {
                Log.d("CosmicAutofill", "Filtered ${it.size} secrets matching domain: $webDomain")
            }
        } else {
            // For native apps, match against package name
            // Secrets saved from native apps have title format: "AppName (com.package.name)"
            val packageLower = targetPackageName.lowercase()
            secrets.filter { secret ->
                val url = secret.optString("url", "").lowercase()
                val title = secret.optString("title", "").lowercase()
                
                // Strict match: title contains the full package name in parentheses
                // Or URL contains package (for manually entered secrets)
                
                // Fix: Check empty URL prevents ".contains("")" from matching everything
                val cleanUrl = url.replace("https://", "").replace("http://", "").replace("www.", "")
                val isUrlMatch = if (cleanUrl.isNotEmpty()) {
                    url.contains(packageLower) || packageLower.contains(cleanUrl)
                } else {
                    false
                }
                
                title.contains("($packageLower)") || isUrlMatch
            }.also {
                Log.d("CosmicAutofill", "Filtered ${it.size} secrets matching package: $targetPackageName")
            }
        }

        // If no relevant secrets found, still configure SaveInfo but don't show suggestions
        if (relevantSecrets.isEmpty()) {
            Log.d("CosmicAutofill", "No matching secrets found, configuring save only")
            if (parser.usernameId != null && parser.passwordId != null) {
                val responseBuilder = FillResponse.Builder()
                val saveInfo = SaveInfo.Builder(
                    SaveInfo.SAVE_DATA_TYPE_PASSWORD or SaveInfo.SAVE_DATA_TYPE_USERNAME,
                    arrayOf(parser.usernameId, parser.passwordId)
                ).build()
                responseBuilder.setSaveInfo(saveInfo)
                callback.onSuccess(responseBuilder.build())
            } else {
                callback.onSuccess(null)
            }
            return
        }

        // 6. Build Response
        val responseBuilder = FillResponse.Builder()
        var datasetsAdded = 0
        
        relevantSecrets.forEach { secret ->
            val username = secret.optString("username", "")
            val password = secret.optString("password", "")
            val title = secret.optString("title", "Saved Login")

            Log.d("CosmicAutofill", "Processing secret: $title, user=$username, hasPass=${password.isNotEmpty()}")

            if (username.isNotEmpty() && password.isNotEmpty()) {
                try {
                    // Look up layouts in OUR app's package, not the target's
                    val layoutId = resources.getIdentifier("item_autofill", "layout", ourPackageName)
                    
                    if (layoutId != 0) {
                         val presentation = RemoteViews(ourPackageName, layoutId)
                         val titleId = resources.getIdentifier("text_title", "id", ourPackageName)
                         val userId = resources.getIdentifier("text_username", "id", ourPackageName)
                         
                         presentation.setTextViewText(titleId, title)
                         presentation.setTextViewText(userId, username)

                         val datasetBuilder = Dataset.Builder(presentation)
                         
                         // Bind values to fields
                         parser.usernameId?.let { id ->
                             datasetBuilder.setValue(id, AutofillValue.forText(username))
                         }
                         parser.passwordId?.let { id ->
                             datasetBuilder.setValue(id, AutofillValue.forText(password))
                         }
                         
                         responseBuilder.addDataset(datasetBuilder.build())
                         datasetsAdded++
                         Log.d("CosmicAutofill", "Added dataset for: $title")
                    } else {
                        Log.e("CosmicAutofill", "Layout item_autofill not found in $ourPackageName")
                    }
                } catch (e: Exception) {
                    Log.e("CosmicAutofill", "Error building dataset for $title", e)
                }
            } else {
                Log.d("CosmicAutofill", "Skipped secret (empty user/pass): $title")
            }
        }

        Log.d("CosmicAutofill", "Added $datasetsAdded datasets to response")

        // 5. Configure Save Info
        if (parser.usernameId != null && parser.passwordId != null) {
            val saveInfo = SaveInfo.Builder(
                SaveInfo.SAVE_DATA_TYPE_PASSWORD or SaveInfo.SAVE_DATA_TYPE_USERNAME,
                arrayOf(parser.usernameId, parser.passwordId)
            ).build()
            responseBuilder.setSaveInfo(saveInfo)
        }

        if (datasetsAdded > 0) {
            callback.onSuccess(responseBuilder.build())
        } else {
            // No datasets but we still want SaveInfo
            if (parser.usernameId != null && parser.passwordId != null) {
                callback.onSuccess(responseBuilder.build())
            } else {
                callback.onSuccess(null)
            }
        }
    }

    override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
        val structure = request.fillContexts.lastOrNull()?.structure
        if (structure == null) {
            callback.onSuccess()
            return
        }

        val parser = StructureParser(structure)
        parser.parse()

        val username = parser.usernameValue ?: ""
        val password = parser.passwordValue ?: ""
        val packageName = structure.activityComponent.packageName
        val webDomain = getWebDomain(structure)

        Log.d("CosmicAutofill", "onSaveRequest: pkg=$packageName, domain=$webDomain, user=$username")

        if (username.isNotEmpty() && password.isNotEmpty()) {
            val entry = JSONObject().apply {
                put("packageName", packageName)
                put("username", username)
                put("password", password)
                put("webDomain", webDomain ?: "") // Include web domain for URL
                put("timestamp", System.currentTimeMillis())
            }
            appendPendingSave(entry)
            Log.d("CosmicAutofill", "Saved pending credentials for ${webDomain ?: packageName}")
        }

        callback.onSuccess()
    }

    private fun getWebDomain(structure: AssistStructure): String? {
        // Try to extract web domain from Chrome's structure
        for (i in 0 until structure.windowNodeCount) {
            val windowNode = structure.getWindowNodeAt(i)
            val domain = findWebDomain(windowNode.rootViewNode)
            if (domain != null) return domain
        }
        return null
    }

    private fun findWebDomain(node: ViewNode): String? {
        // Check this node's webDomain property
        val webDomain = node.webDomain
        if (webDomain != null && webDomain.isNotEmpty()) {
            return webDomain
        }
        
        // Recurse into children
        for (i in 0 until node.childCount) {
            val childDomain = findWebDomain(node.getChildAt(i))
            if (childDomain != null) return childDomain
        }
        return null
    }

    private fun loadVaultData(): List<JSONObject> {
        // The filesDir should be the same for the main app and this service
        val file = File(filesDir, REF_FILE_NAME) // Renamed contentFile to file for consistency with new snippet

        Log.d("CosmicAutofill", "Looking for vault at: ${file.absolutePath}")
        Log.d("CosmicAutofill", "Files in filesDir: ${filesDir.listFiles()?.map { it.name }}")

        val secrets = mutableListOf<JSONObject>()
        if (!file.exists()) {
             Log.w("CosmicAutofill", "Content file not found: ${file.absolutePath}")
             return secrets
        }

        try {
            // 1. Check for Session Key (Memory Only)
            val keyHex = VaultSession.sessionKey
            if (keyHex == null) {
                Log.d("CosmicAutofill", "No session key in memory. Autofill locked.")
                return secrets // Empty list
            }

            // 2. Read Encrypted Content
            val encryptedJson = file.readText()
            Log.d("CosmicAutofill", "Content file size: ${encryptedJson.length}")
            
            val payload = JSONObject(encryptedJson)
            val ivHex = payload.getString("iv")
            val encryptedBase64 = payload.getString("data")

            val ivBytes = hexStringToByteArray(ivHex)
            val encryptedBytes = android.util.Base64.decode(encryptedBase64, android.util.Base64.DEFAULT)
            
            val keyBytes = hexStringToByteArray(keyHex)
            val secretKey = javax.crypto.spec.SecretKeySpec(keyBytes, "AES")

            // 3. Decrypt
            val cipher = javax.crypto.Cipher.getInstance("AES/CBC/PKCS5Padding")
            val ivSpec = javax.crypto.spec.IvParameterSpec(ivBytes)
            cipher.init(javax.crypto.Cipher.DECRYPT_MODE, secretKey, ivSpec)
            
            val decryptedBytes = cipher.doFinal(encryptedBytes)
            val decryptedString = String(decryptedBytes, Charsets.UTF_8)
            Log.d("CosmicAutofill", "Decrypted ${decryptedString.length} chars")

            // 4. Parse JSON Array
            val jsonArray = JSONArray(decryptedString)
            for (i in 0 until jsonArray.length()) {
                secrets.add(jsonArray.getJSONObject(i))
            }
        } catch (e: Exception) {
            Log.e("CosmicAutofill", "Error loading vault data", e)
        }
        return secrets
    }

    private fun hexStringToByteArray(s: String): ByteArray {
        val len = s.length
        val data = ByteArray(len / 2)
        var i = 0
        while (i < len) {
            data[i / 2] = ((Character.digit(s[i], 16) shl 4) + Character.digit(s[i + 1], 16)).toByte()
            i += 2
        }
        return data
    }

    private fun appendPendingSave(entry: JSONObject) {
        val file = File(filesDir, SAVE_FILE_NAME)
        val currentList = if (file.exists()) {
            try {
                val array = JSONArray(file.readText())
                 val list = mutableListOf<JSONObject>()
                for (i in 0 until array.length()) list.add(array.getJSONObject(i))
                list
            } catch (e: Exception) { mutableListOf() }
        } else {
            mutableListOf()
        }
        
        currentList.add(entry)
        
        // Write back
        val newArray = JSONArray()
        currentList.forEach { newArray.put(it) }
        file.writeText(newArray.toString())
    }

    // Helper class to traverse the View Structure and find relevant input fields
    class StructureParser(private val structure: AssistStructure) {
        var usernameId: AutofillId? = null
        var passwordId: AutofillId? = null
        val autofillIds = mutableListOf<AutofillId>()
        
        var usernameValue: String? = null
        var passwordValue: String? = null

        fun parse() {
            val nodes = structure.windowNodeCount
            Log.d("CosmicAutofill", "Parsing $nodes window nodes")
            for (i in 0 until nodes) {
                val windowNode = structure.getWindowNodeAt(i)
                Log.d("CosmicAutofill", "Window $i: ${windowNode.title}")
                traverse(windowNode.rootViewNode, 0)
            }
        }

        private fun traverse(node: ViewNode, depth: Int) {
            val indent = "  ".repeat(depth)
            val autofillId = node.autofillId
            val className = node.className ?: ""
            val idEntry = node.idEntry ?: ""
            val hints = node.autofillHints
            val inputType = node.inputType
            val htmlInfo = node.htmlInfo
            
            // Log detailed info about each node for debugging
            if (autofillId != null && (className.contains("Edit") || className.contains("Input") || htmlInfo != null)) {
                Log.d("CosmicAutofill", "${indent}Node: class=$className, id=$idEntry, hints=${hints?.toList()}, inputType=$inputType, htmlInfo=${htmlInfo?.tag}/${htmlInfo?.attributes}")
            }
            
            var isUsername = false
            var isPassword = false
            
            // 1. Check Autofill Hints (most reliable)
            if (hints != null) {
                if (hints.any { it.contains("username", ignoreCase = true) || 
                               it.contains("email", ignoreCase = true) || 
                               it == android.view.View.AUTOFILL_HINT_USERNAME ||
                               it == android.view.View.AUTOFILL_HINT_EMAIL_ADDRESS }) {
                    isUsername = true
                }
                if (hints.any { it.contains("password", ignoreCase = true) ||
                               it == android.view.View.AUTOFILL_HINT_PASSWORD }) {
                    isPassword = true
                }
            }
            
            // 2. Check HTML info for web forms (Chrome WebView)
            if (htmlInfo != null) {
                val tag = htmlInfo.tag?.lowercase() ?: ""
                val attrs = htmlInfo.attributes ?: emptyList()
                
                // Build a map of attributes
                val attrMap = mutableMapOf<String, String>()
                for (i in 0 until attrs.size step 2) {
                    if (i + 1 < attrs.size) {
                        attrMap[attrs[i].first.lowercase()] = attrs[i].second?.lowercase() ?: ""
                    }
                }
                
                val inputTypeAttr = attrMap["type"] ?: ""
                val nameAttr = attrMap["name"] ?: ""
                val autocomplete = attrMap["autocomplete"] ?: ""
                
                Log.d("CosmicAutofill", "${indent}HTML: tag=$tag, type=$inputTypeAttr, name=$nameAttr, autocomplete=$autocomplete")
                
                if (tag == "input") {
                    // Check type attribute
                    if (inputTypeAttr == "password") {
                        isPassword = true
                    }
                    
                    // Check name/autocomplete for username patterns
                    val usernamePatterns = listOf("user", "email", "login", "account", "name")
                    val passwordPatterns = listOf("pass", "pwd", "secret")
                    
                    if (!isPassword && usernamePatterns.any { nameAttr.contains(it) || autocomplete.contains(it) }) {
                        isUsername = true
                    }
                    if (passwordPatterns.any { nameAttr.contains(it) || autocomplete.contains(it) }) {
                        isPassword = true
                    }
                }
            }
            
            // 3. Check idEntry for common patterns
            val idLower = idEntry.lowercase()
            if (!isUsername && !isPassword) {
                val usernamePatterns = listOf("user", "email", "login", "account")
                val passwordPatterns = listOf("pass", "pwd", "secret")
                
                if (usernamePatterns.any { idLower.contains(it) }) {
                    isUsername = true
                }
                if (passwordPatterns.any { idLower.contains(it) }) {
                    isPassword = true
                }
            }
            
            // 4. Check InputType as fallback
            if (!isPassword && inputType != 0) {
                val isPasswordType = (inputType and android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD != 0) ||
                                     (inputType and android.text.InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD != 0) ||
                                     (inputType and android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD != 0)
                if (isPasswordType) {
                    isPassword = true
                }
            }
            
            // Assign IDs
            if (isUsername && usernameId == null && autofillId != null) {
                usernameId = autofillId
                usernameValue = node.autofillValue?.textValue?.toString()
                Log.d("CosmicAutofill", "${indent}>>> Found USERNAME field: $idEntry")
            }
            
            if (isPassword && passwordId == null && autofillId != null) {
                passwordId = autofillId
                passwordValue = node.autofillValue?.textValue?.toString()
                Log.d("CosmicAutofill", "${indent}>>> Found PASSWORD field: $idEntry")
            }
            
            if (autofillId != null) {
                autofillIds.add(autofillId)
            }
            
            // Recurse into children
            for (i in 0 until node.childCount) {
                traverse(node.getChildAt(i), depth + 1)
            }
        }
    }
}
