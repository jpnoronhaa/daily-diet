import { FastifyInstance } from 'fastify'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
      email: z.string(),
      birthDate: z.string(),
    })

    const { name, email, birthDate } = createUserBodySchema.parse(request.body)

    const date = new Date(birthDate)

    const sessionId = randomUUID()
    reply.cookie('sessionId', sessionId, {
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    })

    await knex('users').insert({
      id: randomUUID(),
      session_id: sessionId,
      name,
      email,
      birthDate: date,
    })

    return reply.status(201).send()
  })

  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies
    const users = await knex('users').where('session_id', sessionId).select()

    return { users }
  })

  app.get(
    '/metrics/',
    { preHandler: [checkSessionIdExists] },
    async (request) => {
      const { sessionId } = request.cookies
      const user = await knex('users').where('session_id', sessionId).first()

      const mealsCount = await knex('meal')
        .where({
          user_id: user?.id,
        })
        .count('*', { as: 'total' })

      const inDiet = await knex('meal')
        .where({
          user_id: user?.id,
          is_diet: true,
        })
        .count('*', { as: 'total' })

      const outDiet = await knex('meal')
        .where({
          user_id: user?.id,
          is_diet: false,
        })
        .count('*', { as: 'total' })

      const sortedMeals = await knex('meal')
        .where({
          user_id: user?.id,
        })
        .orderBy('ate_at')
        .select()

      let bestScore = 0

      let score = 0
      for (let i = 0; i < sortedMeals.length; i++) {
        if (sortedMeals[i].is_diet) {
          score++
        } else {
          score = 0
        }

        if (score > bestScore) {
          bestScore = score
        }
      }

      return { mealsCount, inDiet, outDiet, score: { bestScore: score } }
    },
  )

  app.get('/meal/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const sessionId = request.cookies.sessionId
    const user = await knex('users').where('session_id', sessionId).first()

    const meals = await knex('meal')
      .where('user_id', user?.id)
      .select()

    return { meals }
  })

  app.get(
    '/meal/:id',
    { preHandler: [checkSessionIdExists] },
    async (request) => {
      const sessionId = request.cookies.sessionId
      const user = await knex('users').where('session_id', sessionId).first()
      const getMealParamsSchema = z.object({ id: z.string().uuid() })

      const { id } = getMealParamsSchema.parse(request.params)

      const meal = await knex('meal')
        .where({
          id,
          user_id: user?.id,
        })
        .first()

      return { meal }
    },
  )

  app.delete(
    '/meal/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const sessionId = request.cookies.sessionId
      const user = await knex('users').where('session_id', sessionId).first()
      const getMealParamsSchema = z.object({ id: z.string().uuid() })

      const { id } = getMealParamsSchema.parse(request.params)

      await knex('meal')
        .where({
          id,
          user_id: user?.id,
        })
        .del()

      return reply.status(204).send()
    },
  )

  app.patch(
    '/meal/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const updateMealBodySchema = z.object({
        name: z.string().nullable(),
        description: z.string().nullable(),
        ate_at: z.string().nullable(),
        is_diet: z.boolean().nullable(),
      })
      const getMealParamsSchema = z.object({ id: z.string().uuid() })

      // eslint-disable-next-line camelcase
      const { name, description, ate_at, is_diet } = updateMealBodySchema.parse(
        request.body,
      )
      const { id } = getMealParamsSchema.parse(request.params)
      const sessionId = request.cookies.sessionId

      const user = await knex('users').where('session_id', sessionId).first()

      let meal = await knex('meal')
        .where({
          id,
          user_id: user?.id,
        })
        .first()

      meal = await knex('meal')
        .where({
          id,
          user_id: user?.id,
        })
        .update({
          name: name || meal?.name,
          description: description || meal?.description,
          // eslint-disable-next-line camelcase
          is_diet: is_diet || meal?.is_diet,
          // eslint-disable-next-line camelcase
          ate_at: ate_at ? new Date(ate_at) : meal?.ate_at,
        })

      return { meal }
    },
  )

  app.post(
    '/meal/',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        ate_at: z.string(),
        is_diet: z.boolean(),
      })

      // eslint-disable-next-line camelcase
      const { name, description, ate_at, is_diet } = createMealBodySchema.parse(
        request.body,
      )

      const date = new Date(ate_at)

      const sessionId = request.cookies.sessionId

      const user = await knex('users').where('session_id', sessionId).first()

      await knex('meal').insert({
        id: randomUUID(),
        user_id: user?.id,
        name,
        description,
        // eslint-disable-next-line camelcase
        is_diet,
        ate_at: date,
      })

      return reply.status(201).send()
    },
  )
}
