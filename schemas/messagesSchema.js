const mongoose = require ("mongoose");
const { Schema } = mongoose

const messagesSchema = new Schema({
    messageId: {type: String, required: true, },
    toAccountId: {type: String, required: true, },
    fromAccountId: {type: String, required: true, },
    messageContent: {type: String, required: true, },
    timestamp: {type: String, required: true, },
})

const name = 'messages'

module.exports = mongoose.models[name] || mongoose.model(name, messagesSchema, name)
