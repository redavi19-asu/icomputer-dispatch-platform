export type CarrierDevice = "windows" | "mac" | "linux" | "android" | "ios" | "unknown";

export function detectCarrierDevice(userAgent: string, touchPoints = 0): CarrierDevice {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1)) return "ios";
  if (/Windows/i.test(userAgent)) return "windows";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "mac";
  if (/Linux|X11/i.test(userAgent)) return "linux";
  return "unknown";
}

export const carrierDeviceAdvice: Record<CarrierDevice, string> = {
  windows: "Windows computer detected. Use Dispatcher in your browser now. The signed Windows installer will appear here after release.",
  mac: "Mac detected. Use Dispatcher in your browser now. Mac releases will offer Apple Silicon and Intel choices; your browser cannot reliably identify the processor.",
  linux: "Linux computer detected. Use Dispatcher in your browser now. A Linux package is not released yet.",
  android: "Android phone detected. Open Driver in Chrome, then choose Install app or Add to Home screen if offered. Google Play release is pending.",
  ios: "iPhone or iPad detected. Open Driver in Safari, then choose Share → Add to Home Screen. App Store release is pending.",
  unknown: "Choose Dispatcher for office operations or Driver for field work. You can open either web app on a supported browser.",
};
