const { DynamoDB } = require('aws-sdk');
const crypto = require('crypto');

exports.handler = async function(event, context) {
    const conta = {
        id: crypto.randomUUID(),
        ...JSON.parse(event.body)
    }
    try {
        const docClient = new DynamoDB.DocumentClient();
        await docClient.put({
            TableName: 'Contas',
            Item: conta,
        }).promise();
        return {
            statusCode: 201,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(conta),
        };
    } catch (err) {
        console.log('DynamoDB error: ', err);
        return { statusCode: 500, body: 'Failed to add conta' };
    }
};