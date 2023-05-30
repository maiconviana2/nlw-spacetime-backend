/* eslint-disable prettier/prettier */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'


export async function memoriesRoutes(app: FastifyInstance) {

  // A função abaixo realiza uma pre verificação para saber se os dados esperados (dados configurados no auth.d.ts)
  app.addHook('preHandler', async (request)=>{

    // função jwtVerify() disponível após instalar @fastify/jwt
    await request.jwtVerify()
  })

  // Rota que retorna as memórias cadastradas
  app.get('/memories', async (request) => {
    const memories = await prisma.memory.findMany({
      // Seleciona as memórias do usuário cujo ID é igual ao verificado na função acima (request.user.sub vem de jwtVerify())
      where:{
        userId: request.user.sub,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Para cada memória dentro de memories, retorne a própria memória com os dados selecionados, e com o campo de conteúdo já cortado para enquadrar no layout
    return memories.map((memory) => {
      return {
        id: memory.id,
        coverUrl: memory.coverUrl,
        excerpt: memory.content.substring(0, 115).concat('...'),
      }
    })
  })

  app.get('/memories/:id', async (request ,reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })
    const { id } = paramsSchema.parse(request.params)

    const memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      },
    })

    // Verifica se a memória é diferente de pública e o id do usuário logado é igual o id do usuário que vem da verificação do jwt 
    if(!memory.isPublic && memory.userId !== request.user.sub){
      return reply.status(401).send()
    }
    return memory
  })

  app.post('/memories', async (request) => {
    const bodySchema = z.object({
      content: z.string(),
      coverUrl: z.string(),
      isPublic: z.coerce.boolean().default(false),
    })
    const { content, coverUrl, isPublic } = bodySchema.parse(request.body)

    // Cria uma memória com os dados recebidos e atribui ao usuário logado 
    const memory = await prisma.memory.create({
      data: {
        content,
        coverUrl,
        isPublic,
        userId: request.user.sub,
      },
    })
    return memory
  })

  app.put('/memories/:id', async (request,reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })
    const { id } = paramsSchema.parse(request.params)

    const bodySchema = z.object({
      content: z.string(),
      coverUrl: z.string(),
      // Por padrão a leitura de boolean não é 100% eficaz então usa o z.coerce para garantir que a resposta seja correta.
      isPublic: z.coerce.boolean().default(false),
    })

    const { content, coverUrl, isPublic } = bodySchema.parse(request.body)

    // Busca a memória pelo ID
    let memory = await prisma.memory.findUniqueOrThrow({ 
      where:{
        id,
      }
    })

    // Verifica se o userId da memória encontrada é igual ao userId do usuário logado 
    if(memory.userId !== request.user.sub){
      return reply.status(401).send()
    }

    // Atualiza os dados da memória com base no ID fornecido
     memory = await prisma.memory.update({
      where:{
        id,
      },
      data:{
        content,
        coverUrl,
        isPublic
      }
    })
    return memory
  })

  // Deleta memória com base no ID fornecido
  app.delete('/memories/:id', async (request,reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })
    const { id } = paramsSchema.parse(request.params)

    const memory = await prisma.memory.findUniqueOrThrow({ 
      where:{
        id,
      }
    })

    // Antes de deletar verifica se a memória selecionada pertence ao usuário logado.
    if(memory.userId !== request.user.sub){
      return reply.status(401).send()
    }

     await prisma.memory.delete({
      where: {
        id,
      },
    })
  })
}
