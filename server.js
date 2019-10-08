// Require the framework and instantiate it
const fastify = require('fastify')({ logger: true })
const dotenv = require('dotenv').config()
const { Rabbit } = require('rabbit-queue');
// Declare a route
fastify.get('/', async (request, reply) => {
  return { status: 'ok' }
})

fastify.register(require('fastify-postgres'), {
  connectionString: process.env.DATABASE_URL
})

// Run the server!
const start = async () => {
  try {
    await fastify.listen(process.env.PORT)
    fastify.log.info(`server listening on ${fastify.server.address().port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

const rabbit = new Rabbit(process.env.RABBIT_URL || 'amqp://localhost', {
  prefetch: 1, // default prefetch from queue
  replyPattern: true, // if reply pattern is enabled an exclusive queue is created
  scheduledPublish: false,
  prefix: '', // prefix all queues with an application name
  socketOptions: {} // socketOptions will be passed as a second param to amqp.connect and from ther to the socket library (net or tls)
});

function insightsDataHandler(data){
  data = JSON.parse(data)

  const actor = data.actor.account
  const contextActivities = data.context.contextActivities

  console.log('\n\n\n\n')
  console.log(data)

  // check if insights_id already exists
  fastify.pg.query(
    'SELECT school_id, roles FROM actor WHERE insights_id = $1', [actor.id],
    function onResult (err, result) {
      if(!err){
        if(result.rowCount === 0){

          // create new actor
          fastify.pg.query(
            'INSERT INTO actor (insights_id,school_id,roles) VALUES ($1,$2,$3)', [actor.id,actor.school_id,actor.roles],
            function onResult (err, result) {
              console.log(err)
            }
          )

        }else{

          // check if actor's role and school_id is up to date
          if(actor.school_id != result.rows[0].school_id && actor.roles != result.rows[0].roles)
          fastify.pg.query(
            'UPDATE actor SET school_id = $2, roles = $3 WHERE insights_id = $1', [actor.id,actor.school_id,actor.roles],
            function onResult (err, result) {
              console.log("UPDATE:" + result)
            }
          )

        }

        // insert into
/*          context_id; 
        fastify.pg.query(
          `INSERT INTO context (
            first_paint,
            time_to_interactive,
            page_loaded,
            dom_interactive_time,
            dom_content_loaded,
            downlink,
            request_start,
            response_start,
            response_end,
            connection,
            localhost,
            sw_offline,
            sw_enabled,
            network_protocol
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
            ) RETURNING context_id` , 
            [
              contextActivities.first_paint,
              contextActivities.time_to_interactive,
              contextActivities.page_loaded,
              contextActivities.dom_interactive_time,
              contextActivities.dom_content_loaded,
              contextActivities.downlink,
              contextActivities.request_start,
              contextActivities.response_start,
              contextActivities.response_end,
              contextActivities.connection,
              contextActivities.localhost,
              (contextActivities.sw_offline == 'true'),
              (contextActivities.sw_enabled == 'ture'),
              contextActivities.network_protocol
            ],
          function onResult (err, result) {
            context_id = result.rows[0].context_id
          }
        ) */
        // create new activity
        fastify.pg.query(
          `INSERT INTO activity (
            actor,
            verb,
            object,
            context,
            time
            ) VALUES (
              $1,$2,$3,$4,$5
            )`, 
            [
              actor.id,
              data.verb.display,
              data.object.id,
              contextActivities,
              data.time
            ],
          function onResult (err, result) {
            console.log(err || result)
          }
        )
      }
    }
  )
}

rabbit.on('connected', () => {
    rabbit
    .createQueue('insights', { durable: true }, (msg, ack) => {
      insightsDataHandler(msg.content.toString());
      ack(null, 'response');
    })
    .then(() => console.log('queue created'));
});
   
rabbit.on('disconnected', (err = new Error('Rabbitmq Disconnected')) => {
// handle disconnections and try to reconnect
console.error(err);
setTimeout(() => rabbit.reconnect(), 100);
});

start()