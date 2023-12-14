const mongoose = require ("mongoose");
const { Schema } = mongoose

const notificationSchema = new Schema({
    notificationId: { type: String, required: true },
    timestamp: { type: String, required: true },
    type: { type: String, required: true },
    fromAccountId: { type: String, required: true },
    contentId: { type: String, required: true },
    notificationMessage: { type: String, required: false }
})

const followedBy = new Schema({
    accountId: { type: String, required: true },
    timestamp: {type: String, required: true },
})

let aiNegativePrompt = "worst quality, low quality, watermark, signature, bad anatomy, bad hands, deformed limbs, blurry, cropped, cross-eyed, extra arms, speech bubble, extra legs, extra limbs, bad proportions, poorly drawn hands, text,"

const aiSchema = new Schema({
    prompt: { type: String, default: "1girl, cute" },
    negativeprompt: { type: String, default: aiNegativePrompt },
    model: { type: String, default: "furry" },
    loras: { type: Object },
    advancedMode: { type: Boolean, default: false },
})

const userProfileSchema = new Schema({
    badges: {
        admin: { type: Boolean, default: false },
        artist: {type: Boolean, default: false },
        game: {type: Boolean, default: false },
        verified: { type: Boolean, default: false },
        supporter: { type: Boolean, default: false },
    },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    avatarUrl: { type: String, required: false, default: "pic.png"},
    bio: { type: String, default: "User has not set their bio!" },
    password: { type: String, required: true },
    accountId: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false},
    tempEmailHash: { type: String, required: true },
    timestamp: { type: String, required: false },
    followedBy: [followedBy],
    notifications: [notificationSchema],
    ai: aiSchema
})

const name = 'userAccount'

module.exports = mongoose.models[name] || mongoose.model(name, userProfileSchema, name)
