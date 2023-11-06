import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';

export class KinesisStack extends cdk.Stack {
  public readonly stream: kinesis.IStream;
  public readonly hose: firehose.CfnDeliveryStream;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.stream = new kinesis.Stream(this, `Stream`);

    const hoseRole = new iam.Role(this, `FirehoseRole`, {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/AmazonKinesisReadOnlyAccess',
        },
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/AmazonKinesisFirehoseFullAccess',
        },
      ],
    });

    const bucket = new s3.Bucket(this, `LogBucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    bucket.grantReadWrite(hoseRole);

    const role = new iam.Role(this, `ProcessorRole`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        },
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/AmazonKinesisFirehoseFullAccess',
        },
      ],
    });
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
      deliveryStreamType: 'KinesisStreamAsSource',
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: this.stream.streamArn,
        roleArn: hoseRole.roleArn,
      },
      extendedS3DestinationConfiguration: {
        bucketArn: bucket.bucketArn,
        roleArn: hoseRole.roleArn,
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 1,
        },
        processingConfiguration: {
          enabled: true,
          processors: [
            {
              type: 'Lambda',
              parameters: processorParameters,
            },
          ],
        },
      },
    });
  }
}
