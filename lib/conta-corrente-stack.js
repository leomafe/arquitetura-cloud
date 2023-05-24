const { Stack } = require('aws-cdk-lib');
const { Function, Runtime, Code } = require('aws-cdk-lib/aws-lambda');
const { RestApi, LambdaIntegration } = require('aws-cdk-lib/aws-apigateway');


class ContaCorrenteStack extends Stack {

  constructor(scope, id, props) {
    super(scope, id, props);

    // - parte 1 - criar api e salvar no banco dynamodb ----
    const transacao = new Function(this, 'transacao', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda'),
      handler: 'transacao.handler',
    });

    
    const contasTable = new Table(this, 'Contas', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      tableName: 'Contas',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    contasTable.grantReadWriteData(transacao);

    const api = new RestApi(this, 'ContasApi', {
      restApiName: 'ContasServiceApi',
    });

    const rotaConta = api.root.addResource('contas');
    rotaConta.addMethod('POST', new LambdaIntegration(transacao));

    // ------------------------------------------------

  // parte 2 - chamar o sqs apos inserir no dynamodb

  const transacaoToGenerateMetadataQueue = new Queue(this, 'TransacaoToGenerateMetadataQueue', {
    visibilityTimeout: Duration.seconds(300),
  });

  const sendMessageToQueueFn = new Function(this, 'SendMessageToQueue', {
    runtime: Runtime.NODEJS_14_X,
    code: Code.fromAsset('lambda'),
    handler: 'send-message-to-queue.handler',
    environment: {
      QUEUE_URL: transacaoToGenerateMetadataQueue.queueUrl,
    },
  });

  transacaoToGenerateMetadataQueue.grantSendMessages(sendMessageToQueueFn)
  contasTable.grantWriteData(sendMessageToQueueFn);


  // ------------------------------------------------


  // parte 3 - atualizar saldo da conta corrente
  const saldoTable = new Table(this, 'Saldo', {
    tableName: 'Saldo',
    sortKey: { name: 'valor', type: AttributeType.NUMBER },
    removalPolicy: RemovalPolicy.DESTROY,
  });

  
  const atualizaSaldoFn = new Function(this, 'AtualizaSaldoFn', {
    runtime: Runtime.NODEJS_14_X,
    code: Code.fromAsset('lambda'),
    handler: 'atualizaSaldo.handler',
    environment: {
      TABLE_NAME: saldoTable.tableName,
    },
  });
    
  atualizaSaldoFn.addEventSource(new SqsEventSource(transacaoToGenerateMetadataQueue));
  saldoTable.grantWriteData(generateMetadataFn);

  // parte 4 - criar a api  que busca o saldo

  const buscaSaldoFn = new Function(this, 'BuscaSaldo', {
    runtime: Runtime.NODEJS_14_X,
    code: Code.fromAsset('lambda'),
    handler: 'buscaSaldo.handler',
  });

  saldoTable.grantReadWriteData(buscaSaldoFn);

  rotaConta.addMethod('GET', new LambdaIntegration(buscaSaldoFn));


    ;
  }
}

module.exports = { TrabalhoFinalStack }
