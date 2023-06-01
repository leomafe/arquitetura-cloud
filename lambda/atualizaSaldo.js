const AWS = require('aws-sdk');

exports.handler = async function(event, context) {
    console.log('Event: ', JSON.stringify(event, null, 2));
    for (const record of event.Records) {
        const messageBody = JSON.parse(record.body);
        const codigoUltimaTransacao = messageBody.id;

            
        try {
            const conta = await buscalUltimaTransacao(codigoUltimaTransacao)
           
            const saldo = await buscaSaldoAtual(conta.idCliente);
            let valorSaldo = 0;
            if (saldo != null) {
                valorSaldo = saldo.valor;
            }
            if (conta.tipo == 'entrada') {
                valorSaldo+=conta.valor;
            } else {
                valorSaldo-=conta.valor
            }

            
            
            if (saldo != null) {
                var dynamodb = new AWS.DynamoDB()
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
                const dbCadastrar = new AWS.DynamoDB.DocumentClient();
                await dbCadastrar.put({
                    TableName: process.env.TABLE_NAME,
                    Item: {
                        idCliente:conta.idCliente.toString(),
                        valor: valorSaldo
                    },
                }).promise();

            }

              
        } catch (error) {
            console.error(`Erro os inserir dados na tabela saldo: ${error}  `);
        }
    }

    async function buscalUltimaTransacao(codigoUltimaTransacao) {

        try {
            const docUltimaTransacao = new AWS.DynamoDB.DocumentClient();
            const data = await docUltimaTransacao
              .scan({ TableName: 'Contas' })
              .promise();
        
            const conta = data.Items.find((item) => item.id === codigoUltimaTransacao);
        
            if (!conta) {
              throw new Error('Conta não encontrada');
            }
        
            return conta;
          } catch (error) {
            console.error('Erro ao consultar a conta:', error);
            throw error;
          }
    }

    async function buscaSaldoAtual(idCliente) {
        try {
            const docSaldo = new AWS.DynamoDB.DocumentClient();
            const data = await docSaldo.scan({ TableName: 'Saldo' }).promise();
        
            const saldo = data.Items.find((item) => item.idCliente == idCliente);
        
            return saldo || null;
          } catch (error) {
            console.error('Erro ao consultar o saldo atual:', error);
            throw error;
          }
    }
      
      
};