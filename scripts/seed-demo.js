import { readFile } from 'node:fs/promises'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { UserModel } from '../model/user.model.js'
import { GameModel } from '../model/game.model.js'
import { createUser } from '../services/user.service.js'

const email = 'teste@exemplo.com'

async function seedDemo() {
    const required = ['MONGODB_URI', 'MONGODB_NAME', 'DEMO_PASSWORD', 'DEMO_SECURITY_QUESTION', 'DEMO_SECURITY_ANSWER']
    const missing = required.filter((name) => !process.env[name]?.trim())
    if (missing.length) throw new Error(`Preencha no .env: ${missing.join(', ')}`)

    const source = JSON.parse(await readFile(new URL('../data/demo-games.json', import.meta.url), 'utf8'))
    if (!Array.isArray(source) || source.length !== 20) {
        throw new Error('data/demo-games.json deve conter uma lista de 20 jogos.')
    }

    // Valida todos os jogos antes de conectar ou criar registros.
    const titles = new Set()
    const games = []
    const validationUser = new mongoose.Types.ObjectId()
    for (const item of source) {
        if (!item || typeof item.title !== 'string' || typeof item.platform !== 'string') {
            throw new Error('Cada jogo deve informar título e plataforma como textos.')
        }
        const data = {
            title: item.title.trim(),
            platform: item.platform.trim(),
            status: item.status,
            rating: item.rating
        }
        await new GameModel({ ...data, user: validationUser }).validate()
        if (titles.has(data.title)) throw new Error(`Título repetido no arquivo de demonstração: ${data.title}`)
        titles.add(data.title)
        games.push(data)
    }

    await mongoose.connect(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_NAME,
        serverSelectionTimeoutMS: 10000
    }).catch(() => {
        throw new Error('Não foi possível conectar ao MongoDB. Confira o Docker e as variáveis MONGODB_URI e MONGODB_NAME.')
    })

    let usersCreated = 0
    let inserted = 0
    let existing = 0
    let user = await UserModel.findOne({ email }).select('+password')

    if (user) {
        const matches = user.password && await bcrypt.compare(process.env.DEMO_PASSWORD, user.password)
        if (!matches) {
            throw new Error('A conta teste@exemplo.com já existe, mas DEMO_PASSWORD não corresponde à senha cadastrada. Nenhum jogo foi inserido e a senha foi preservada.')
        }
    } else {
        // Reutiliza os hashes de senha e resposta de segurança do service original.
        user = await createUser({
            name: 'Usuário de demonstração',
            email,
            password: process.env.DEMO_PASSWORD,
            securityQuestion: process.env.DEMO_SECURITY_QUESTION,
            securityAnswer: process.env.DEMO_SECURITY_ANSWER
        })
        usersCreated++
    }

    for (const data of games) {
        const found = await GameModel.exists({ user: user._id, title: data.title })
        if (found) {
            existing++
            continue
        }
        await GameModel.create({ ...data, user: user._id })
        inserted++
    }

    console.log(`Usuários criados: ${usersCreated}`)
    console.log(`Jogos inseridos: ${inserted}`)
    console.log(`Jogos já existentes: ${existing}`)
}

try {
    await seedDemo()
} catch (error) {
    console.error('Falha ao preparar demonstração:', error.message)
    process.exitCode = 1
} finally {
    try {
        await mongoose.disconnect()
    } catch {
        console.error('Não foi possível encerrar a conexão com o MongoDB corretamente.')
        process.exitCode = 1
    }
}
