import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "O título é obrigatório"],
        trim: true
    },
    platform: {
        type: String,
        required: [true, "A plataforma é obrigatória"],
        trim: true
    },
    status: {
        type: String,
        enum: ["quero-jogar", "jogando", "concluido"],
        default: "quero-jogar"
    },
    rating: {
        type: Number,
        min: 0,
        max: 10
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "O usuário é obrigatório"],
        ref: "Users"
    }
}, {
    timestamps: true
})

export const GameModel = mongoose.model("Games", gameSchema)
