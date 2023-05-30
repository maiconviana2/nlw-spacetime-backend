import '@fastify/jwt'

declare module '@fastify/jwt' {
  export interface FastifyJWT {
    user: {
      sub: string
      name: string
      avatarUrl: number
    }
  }
}

// Esse arquivo deve ser criado para que o fastify/jwt entenda que o usuário possui essas informações.
