class CloudflareStreamService {
  private accountId: string;
  private apiToken?: string;
  private apiKey?: string;
  private email?: string;

  constructor() {
    // Check both server-side (process.env) and browser-side context (just in case, but intended for backend use)
    const env = typeof process !== 'undefined' ? process.env : ({} as any);
    this.accountId = (env.CLOUDFLARE_ACCOUNT_ID || "").trim();
    this.apiToken = (env.CLOUDFLARE_API_TOKEN || "").trim();
    this.apiKey = (env.CLOUDFLARE_API_KEY || "").trim();
    this.email = (env.CLOUDFLARE_EMAIL || "").trim();

    if (this.apiToken?.toLowerCase().startsWith('bearer ')) {
      this.apiToken = this.apiToken.substring(7).trim();
    }
  }

  /**
   * Checks if the service is properly configured with credentials
   */
  isConfigured(): boolean {
    return !!this.accountId && (!!this.apiToken || !!this.apiKey);
  }

  /**
   * Requests a new direct upload URL from the Cloudflare Stream API.
   * Returns the direct upload URL and the upload ID (uid).
   */
  async generateDirectUploadUrl(options: { 
    fileName?: string; 
    creatorId?: string; 
    maxDurationSeconds?: number;
  }): Promise<{ uploadUrl: string; uploadId: string; uid: string; playbackUrl: string }> {
    if (!this.isConfigured()) {
      throw new Error("Cloudflare Stream credentials are not configured on the server. Please check your environment variables.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiToken) {
      headers["Authorization"] = `Bearer ${this.apiToken}`;
    } else if (this.apiKey) {
      if (!this.email) {
        throw new Error("Missing Cloudflare Email. Required when authenticating with a Global API Key.");
      }
      headers["X-Auth-Email"] = this.email;
      headers["X-Auth-Key"] = this.apiKey;
    }

    const maxDurationSeconds = options.maxDurationSeconds || 3600;
    const body: Record<string, any> = {
      maxDurationSeconds,
      expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      meta: {
        name: options.fileName || "Untitled Video",
      }
    };

    if (options.creatorId) {
      body.creator = options.creatorId;
      body.meta.creator_id = options.creatorId;
    }

    console.log(`[CF-STREAM-SERVICE] Contacting Cloudflare direct upload API for Account ID: ${this.accountId.substring(0, 4)}...`);

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/direct_upload`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }
    );

    const data: any = await response.json();

    if (!data.success) {
      console.error("[CF-STREAM-SERVICE] Cloudflare Stream Direct Upload Error:", JSON.stringify(data.errors));
      const firstError = data.errors?.[0];
      const errMsg = firstError ? `${firstError.message} (Code: ${firstError.code})` : "Failed to generate Cloudflare Stream upload link";
      throw new Error(errMsg);
    }

    const uploadUrl = data.result.uploadURL;
    const uid = data.result.uid;
    const playbackUrl = `https://customer-${this.accountId}.cloudflarestream.com/${uid}/manifest/video.m3u8`;

    return {
      uploadUrl,
      uploadId: uid, // Explicit upload ID requested by user
      uid,           // Backward compatibility with previous client code
      playbackUrl
    };
  }
}

export const cloudflareStreamService = new CloudflareStreamService();
