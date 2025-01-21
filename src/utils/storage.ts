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

export async function uploadFile(
  companyName: string,
  jobTitle: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<string> {
  try {
    const key = `${companyName}/${jobTitle}/${fileName}`;

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: 'application/pdf',
      },
    });

    await upload.done();

    // Return the S3 URL
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
}
