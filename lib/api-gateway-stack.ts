import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as logs from '@aws-cdk/aws-logs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as firehose from '@aws-cdk/aws-kinesisfirehose';
import { Code } from '@aws-cdk/aws-lambda';

interface Props extends cdk.StackProps {
  hose: firehose.CfnDeliveryStream;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly api: apigw.RestApi;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    const ns =  scope.node.tryGetContext('ns');

    const format = JSON.stringify({
      "params": "$input.params()",
      "body" : "$input.json('$')",
      "stage" : apigw.AccessLogField.contextStage(),
      "request_id": apigw.AccessLogField.contextRequestId(),
      "resource_path": apigw.AccessLogField.contextResourcePath(),
      "http_method": apigw.AccessLogField.contextHttpMethod(),
      "source_ip": apigw.AccessLogField.contextIdentitySourceIp(),
      "error": apigw.AccessLogField.contextErrorMessage(),
      "user-agent": apigw.AccessLogField.contextIdentityUserAgent(),
      "response_length": apigw.AccessLogField.contextResponseLength(),
      "reponse_latency": apigw.AccessLogField.contextResponseLatency(),
      "integration_latency": apigw.AccessLogField.contextIntegrationLatency(),
    });
    const hoseLogGroup = logs.LogGroup.fromLogGroupArn(this, `${ns}HoseLogGroup`, props.hose.attrArn);
    this.api = new apigw.RestApi(this, `${ns}RestApi`, {
      restApiName: `${ns}RestApi`,
      deploy: true,
      deployOptions: {
        stageName: 'dev',
        accessLogDestination: new apigw.LogGroupLogDestination(hoseLogGroup),
        accessLogFormat: apigw.AccessLogFormat.custom(format),
        metricsEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: apigw.MethodLoggingLevel.INFO,
      },
      endpointConfiguration: {
        types: [apigw.EndpointType.REGIONAL],
      },
    });
    this.api.root.addMethod('ANY');

    const resourceOptions: apigw.MethodOptions = {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/x-amz-json-1.1': apigw.Model.EMPTY_MODEL,
            'application/json': apigw.Model.EMPTY_MODEL,
          },
        }
      ],
    };
    const f = new lambda.Function(this, `${ns}EchoFunction`, {
      code: Code.fromAsset(path.resolve(__dirname, 'functions')),
      handler: 'echo.handler',
      runtime: lambda.Runtime.PYTHON_3_7,
      timeout: cdk.Duration.seconds(3),
    });
    this.api.root.addMethod('GET', new apigw.LambdaIntegration(f, {
      proxy: false,
      passthroughBehavior: apigw.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/x-amz-json-1.1': JSON.stringify({
          "text": "$input.params('text')",
        }),
        'application/json': JSON.stringify({
          "text": "$input.params('text')",
        }),
      },
      integrationResponses: [
        { statusCode: '200' }
      ],
    }), resourceOptions);
  }

}