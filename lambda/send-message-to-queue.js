const AWS = require('aws-sdk');
const sqs = new AWS.SQS();

exports.handler = async function(event, context) {
    console.log('Event: ', JSON.stringify(event, null, 2));

    const idCliente = event.Records[0].dynamodb.NewImage.idCliente.N
    let saldo = 0;
    try {
        const params = {
            TableName: "Conta", 
            FilterExpression: "#idCliente = :idCliente",
            ExpressionAttributeNames: {
              "#idCliente": "idCliente",
            },
            ExpressionAttributeValues: {
              ":idCliente": { N: idCliente.toString() },
            },
          };

        const command = new ScanCommand(params);
        const response = await client.send(command)
        response.Items.forEach((item) => {
            const tipo = item.tipo.S;
            const valor = Number(item.valor.N);
      
            if (tipo === "entrada") {
              saldo += valor;
            } else if (tipo === "saída") {
              saldo -= valor;
            }
          });

    }catch(error) {
        console.error("Erro ao calcular o saldo: ", error)
    }

    
    const params = {
        MessageBody: JSON.stringify({
            id: event.Records[0].dynamodb.Keys.id.S,
            valor: saldo
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