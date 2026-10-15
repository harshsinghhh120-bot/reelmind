package com.reelmind.remote

import android.app.Activity
import android.view.KeyEvent
import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager

/**
 * Fire TV remote bridge.
 *
 * Key events: installs an OnKeyListener on the React root view and forwards
 * D-pad / ENTER / BACK to JS as `reelmind_key_event` with {key: up|down|left|
 * right|enter|back}. JS owns focus navigation; the TV app's virtual focus
 * system lives entirely in TypeScript.
 *
 * Voice: Fire OS custom voice intents (registered in the Fire OS Developer
 * Options console, action `com.reelmind.app.ASK`) relaunch the app with the
 * spoken text. `consumeLaunchIntentText()` reads it from the activity intent
 * (extra "query", or the data URI query param) and clears the intent so the
 * same utterance is never processed twice.
 */
class ReelMindRemoteModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "ReelMindRemote"
        const val EVENT_KEY = "reelmind_key_event"
    }

    private var listenerInstalled = false

    override fun getName(): String = NAME

    @ReactMethod
    fun enableKeyEvents() {
        val activity = reactApplicationContext.currentActivity ?: return
        val root = (activity as? com.facebook.react.ReactActivity)?.reactDelegate?.reactRootView ?: return
        root.isFocusableInTouchMode = true
        root.isFocusable = true
        root.requestFocus()
        if (listenerInstalled) return
        listenerInstalled = true
        root.setOnKeyListener { _: View, keyCode: Int, event: KeyEvent ->
            if (event.action != KeyEvent.ACTION_DOWN) return@setOnKeyListener false
            val key = when (keyCode) {
                KeyEvent.KEYCODE_DPAD_UP -> "up"
                KeyEvent.KEYCODE_DPAD_DOWN -> "down"
                KeyEvent.KEYCODE_DPAD_LEFT -> "left"
                KeyEvent.KEYCODE_DPAD_RIGHT -> "right"
                KeyEvent.KEYCODE_DPAD_CENTER,
                KeyEvent.KEYCODE_ENTER,
                KeyEvent.KEYCODE_NUMPAD_ENTER,
                KeyEvent.KEYCODE_SEARCH -> "enter"
                KeyEvent.KEYCODE_BACK -> "back"
                else -> null
            }
            if (key == null) return@setOnKeyListener false
            // RN 0.81: the NativeEventEmitter base class is gone, so emit
            // directly through the core DeviceEventEmitter JS module.
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_KEY, Arguments.createMap().apply { putString("key", key) })
            true // consumed: JS decides what back/enter do
        }
    }

    @ReactMethod
    fun consumeLaunchIntentText(): String? {
        val activity = reactApplicationContext.currentActivity ?: return null
        val intent = activity.intent ?: return null

        // 1) Extras, as configured in the Fire OS console (parameter -> extra name).
        for (extra in listOf("query", "value")) {
            intent.getStringExtra(extra)?.trim()?.takeIf { it.isNotEmpty() }?.let {
                clearIntent(activity)
                return it
            }
        }

        // 2) Data URI: reelmind:ask?query=<spoken text>, or a bare custom-scheme URI.
        intent.data?.let { data ->
            data.getQueryParameter("query")?.trim()?.takeIf { it.isNotEmpty() }?.let {
                clearIntent(activity)
                return it
            }
            if (data.scheme != null && data.scheme != "http" && data.scheme != "https") {
                data.toString().trim().takeIf { it.isNotEmpty() }?.let {
                    clearIntent(activity)
                    return it
                }
            }
        }

        // 3) Plain data string with no scheme.
        intent.dataString?.takeIf {
            it.isNotBlank() &&
                !it.contains("://") &&
                !it.startsWith("reelmind:ask?")
        }?.let {
            clearIntent(activity)
            return it
        }

        return null
    }

    private fun clearIntent(activity: Activity) {
        runCatching { activity.intent = null }
    }
}

class ReelMindRemotePackage : com.facebook.react.ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(ReelMindRemoteModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
