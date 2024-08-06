import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const S3 = new AWS.S3();
const bucketName = process.env.BUCKET_NAME;

if (!bucketName) {
  throw new Error('BUCKET_NAME environment variable is not set');
}

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Check if fileName and fileContent are provided in the request body
    if (!body.fileName || !body.fileContent) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'fileName and fileContent are required' }),
      };
    }

    const { fileName, fileContent } = body;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: Buffer.from(fileContent, 'base64'),
      ContentEncoding: 'base64',
      ContentType: 'video/mp4',
    };

    await S3.putObject(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'File uploaded successfully' }),
    };
  } catch (error: unknown) {
   
    if (error instanceof Error) {
      console.error('Error uploading file:', error.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
      };
    } else {
      
      console.error('Unknown error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Internal Server Error', error: 'Unknown error occurred' }),
      };
    }
  }
};
