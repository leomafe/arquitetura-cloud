const AWS = require('aws-sdk');
const sqs = new AWS.SQS();

exports.handler = async function(event, context) {
    console.log('Event: ', JSON.stringify(event, null, 2));
    
    const params = {
        MessageBody: JSON.stringify({
            info: 'Dados salvos',
        }),
        QueueUrl: process.env.QUEUE_URL,
    };
    console.log('Params: ', JSON.stringify(params));
    try {
        const data = await sqs.sendMessage(params).promise();
        console.log(`Message sent to SQS queue, message ID: ${data.MessageId}`);
    } catch (error) {
        console.error(`Error sending message to SQS queue: ${error}`);
    }
};