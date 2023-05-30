import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import axios from 'axios'
import { prisma } from '../lib/prisma'

export async function authRoutes(app: FastifyInstance) {
  // Função para lidar com a rota /register. (Recebe como parâmetro o request que são os dados da requisição)
  app.post('/register', async (request) => {
    // Validação com Zod dos dados recebidos. Basicamente está dizendo que dentro de bodySchema vai contar um objeto com a propriedade code e que code é uma string.
    const bodySchema = z.object({
      code: z.string(),
    })
    // Extrai o code de dentro de request.body e obrigatoriamente diz que tem que ser do tipo bodySchema.
    const { code } = bodySchema.parse(request.body)

    // Função que acessa o link abaixo enviado o client_id, client_secret e code. Recebe a resposta em Json e armazena em accessTokenResponse
    const accessTokenResponse = await axios.post(
      'https:/github.com/login/oauth/access_token',
      null,
      {
        params: {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        headers: {
          Accept: 'application/json',
        },
      },
    )

    // Extrai de dentro do objeto accessTokenResponse o próprio access_token
    const { access_token } = accessTokenResponse.data

    // Função que acessa o link do github abaixo e traz as informações do usuário. Authorization diz que o método de autenticação é o Bearer + cccess_token
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    // Tipagem para garantir que a resposta será do jeito que queremos, no caso assim como descrito abaixo.
    const userSchema = z.object({
      id: z.number(),
      login: z.string(),
      name: z.string(),
      avatar_url: z.string().url(),
    })

    // Coloca dentro de user a resposta da função (userResponse)
    const userInfo = userSchema.parse(userResponse.data)

    let user = await prisma.user.findUnique({
      where: {
        githubId: userInfo.id,
      },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          githubId: userInfo.id,
          login: userInfo.login,
          name: userInfo.name,
          avatarUtl: userInfo.avatar_url,
        },
      })
    }
    const token = app.jwt.sign(
      {
        name: user.name,
        avatarUrl: user.avatarUtl,
      },
      {
        sub: user.id,
        expiresIn: '30 days',
      },
    )

    return {
      token,
    }
  })
}
