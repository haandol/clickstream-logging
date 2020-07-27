import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as kinesis from '@aws-cdk/aws-kinesis';

interface Props extends cdk.StackProps {
  stream: kinesis.IStream;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly api: apigw.RestApi;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    const ns =  scope.node.tryGetContext('ns');

    this.api = new apigw.RestApi(this, `${ns}RestApi`, {
      restApiName: `${ns}RestApi`,
      deploy: true,
      deployOptions: {
        stageName: 'dev',
        loggingLevel: apigw.MethodLoggingLevel.ERROR,
      },
      endpointConfiguration: {
        types: [apigw.EndpointType.REGIONAL],
      },
    });

    const credentialsRole = new iam.Role(this, `CredentialRole`, {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonKinesisFullAccess' },
      ],
    });

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

    const dataFormat = `
    #set($allParams = $input.params())
    #set($params = $allParams.get('querystring'))
    #set($data = "{
      ""params"": {
        #foreach($paramName in $params.keySet())
        ""$paramName"": ""$util.escapeJavaScript($params.get($paramName))""
        #if($foreach.hasNext),#end
        #end
      },
      ""body"": $input.json('$'),
      ""stage"": ""${apigw.AccessLogField.contextStage()}"",
      ""http_method"": ""${apigw.AccessLogField.contextHttpMethod()}"",
      ""request_id"": ""${apigw.AccessLogField.contextRequestId()}"",
      ""resource_path"": ""${apigw.AccessLogField.contextResourcePath()}"",
      ""resource_id"": ""${apigw.AccessLogField.contextResourceId()}"",
      ""request_time"": ""${apigw.AccessLogField.contextRequestTime()}"",
      ""source_ip"": ""${apigw.AccessLogField.contextIdentitySourceIp()}"",
      ""user_agent"": ""${apigw.AccessLogField.contextIdentityUserAgent()}""
    }")`.replace(/(\s{2,})|\n/gm, '');
    this.api.root.addMethod('POST', new apigw.AwsIntegration({
      proxy: false,
      service: 'kinesis',
      action: 'PutRecord',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/x-amz-json-1.1': dataFormat + JSON.stringify({
            "StreamName": props.stream.streamName,
            "PartitionKey": apigw.AccessLogField.contextRequestId(),
            "Data": "$util.base64Encode($data)",
          }),
          'application/json': dataFormat + JSON.stringify({
            "StreamName": props.stream.streamName,
            "PartitionKey": apigw.AccessLogField.contextRequestId(),
            "Data": "$util.base64Encode($data)",
          }),
        },
        integrationResponses: [
          { statusCode: '200' },
        ],
      },
    }), resourceOptions);
  }

}