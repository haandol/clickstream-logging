import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as firehose from '@aws-cdk/aws-kinesisfirehose';

export class KinesisStack extends cdk.Stack {
  public readonly hose: firehose.CfnDeliveryStream;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hoseRole = new iam.Role(this, `FirehoseRole`, {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonKinesisFirehoseFullAccess' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
      ]
    });

    const bucket = new s3.Bucket(this, `LogBucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    bucket.grantReadWrite(hoseRole);

    const role = new iam.Role(this, `ProcessorRole`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonKinesisFirehoseFullAccess' },
      ],
    })
    const f = new lambda.Function(this, `ProcessorFunction`, {
      code: lambda.Code.fromAsset(path.resolve(__dirname, 'functions')),
      handler: 'processor.handler',
      runtime: lambda.Runtime.PYTHON_3_7,
      timeout: cdk.Duration.minutes(5),
      role,
    });
    f.grantInvoke(hoseRole);

    const processorParameters = [
      { parameterName: 'LambdaArn', parameterValue: f.functionArn },
      { parameterName: 'NumberOfRetries', parameterValue: '1' },
    ];
    this.hose = new firehose.CfnDeliveryStream(this, `Firehose`, {
      deliveryStreamName: 'amazon-apigateway-accessLog',
      deliveryStreamType: 'DirectPut',
      extendedS3DestinationConfiguration: {
        bucketArn: bucket.bucketArn,
        roleArn: hoseRole.roleArn,
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 1,
        },
        processingConfiguration: {
          enabled: true,
          processors: [{
            type: 'Lambda',
            parameters: processorParameters,
          }],
        },
      },
    });
  }
}
