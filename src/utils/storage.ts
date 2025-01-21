import { Upload } from '@aws-sdk/lib-storage';
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accountId: process.env.AWS_ACCOUNT_ID,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'desky-cv-store';

async function createS3Folder(folderPath: string): Promise<any> {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: folderPath,
        Body: '',
      },
    });
    return upload.done();
  } catch (error) {
    console.error('Error creating folder in S3:', error);
    throw error;
  }
}

export async function createAgencyFolder(companyName: string): Promise<any> {
  const folderPath = `${companyName}/`;
  return createS3Folder(folderPath);
}

export async function createJobFolder(
  companyName: string,
  jobTitle: string
): Promise<any> {
  const fullPath = `${companyName}/${jobTitle}/`;
  return createS3Folder(fullPath);
}
