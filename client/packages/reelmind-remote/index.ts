/**
 * reelmind-remote — JS bridge for Fire TV remote input.
 *
 *  - onKeyEvent(handler): D-pad / ENTER / BACK key events from the remote
 *  - enableKeyEvents():   install the native key listener (call once)
 *  - consumeVoiceQuery(): read a voice query delivered by a Fire OS custom
 *                         voice intent (e.g. "OK Alexa, ask ReelMind ..."),
 *                         if one is pending. Returns null when there is none.
 *
 * Everything degrades gracefully when the native module is absent
 * (e.g. in web previews), so the app still runs with touch input.
 */
import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

const Native = NativeModules.ReelMindRemote || null;

export function isNativeAvailable(): boolean {
  return Native != null;
}

export function enableKeyEvents(): void {
  try {
    Native?.enableKeyEvents?.();
  } catch (e) {
    // No-op: touch input still works.
  }
}

export function consumeVoiceQuery(): string | null {
  if (Platform.OS !== 'android' || !Native?.consumeLaunchIntentText) return null;
  try {
    const text = Native.consumeLaunchIntentText();
    return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
  } catch (e) {
    return null;
  }
}

export function onKeyEvent(handler: (ev: { key: string }) => void): { remove(): void } {
  // RN 0.81 removed the NativeEventEmitter base class from the Android
  // bundle, so the native module emits through the core DeviceEventEmitter
  // directly. The JS singleton is the matching channel (and the listener is
  // a harmless no-op in web previews, where nothing emits on it).
  const sub = DeviceEventEmitter.addListener('reelmind_key_event', handler);
  return { remove: () => sub.remove() };
}
