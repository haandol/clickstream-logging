#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { KinesisStack } from '../lib/kinesis-stack';

const ns = 'ClickStreamAlpha';
const app = new cdk.App({
  context: {
    ns,
  }
});
const kinesisStack = new KinesisStack(app, `${ns}KinesisStack`);
const apigatewayStack = new ApiGatewayStack(app, `${ns}ApiGatewayStack`, {
  hose: kinesisStack.hose,
});
apigatewayStack.addDependency(kinesisStack);