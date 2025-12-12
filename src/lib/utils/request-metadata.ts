/**
 * Request Metadata Utilities
 *
 * Extracts request metadata from headers for session tracking,
 * security logging, and geolocation information.
 *
 * Supports:
 * - Vercel geolocation headers
 * - User-Agent parsing for browser/OS/device detection
 * - IP address extraction from various proxy headers
 *
 * @module lib/utils/request-metadata
 */

import { headers } from 'next/headers';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Request metadata extracted from headers
 */
export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
}

// =============================================================================
// BROWSER DETECTION PATTERNS
// =============================================================================

interface BrowserPattern {
  name: string;
  pattern: RegExp;
  versionPattern?: RegExp;
}

const BROWSER_PATTERNS: BrowserPattern[] = [
  // Order matters - more specific patterns first
  { name: 'Edge', pattern: /Edg(e|A|iOS)?\//, versionPattern: /Edg(e|A|iOS)?\/(\d+[\d.]*)/ },
  { name: 'Opera', pattern: /OPR\/|Opera\//, versionPattern: /(?:OPR|Opera)\/(\d+[\d.]*)/ },
  {
    name: 'Samsung Internet',
    pattern: /SamsungBrowser\//,
    versionPattern: /SamsungBrowser\/(\d+[\d.]*)/,
  },
  { name: 'UC Browser', pattern: /UCBrowser\//, versionPattern: /UCBrowser\/(\d+[\d.]*)/ },
  { name: 'Firefox', pattern: /Firefox\//, versionPattern: /Firefox\/(\d+[\d.]*)/ },
  { name: 'Chrome', pattern: /Chrome\//, versionPattern: /Chrome\/(\d+[\d.]*)/ },
  { name: 'Safari', pattern: /Safari\//, versionPattern: /Version\/(\d+[\d.]*)/ },
  { name: 'IE', pattern: /MSIE|Trident\//, versionPattern: /(?:MSIE |rv:)(\d+[\d.]*)/ },
];

// =============================================================================
// OS DETECTION PATTERNS
// =============================================================================

interface OSPattern {
  name: string;
  pattern: RegExp;
  versionPattern?: RegExp;
}

const OS_PATTERNS: OSPattern[] = [
  { name: 'iOS', pattern: /iPhone|iPad|iPod/, versionPattern: /OS (\d+[_\d]*)/ },
  { name: 'macOS', pattern: /Mac OS X/, versionPattern: /Mac OS X (\d+[_\d.]*)/ },
  { name: 'Android', pattern: /Android/, versionPattern: /Android (\d+[\d.]*)/ },
  { name: 'Windows', pattern: /Windows/, versionPattern: /Windows NT (\d+[\d.]*)/ },
  { name: 'Linux', pattern: /Linux/, versionPattern: undefined },
  { name: 'Chrome OS', pattern: /CrOS/, versionPattern: undefined },
];

// Windows NT version mapping
const WINDOWS_VERSIONS: Record<string, string> = {
  '10.0': '10/11',
  '6.3': '8.1',
  '6.2': '8',
  '6.1': '7',
  '6.0': 'Vista',
  '5.1': 'XP',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Detects browser name and version from User-Agent string
 */
function detectBrowser(userAgent: string): { name: string | null; version: string | null } {
  for (const browser of BROWSER_PATTERNS) {
    if (browser.pattern.test(userAgent)) {
      let version: string | null = null;

      if (browser.versionPattern) {
        const match = userAgent.match(browser.versionPattern);
        if (match) {
          // Get the version from the appropriate capture group
          version = match[2] || match[1] || null;
          // Take only major.minor for cleaner display
          if (version) {
            const parts = version.split('.');
            version = parts.slice(0, 2).join('.');
          }
        }
      }

      return { name: browser.name, version };
    }
  }

  return { name: null, version: null };
}

/**
 * Detects operating system name and version from User-Agent string
 */
function detectOS(userAgent: string): { name: string | null; version: string | null } {
  for (const os of OS_PATTERNS) {
    if (os.pattern.test(userAgent)) {
      let version: string | null = null;

      if (os.versionPattern) {
        const match = userAgent.match(os.versionPattern);
        if (match && match[1]) {
          // Normalize version string (replace _ with .)
          version = match[1].replace(/_/g, '.');

          // Map Windows NT versions to consumer names
          const windowsVersion = WINDOWS_VERSIONS[version];
          if (os.name === 'Windows' && windowsVersion) {
            version = windowsVersion;
          } else {
            // Take only major.minor for cleaner display
            const parts = version.split('.');
            version = parts.slice(0, 2).join('.');
          }
        }
      }

      return { name: os.name, version };
    }
  }

  return { name: null, version: null };
}

/**
 * Detects device type from User-Agent string
 */
function detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  const ua = userAgent.toLowerCase();

  // Check for tablets first (they often include mobile keywords)
  if (/ipad|tablet|playbook|silk|android(?!.*mobile)/i.test(userAgent)) {
    return 'tablet';
  }

  // Check for mobile devices
  if (
    /mobile|iphone|ipod|android.*mobile|blackberry|opera mini|opera mobi|iemobile|windows phone|webos|palm|symbian|nokia|samsung|lg|htc|motorola|kindle/i.test(
      ua
    )
  ) {
    return 'mobile';
  }

  // Check for desktop indicators
  if (/windows|macintosh|linux|cros/i.test(userAgent)) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Extracts IP address from various headers
 * Checks common proxy headers in order of preference
 */
function extractIPAddress(headersList: Headers): string | null {
  // Vercel-specific header (most reliable on Vercel)
  const vercelIP = headersList.get('x-real-ip');
  if (vercelIP) {
    return vercelIP;
  }

  // Cloudflare header
  const cfIP = headersList.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }

  // Standard forwarded-for header (may contain multiple IPs)
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (original client)
    const firstIP = forwardedFor.split(',')[0]?.trim();
    if (firstIP) {
      return firstIP;
    }
  }

  // Fallback headers
  const trueClientIP = headersList.get('true-client-ip');
  if (trueClientIP) {
    return trueClientIP;
  }

  return null;
}

/**
 * Safely URL-decodes a string
 */
function safeURLDecode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    // If decoding fails, return the original value
    return value;
  }
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Extracts comprehensive request metadata from headers
 *
 * Uses Vercel geolocation headers when available, falls back to
 * User-Agent parsing for browser/OS/device detection.
 *
 * @returns Promise resolving to RequestMetadata object
 *
 * @example
 * ```typescript
 * const metadata = await getRequestMetadata();
 * console.log(metadata.browser); // "Chrome"
 * console.log(metadata.city); // "San Francisco"
 * ```
 */
export async function getRequestMetadata(): Promise<RequestMetadata> {
  const headersList = await headers();

  // Extract User-Agent
  const userAgent = headersList.get('user-agent');

  // Parse browser and OS from User-Agent
  const browser = userAgent ? detectBrowser(userAgent) : { name: null, version: null };
  const os = userAgent ? detectOS(userAgent) : { name: null, version: null };
  const deviceType = userAgent ? detectDeviceType(userAgent) : 'unknown';

  // Extract geolocation from Vercel headers
  // These headers are URL-encoded and may need decoding
  const country = safeURLDecode(headersList.get('x-vercel-ip-country-name'));
  const countryCode = headersList.get('x-vercel-ip-country');
  const region = safeURLDecode(headersList.get('x-vercel-ip-region'));
  const city = safeURLDecode(headersList.get('x-vercel-ip-city'));

  return {
    ipAddress: extractIPAddress(headersList),
    userAgent,
    browser: browser.name,
    browserVersion: browser.version,
    os: os.name,
    osVersion: os.version,
    deviceType,
    country,
    countryCode,
    region,
    city,
  };
}

/**
 * Formats device info for display
 * Creates a human-readable string from browser and OS info
 *
 * @param metadata - Request metadata object
 * @returns Formatted device info string
 *
 * @example
 * ```typescript
 * const metadata = await getRequestMetadata();
 * const deviceInfo = formatDeviceInfo(metadata);
 * // "Chrome 120 on Windows 10/11"
 * ```
 */
export function formatDeviceInfo(metadata: RequestMetadata): string {
  const parts: string[] = [];

  // Browser info
  if (metadata.browser) {
    let browserStr = metadata.browser;
    if (metadata.browserVersion) {
      browserStr += ` ${metadata.browserVersion}`;
    }
    parts.push(browserStr);
  }

  // OS info
  if (metadata.os) {
    let osStr = metadata.os;
    if (metadata.osVersion) {
      osStr += ` ${metadata.osVersion}`;
    }
    parts.push(`on ${osStr}`);
  }

  if (parts.length === 0) {
    return 'Unknown device';
  }

  return parts.join(' ');
}

/**
 * Formats location info for display
 * Creates a human-readable location string
 *
 * @param metadata - Request metadata object
 * @returns Formatted location string or null if no location data
 *
 * @example
 * ```typescript
 * const metadata = await getRequestMetadata();
 * const location = formatLocationInfo(metadata);
 * // "San Francisco, California, US"
 * ```
 */
export function formatLocationInfo(metadata: RequestMetadata): string | null {
  const parts: string[] = [];

  if (metadata.city) {
    parts.push(metadata.city);
  }

  if (metadata.region) {
    parts.push(metadata.region);
  }

  if (metadata.countryCode) {
    parts.push(metadata.countryCode);
  } else if (metadata.country) {
    parts.push(metadata.country);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(', ');
}
