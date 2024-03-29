#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { KinesisStack } from '../lib/kinesis-stack';

const ns = 'ClickStreamAlpha';
const app = new cdk.App({
  context: {
    ns,
  },
});
const kinesisStack = new KinesisStack(app, `${ns}KinesisStack`);
const apigatewayStack = new ApiGatewayStack(app, `${ns}ApiGatewayStack`, {
  stream: kinesisStack.stream,
});
apigatewayStack.addDependency(kinesisStack);

const tags = cdk.Tags.of(app);
tags.add('namespace', ns);

app.synth();
