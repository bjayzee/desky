import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sanitizeIdentifier } from './sanitization';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accountId: process.env.AWS_ACCOUNT_ID,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'desky-cv-store';

async function createS3Folder(folderPath: string): Promise<string> {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: folderPath,
        Body: '',
      })
    );
    return folderPath;
  } catch (error) {
    console.error('Error creating folder in S3:', error);
    throw error;
  }
}

export async function createAgencyFolder(companyName: string): Promise<string> {
  const folderPath = `${sanitizeIdentifier(companyName)}/`;
  return createS3Folder(folderPath);
}

export async function createJobFolder(
  companyName: string,
  jobTitle: string
): Promise<string> {
  const companyPath = sanitizeIdentifier(companyName);
  const jobPath = sanitizeIdentifier(jobTitle);
  const fullPath = `${companyPath}/${jobPath}/`;
  return createS3Folder(fullPath);
}
