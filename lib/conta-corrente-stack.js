const { Stack, RemovalPolicy, Duration } = require('aws-cdk-lib');
const { Function, Runtime, Code, StartingPosition } = require('aws-cdk-lib/aws-lambda');
const { RestApi, LambdaIntegration, Resource } = require('aws-cdk-lib/aws-apigateway');
const { Table, AttributeType, StreamViewType } = require('aws-cdk-lib/aws-dynamodb');
const { Queue } = require('aws-cdk-lib/aws-sqs');
const { SqsEventSource, DynamoEventSource } = require('aws-cdk-lib/aws-lambda-event-sources');
const { DynamoDB, Lambda } = require('aws-sdk');
const { EventType } = require('aws-cdk-lib/aws-s3');


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
      Key: { name: 'idCliente', type: AttributeType.STRING },
      stream: StreamViewType.NEW_IMAGE,
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

  sendMessageToQueueFn.addEventSource(new DynamoEventSource(contasTable, {
    startingPosition:StartingPosition.TRIM_HORIZON,
    batchSize:100
  }))
  transacaoToGenerateMetadataQueue.grantSendMessages(sendMessageToQueueFn)
  contasTable.grantWriteData(sendMessageToQueueFn);  


  // ------------------------------------------------


  // parte 3 - atualizar saldo da conta corrente
  const saldoTable = new Table(this, 'Saldo', {
    tableName: 'Saldo',
    partitionKey: { name: 'idCliente', type: AttributeType.STRING },
  //  sortKey: { name: 'valor', type: AttributeType.NUMBER,},
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
  saldoTable.grantReadWriteData(atualizaSaldoFn);
  contasTable.grantReadData(atualizaSaldoFn);
 

  // parte 4 - criar a api  que busca o saldo

  const buscaSaldoFn = new Function(this, 'BuscaSaldo', {
    runtime: Runtime.NODEJS_14_X,
    code: Code.fromAsset('lambda'),
    handler: 'buscaSaldo.handler',
  });

    saldoTable.grantReadWriteData(buscaSaldoFn);
  
    const rotaSaldo = api.root.addResource('saldo') ;
    const parametro = new Resource(this,'ParametroResource', {
      parent: rotaSaldo,
      pathPart: '{parametro}'
    });    
    parametro.addMethod('GET', new LambdaIntegration(buscaSaldoFn));



    ;
  }
}

module.exports = { ContaCorrenteStack }
