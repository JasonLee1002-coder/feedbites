import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const S3_BUCKET = "transtep-rd";
export const S3_BASE_URL = `https://${S3_BUCKET}.s3.ap-northeast-1.amazonaws.com`;

export async function uploadToS3(
  buffer: ArrayBuffer | Uint8Array,
  key: string,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: contentType,
    })
  );
  return `${S3_BASE_URL}/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
}

/** Extract S3 key from a full S3 public URL */
export function keyFromUrl(url: string): string {
  return url.replace(`${S3_BASE_URL}/`, "");
}
