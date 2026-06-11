import { S3Client, PutObjectCommand, GetObjectCommand, PutBucketCorsCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { v4 as uuidv4 } from 'uuid';

class StorageService {
  private client: S3Client;
  private bucket: string;
  private corsInitialized: boolean = false;

  constructor() {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";
    
    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      console.warn("⚠️ [STORAGE] R2 credentials or bucket name missing. Check your environment variables:");
      console.log("- ACCOUNT_ID:", accountId ? "✅ (Set)" : "❌ (Missing)");
      console.log("- ACCESS_KEY_ID:", accessKeyId ? "✅ (Set)" : "❌ (Missing)");
      console.log("- SECRET_ACCESS_KEY:", secretAccessKey ? "✅ (Set)" : "❌ (Missing)");
      console.log("- BUCKET_NAME:", this.bucket ? `✅ (${this.bucket})` : "❌ (Missing)");
      console.warn("Direct cloud uploads will be disabled and fall back to proxy.");
    }

    this.client = new S3Client({
      region: "auto",
      endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
      credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
      },
      forcePathStyle: true,
    });

    // Try to initialize CORS in the background
    this.ensureBucketCors().catch(err => {
      console.warn("⚠️ [STORAGE] Auto-CORS failed. Direct uploads from browser might fail. Please set CORS manually in your R2 dashboard if you see 'Network Error'. Detail:", err.message);
      console.log(`💡 [CORS HELP] If you are configuring CORS manually in the Cloudflare R2 Web Dashboard UI, paste this EXACT JSON array (it uses camelCase keys like "allowedOrigins" which Cloudflare R2 Dashboard validates successfully to avoid 'This policy is not valid' error):
[
  {
    "allowedOrigins": ["*"],
    "allowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "allowedHeaders": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  }
]`);
    });
  }

  /**
   * Attempts to configure CORS on the bucket to allow uploads from any domain
   */
  private async ensureBucketCors() {
    if (this.corsInitialized || !this.bucket) return;

    try {
      console.log(`[STORAGE] Applying CORS policy to bucket: ${this.bucket}...`);
      
      // AWS SDK (S3 client types) MUST be PascalCase properties to compile successfully in code,
      // which translate automatically internally to standard S3 CORS XML over HTTP.
      const command = new PutBucketCorsCommand({
        Bucket: this.bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["Content-Type", "x-amz-*", "Authorization", "Access-Control-Allow-Origin"],
              AllowedMethods: ["PUT", "POST", "GET", "HEAD", "DELETE"],
              AllowedOrigins: ["*"], // Note: Javascript code-level typing is Capitalized "AllowedOrigins" 
              ExposeHeaders: ["ETag", "Content-Type", "Content-Length", "x-amz-request-id", "x-amz-id-2"],
              MaxAgeSeconds: 3600
            }
          ]
        }
      });

      await this.client.send(command);
      this.corsInitialized = true;
      console.log("[STORAGE] CORS policy applied successfully.");
    } catch (error: any) {
      this.corsInitialized = false; 
      // If error is 403, it means the API token doesn't have permission to change CORS
      if (error.$metadata?.httpStatusCode === 403) {
        console.warn("[STORAGE] Permission denied for PutBucketCors. Skipping auto-CORS.");
      } else {
        throw error;
      }
    }
  }

  /**
   * Generates a presigned URL for direct client-side upload to R2
   */
  async getPresignedUploadUrl(key: string, contentType: string) {
    // Attempt CORS config if not already done
    try { await this.ensureBucketCors(); } catch (e) {}

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });
    
    let domain = process.env.VITE_CLOUDFLARE_R2_PUBLIC_DOMAIN || "";
    if (domain && !domain.startsWith("http")) {
      domain = `https://${domain}`;
    }
    
    const publicUrl = domain ? `${domain}/${key}` : url.split('?')[0];

    return { uploadUrl: url, publicUrl, key };
  }

  /**
   * Directly uploads a buffer or stream to R2 with automatic multipart support
   */
  async uploadFile(body: any, key: string, contentType: string) {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";

    // FALLBACK: If R2 is not configured, save locally
    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      console.warn("⚠️ [STORAGE] R2 not configured. Local fallback triggered.");
      
      const fs = await import('fs');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const safeFileName = key.replace(/\//g, '_');
      const filePath = path.join(uploadsDir, safeFileName);
      
      if (body.pipe) {
        const writeStream = fs.createWriteStream(filePath);
        body.pipe(writeStream);
        await new Promise<void>((resolve, reject) => {
          writeStream.on('finish', () => resolve());
          writeStream.on('error', (err) => reject(err));
        });
      } else {
        fs.writeFileSync(filePath, body);
      }

      return { publicUrl: `/uploads/${safeFileName}`, key };
    }

    try {
      console.log(`[STORAGE] Managed upload starting for key: ${key}`);
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        },
        queueSize: 4, // Concurrent parts
        partSize: 5 * 1024 * 1024, // 5MB parts
        leavePartsOnError: false,
      });

      upload.on("httpUploadProgress", (progress) => {
        console.log(`[STORAGE] Progress: ${progress.loaded} / ${progress.total}`);
      });

      await upload.done();
      console.log(`[STORAGE] Managed upload complete: ${key}`);

      let domain = process.env.VITE_CLOUDFLARE_R2_PUBLIC_DOMAIN || "";
      if (domain && !domain.startsWith("http")) domain = `https://${domain}`;
      const publicUrl = domain ? `${domain}/${key}` : `https://${this.bucket}.${accountId}.r2.cloudflarestorage.com/${key}`;

      return { publicUrl, key };
    } catch (error: any) {
      console.error("[STORAGE] Managed upload failed:", error);
      throw error;
    }
  }

  /**
   * Directly uploads a buffer to R2 (deprecated, use uploadFile)
   */
  async uploadBuffer(buffer: Buffer, key: string, contentType: string) {
    return this.uploadFile(buffer, key, contentType);
  }

  /**
   * Deletes a file from Cloudflare R2 bucket. Useful for rollbacks and cleanup of failed uploads.
   */
  async deleteFile(key: string): Promise<boolean> {
    if (!this.bucket) {
      console.warn("[STORAGE] Cannot delete from R2: bucket is not initialized.");
      return false;
    }
    try {
      console.log(`[STORAGE] Executing R2 delete key: ${key}`);
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      await this.client.send(command);
      console.log(`[STORAGE] Successfully deleted R2 key: ${key}`);
      return true;
    } catch (e: any) {
      console.error(`[STORAGE] Failed deleting R2 key ${key}:`, e.message);
      return false;
    }
  }
}

export const storageService = new StorageService();
