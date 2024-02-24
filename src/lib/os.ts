const MACOS_PLATFORMS = ["macOS", "Macintosh", "MacIntel", "MacPPC", "Mac68K"]
const WINDOWS_PLATFORMS = ["Win32", "Win64", "Windows", "WinCE"]
const IOS_PLATFORMS = ["iPhone", "iPad", "iPod"]

export enum OS {
  iOS = 1,
  Android,
  Mac,
  Windows,
  Linux,
}

interface Navigator extends globalThis.Navigator {
  userAgentData?: {
    platform?: string
  }
}

/** https://stackoverflow.com/a/38241481/1032286 */
export function getOS(): OS | undefined {
  const userAgent = navigator.userAgent
  const platform =
    (navigator as Navigator)?.userAgentData?.platform || navigator.platform

  if (MACOS_PLATFORMS.indexOf(platform) !== -1) {
    return OS.Mac
  } else if (IOS_PLATFORMS.indexOf(platform) !== -1) {
    return OS.iOS
  } else if (WINDOWS_PLATFORMS.indexOf(platform) !== -1) {
    return OS.Windows
  } else if (/Android/.test(userAgent)) {
    return OS.Android
  } else if (/Linux/.test(platform)) {
    return OS.Linux
  }
}
