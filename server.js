// Require the framework and instantiate it
const fastify = require('fastify')({ logger: true })
const { Rabbit } = require('rabbit-queue');
// Declare a route
fastify.get('/', async (request, reply) => {
  return { status: 'ok' }
})

// Run the server!
const start = async () => {
  try {
    await fastify.listen(3000)
    fastify.log.info(`server listening on ${fastify.server.address().port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

const rabbit = new Rabbit(process.env.RABBIT_URL || 'amqp://localhost', {
  prefetch: 1, //default prefetch from queue
  replyPattern: true, //if reply pattern is enabled an exclusive queue is created
  scheduledPublish: false,
  prefix: '', //prefix all queues with an application name
  socketOptions: {} // socketOptions will be passed as a second param to amqp.connect and from ther to the socket library (net or tls)
});

function handleEvent(msg){
    console.log(msg);
}

rabbit.on('connected', () => {
    rabbit
    .createQueue('insights', { durable: true }, (msg, ack) => {
      console.log(msg.content.toString());
      handleEvent(msg.content);
      ack(null, 'response');
    })
    .then(() => console.log('queue created'));
  });
   
rabbit.on('disconnected', (err = new Error('Rabbitmq Disconnected')) => {
//handle disconnections and try to reconnect
console.error(err);
setTimeout(() => rabbit.reconnect(), 100);
});

start()