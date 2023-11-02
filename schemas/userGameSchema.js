const mongoose = require ("mongoose");
const { Schema } = mongoose

const likesSchema = new Schema({
    accountId: { type: String, required: true },
    timestamp: {type: String, required: true },
})

const commentSchema = new Schema({
    accountId: { type: String, required: true },
    timestamp: {type: String, required: true },
    comment: { type: String, required: true },
    likes: [likesSchema]
})

const gamesSchema = new Schema({
    platform: { type:String, required: true },
    downloadUrl: {type: String, required: true },
})

const userGameSchema = new Schema({
    gameId: { type: String, required: true },
    version: { type: String, required: true },
    accountId: { type: String, required: true },
    description: { type: String, required: false },
    timestamp: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    tags: {type: Array, required: false },
    gameFiles: [gamesSchema],
    likes: [likesSchema],
    comments: [commentSchema]
})

const name = 'userGame'

module.exports = mongoose.models[name] || mongoose.model(name, userGameSchema, name)
