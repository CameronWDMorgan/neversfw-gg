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

const userContentSchema = new Schema({
    contentId: { type: String, required: true, },
    accountId: { type: String, required: true },
    timestamp: {type: String, required: true },
    contentUrl: { type: Array, required: true },
    name: { type: String, required: true },
    description: { type: String, required: false},
    tags: {type: Array, required: true },
    likes: [likesSchema],
    comments: [commentSchema]
})

const name = 'userContent'

module.exports = mongoose.models[name] || mongoose.model(name, userContentSchema, name)
