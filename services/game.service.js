import { GameModel } from "../model/game.model.js";
import { AppError } from "../utils/app-error.js";

// Só aceita os campos editáveis, sem permitir trocar o proprietário.
const prepareGameData = (payload) => {
    const data = {}

    for (const field of ["title", "platform", "status", "rating"]) {
        if (payload?.[field] !== undefined) {
            data[field] = payload[field]
        }
    }

    return data
}

export const createGame = async (userId, payload) => {
    const data = prepareGameData(payload)

    const game = await GameModel.create({ ...data, user: userId })

    return game
}

export const listGamesByUser = async (userId) => {
    const games = await GameModel.find({ user: userId })

    return games
}

export const updateGameById = async (id, userId, payload) => {
    const data = prepareGameData(payload)

    const game = await GameModel.findOneAndUpdate({ _id: id, user: userId }, { $set: data }, {
        returnDocument: "after",
        runValidators: true
    })

    if (!game) {
        throw new AppError("Jogo não encontrado", 404)
    }

    return game
}

export const deleteGameById = async (id, userId) => {
    const game = await GameModel.findOneAndDelete({ _id: id, user: userId })

    if (!game) {
        throw new AppError("Jogo não encontrado", 404)
    }

    return game
}
