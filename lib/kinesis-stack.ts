import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as firehose from '@aws-cdk/aws-kinesisfirehose';

export class KinesisStack extends cdk.Stack {
  public readonly hose: firehose.CfnDeliveryStream;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hoseRole = new iam.Role(this, `FirehoseRole`, {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonKinesisFirehoseFullAccess' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
      ]
    });

    const bucket = new s3.Bucket(this, `LogBucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    bucket.grantReadWrite(hoseRole);

    this.hose = new firehose.CfnDeliveryStream(this, `Firehose`, {
      deliveryStreamName: 'amazon-apigateway-accessLog',
      deliveryStreamType: 'DirectPut',
      s3DestinationConfiguration: {
        bucketArn: bucket.bucketArn,
        roleArn: hoseRole.roleArn,
      },
    });
  }
}
