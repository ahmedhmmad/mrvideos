import { S3Event, Context, S3EventRecord } from 'aws-lambda';
import { SQS } from 'aws-sdk';

const sqs = new SQS();
const queueUrl = process.env.QUEUE_URL;

if (!queueUrl) {
  throw new Error('QUEUE_URL environment variable is not set');
}

export const handler = async (event: S3Event, context: Context) => {
  try {
    for (const record of event.Records) {
      // Ensure record is typed as S3EventRecord
      const s3Record = record as S3EventRecord;
      const bucket = s3Record.s3.bucket.name;
      const key = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, ' '));

      if (key.endsWith('.mp4')) {
        const message = {
          bucket: bucket,
          key: key
        };

        await sqs.sendMessage({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(message)
        }).promise();

        console.log(`Message sent to SQS for file: ${key}`);
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error processing S3 event:', error.message);
    } else {
      console.error('Unknown error processing S3 event:', error);
    }
    throw error;
  }
};
