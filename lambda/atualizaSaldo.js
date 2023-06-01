const AWS = require('aws-sdk');

exports.handler = async function(event, context) {
    console.log('Event: ', JSON.stringify(event, null, 2));
    for (const record of event.Records) {
        const messageBody = JSON.parse(record.body);
        const codigoUltimaTransacao = messageBody.id;
        console.log("Body", codigoUltimaTransacao)

            
        try {
            const conta = await buscalUltimaTransacao(codigoUltimaTransacao)
           
            const saldo = await buscaSaldoAtual(conta.idCliente);
            console.log("Valor do saldo", saldo)
            let valorSaldo = 0;
            if (saldo != null) {
                valorSaldo = saldo.valor;
            }
            if (conta.tipo == 'entrada') {
                valorSaldo+=conta.valor;
            } else {
                valorSaldo-=conta.valor
            }

            const dbAtualizar = new AWS.DynamoDB.DocumentClient();
            var dynamodb = new AWS.DynamoDB()
            
            if (saldo != null) {
                const params = {
                    TableName: process.env.TABLE_NAME,
                    Key: {
                        idCliente: { S: conta.idCliente.toString() }
                    },
                    UpdateExpression: 'SET valor = :valor',
                    ExpressionAttributeValues: {
                         ':valor': { N: valorSaldo.toString() }
                    },
                    ReturnValues: 'UPDATED_NEW'
                  };
    
                  console.log('Valor: ', valorSaldo)

                  await dynamodb.updateItem(params).promise();
                  

            } else {
                await dbAtualizar.put({
                    TableName: process.env.TABLE_NAME,
                    Item: {
                        idCliente:conta.idCliente.toString(),
                        valor: valorSaldo
                    },
                }).promise();

            }

              console.log('Fim da atualização')
              
        } catch (error) {
            console.error(`Erro os inserir dados na tabela saldo: ${error}  `);
        }
    }

    async function buscalUltimaTransacao(codigoUltimaTransacao) {

        try {

            const docUltimaTransacao = new AWS.DynamoDB.DocumentClient();
            let conta = null;
            const data = await docUltimaTransacao.scan({
                TableName:'Contas'
            }).promise();
            data.Items.forEach((item) => {
                if (conta === null && item.id === codigoUltimaTransacao) {
                    conta = item
                }

            });
            return conta;
        }catch (error) {
          console.error("Erro ao consultar a conta:", error);
          throw error;
        }
    }

    async function buscaSaldoAtual(idCliente) {
        try {
            const docSaldo = new AWS.DynamoDB.DocumentClient();
            let saldo = null;
            const data = await docSaldo.scan({
                TableName:'Saldo'
            }).promise();
            data.Items.forEach((item) => {
                console.log("Saldo", saldo)
                console.log(saldo === null)
                console.log(item.idCliente == idCliente)
                if (saldo === null && item.idCliente == idCliente) {
                    saldo = item
                }

            });
            return saldo;
        }catch (error) {
          console.error("Erro ao consultar a saldo atual:", error);
          throw error;
        }
    }
      
      
};