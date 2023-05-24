const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async function(event, context) {
    console.log('Event: ', JSON.stringify(event, null, 2));
    for (const record of event.Records) {
        const messageBody = JSON.parse(record.body);
        const valor = messageBody.valor;
        
        try {
            const data = await dynamodb.put({
                TableName: process.env.TABLE_NAME,
                Item: {
                    valor: valor
                },
            }).promise();
        } catch (error) {
            console.error(`Error inserting item into DynamoDB table: ${error}`);
        }
    }
};