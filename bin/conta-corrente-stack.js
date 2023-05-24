#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { ContaCorrenteStack } = require('../lib/conta-corrente-stack');

const app = new cdk.App();
new ContaCorrenteStack(app, 'ContaCorrenteStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    }
});
