import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 for video upload
    const videoBucket = new s3.Bucket(this, 'VideoUploadBucket', {
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // S3 for website hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS, 
    });

    // Add bucket policy for public access
    websiteBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${websiteBucket.bucketArn}/*`],
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()],
    }));

    // SQS for video processing queue
    const queue = new sqs.Queue(this, 'VideoProcessingQueue');

    // Lambda function for processing S3 events and sending messages to SQS
    const s3EventHandler = new lambda.Function(this, 'S3EventHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda/handlers'),
      handler: 'video-checker.handler',
      environment: {
        QUEUE_URL: queue.queueUrl,
      },
    });

    // Grant permissions
    queue.grantSendMessages(s3EventHandler);
    videoBucket.grantRead(s3EventHandler);

    // Add S3 event notification
    videoBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(s3EventHandler),
      { suffix: '.mp4' }
    );

    // API Gateway
    const api = new apigateway.RestApi(this, 'VideoUploadAPI', {
      restApiName: 'VideoUploadAPI',
      description: 'This service allows you to upload videos',
    });

    const videoUploadHandler = new lambda.Function(this, 'VideoUploadHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda/handlers'),
      handler: 'video-uploader.handler',
      environment: {
        BUCKET_NAME: videoBucket.bucketName,
      },
    });

    videoBucket.grantPut(videoUploadHandler);

    const uploadIntegration = new apigateway.LambdaIntegration(videoUploadHandler);

    const videos = api.root.addResource('videos');
    videos.addMethod('POST', uploadIntegration);

    // Deploy React app to S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('../web/build')],
      destinationBucket: websiteBucket,
    });

    // Outputs
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'Website URL',
    });

    new cdk.CfnOutput(this, 'APIGatewayURL', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'VideoS3BucketName', {
      value: videoBucket.bucketName,
      description: 'Video S3 Bucket Name',
    });
  }
}
