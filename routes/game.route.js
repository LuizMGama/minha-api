import express from 'express'
import { createGame, deleteGameById, listGamesByUser, updateGameById } from '../services/game.service.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { logAction } from '../middlewares/log.middleware.js'

export const gameRouter = express.Router()

// Todas as rotas de /games exigem usuário logado.
gameRouter.use(authenticate)

gameRouter.post('/', logAction('game.create', 'games'), async (req, res) => {
    const game = await createGame(req.user._id, req.body)

    res.locals.resourceId = game.id

    return res.status(201).json(game)
})

gameRouter.get('/', async (req, res) => {
    const games = await listGamesByUser(req.user._id)

    return res.json(games)
})

gameRouter.put('/:id', logAction('game.update', 'games'), async (req, res) => {
    const { id } = req.params

    const game = await updateGameById(id, req.user._id, req.body)

    return res.json(game)
})

gameRouter.delete('/:id', logAction('game.delete', 'games'), async (req, res) => {
    const { id } = req.params

    const game = await deleteGameById(id, req.user._id)

    return res.json(game)
})
