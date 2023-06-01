const { DynamoDB } = require('aws-sdk');

exports.handler = async function(event, context) {
    try {
        const parametro = event.pathParameters.parametro;
        const docClient = new DynamoDB.DocumentClient();
        const data = await docClient.scan({
            TableName: 'Saldo',
            FilterExpression: 'idCliente = :param',
            ExpressionAttributeValues: {
                ':param': parametro
            }
        }).promise();
        return {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: {
                "Access-Control-Allow-Origin" : "*",
                "Access-Control-Allow-Credentials" : true
            }
        };
    } catch (err) {
        console.log('DynamoDB error: ', err);
        return { statusCode: 500, body: 'Failed to get user' };
    }
};