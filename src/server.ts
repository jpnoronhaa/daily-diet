import app from './app'
import { env } from './env'

app.listen({ port: env.PORT }).then(() => {
  console.log('Server Started! Listening on port ' + env.PORT)
})
