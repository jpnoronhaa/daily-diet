import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'

const app = fastify()

app.register(fastifyCookie)

export default app
