/**
 * Agora configuration
 * For production, use environment variables
 * For testing/hackathon, you can use App ID directly (testing mode)
 */

export const AGORA_CONFIG = {
  // Get your App ID from https://console.agora.io/
  // For testing mode, you can use App ID without tokens
  appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
  
  // RTM App ID (can be same as RTC App ID for testing)
  rtmAppId: process.env.NEXT_PUBLIC_AGORA_RTM_APP_ID || process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
  
  // Token (optional for testing mode)
  token: process.env.NEXT_PUBLIC_AGORA_TOKEN || null,
  
  // RTM Token (optional for testing mode)
  rtmToken: process.env.NEXT_PUBLIC_AGORA_RTM_TOKEN || null,
};

/**
 * Validate Agora configuration
 */
export function validateAgoraConfig(): { valid: boolean; error?: string } {
  if (!AGORA_CONFIG.appId) {
    return {
      valid: false,
      error: "Agora App ID is required. Set NEXT_PUBLIC_AGORA_APP_ID environment variable.",
    };
  }
  return { valid: true };
}
