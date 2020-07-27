# API Gateway - Kinesis Logging

This repository is for guide how to log API Gateway requests to S3 using Kinesis

Running this tutorial will provision below architecture on your AWS Account

<img src="img/architecture.png" />

**Running this repository may cost you to provision AWS resources**

# Prerequisites

- awscli
- Nodejs 10.20+
- Python 3.7+
- AWS Account and Locally configured AWS credential

# Installation

Install project dependencies

```bash
$ npm i
```

Install cdk in global context and run `cdk init` if you did not initailize cdk yet.

```bash
$ npm i -g cdk@1.54.0
$ cdk init
$ cdk bootstrap
```

Deploy CDK Stacks on AWS

```bash
$ cdk deploy "*" --require-approval never
```

# Usage

1. Invoke API Gateway endpoint with some data (I used HTTPie)

```bash
$ http post https://pc85vmongg.execute-api.ap-northeast-2.amazonaws.com/dev/\?param1\=test1\&param2\=test2 text=hihi dodo=dada 

HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 133
Content-Type: application/json
Date: Mon, 27 Jul 2020 09:50:34 GMT
X-Amzn-Trace-Id: Root=1-5f1ea36a-2e0004ffc4872e731c05c655
x-amz-apigw-id: QU54lHRnIE0FVug=
x-amzn-RequestId: 7b0c6ced-54f2-41a6-b6eb-67c34757f4ee

{
    "EncryptionType": "KMS",
    "SequenceNumber": "49609269679743302945603165999532102289236812540189605890",
    "ShardId": "shardId-000000000000"
}
```

2. Open S3 bucket to check if your data is stored well

```json
{"params": {"param1": "test1","param2": "test2"},"body": {"text":"hihi","dodo":"dada"},"stage": "dev","http_method": "POST","request_id": "6408d828-bad6-4e48-8929-e23754591799","resource_path": "/","resource_id": "5ehbljoao8","request_time": "27/Jul/2020:12:22:06 +0000","source_ip": "39.115.51.138","user_agent": "HTTPie/2.1.0"}
...
```

3. Query S3 with Amazon Athena

# Cleanup Resource

Remove all resources used in this tutorial.

```bash
$ cdk destroy "*"
```
