module.exports = async function(app){

    const config = require('./ligmaballs.json')

    //encryption
    const bcrypt = require('bcrypt');
    const ffmpeg = require('fluent-ffmpeg');
    //userProfileSchema, mongodb
    const messagesSchema = require('./schemas/messagesSchema')
    const userProfileSchema = require('./schemas/userProfileSchema')
    const userContentSchema = require('./schemas/userContentSchema')
    const userGameSchema = require('./schemas/userGameSchema');

    const multer = require('multer');
    const fs = require('fs');
    const path = require('path');
    
    const fetch = require('node-fetch')

    const upload = multer({ dest: 'temp/' });

    const nodemailer = require("nodemailer");

    let transporter = nodemailer.createTransport({
        host: "smtp-relay.sendinblue.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: config.email_username, // generated ethereal user
            pass: config.email_password, // generated ethereal password
        },
    });

    async function encryptPassword(password) {
        let hashedPassword = await bcrypt.hash(password, config.salt);
        return hashedPassword
    }

    async function validateEmail(req, res) {
        if(!req.body.email) {
            res.render('sysmessage', {session: req.session, message: 'Invalid Email', messageType: 'error', buttonText: 'Back', buttonLink:'history.back()' })
            return true
        }
        if(req.body.email == undefined) {
            res.render('sysmessage', {session: req.session, message: 'Invalid Email', messageType: 'error', buttonText: 'Back', buttonLink:'history.back()' })
            return true
        }
        if(req.body.email.length < 4 || req.body.email.length > 320 || !req.body.email.includes("@") || !req.body.email.includes(".")){
            res.render('sysmessage', {session: req.session, message: 'Invalid Email', messageType: 'error', buttonText: 'Back', buttonLink:'history.back()' })
            return true
        }

        let emailAccountCount = await userProfileSchema.countDocuments({ email: req.body.email })
        if(emailAccountCount>0){
          res.render('sysmessage', {session: req.session, message: 'Email already in use', messageType: 'error', buttonText: 'Back', buttonLink:'history.back()' })
          return true
        }
        return false
    }

    async function validateBio(req, res) {
        if(req.body.bio.length < 1 || req.body.bio.length > 200){
            res.render('sysmessage', {
                session: req.session,
                message: 'Invalid bio', messageType: 'error',
                buttonText: 'Back', buttonLink:'history.back()' 
            })
            return true
        }
        return false
    }

    async function validateUsername(req, res) {
        if(req.body.username.length < 4 || req.body.username.length > 20){
            res.render('sysmessage', {session: req.session, message: 'Invalid Username', messageType: 'error', buttonText: 'Back', buttonLink:'history.back()' })
            return true
        }

        let usernameAccountCount = await userProfileSchema.countDocuments({ username: req.body.username })
        if(usernameAccountCount>0){
          res.render('sysmessage', {session: req.session, message: 'Username is taken', messageType: 'error', buttonText: 'Back', buttonLink:'history.back()' })
          return true
        }
        return false
    }

    async function validatePassword(req, res) {
        if(req.body.password.length < 7){
            res.render('sysmessage', {session: req.session, message: 'Invalid Password', messageType: 'error', buttonText: 'Back', buttonLink:'history.back()' })
            return true
        }
        return false
    }




    const { parse } = require('csv-parse/sync');

    async function loadTags() {
        const csvContent = fs.readFileSync(path.resolve(__dirname, 'danbooru.csv'), { encoding: 'utf-8' });
        const records = parse(csvContent, {
            columns: false,
            skip_empty_lines: true,
            trim: true
    });

    // Sort the records by the usage count (which is at index 2) in descending order.
    records.sort((a, b) => b[2] - a[2]);

    const tagsLookup = {};

    records.forEach(record => {
        const tag = record[0];
        const score = parseInt(record[2]); // Get the usage count and parse it as an integer.
        tagsLookup[tag] = { tag, score, aliases: [] }; // Initialize tag with score and empty aliases array.

        const aliases = record[3] ? record[3].split(',') : [];
        aliases.forEach(alias => {
        const trimmedAlias = alias.trim();
        tagsLookup[trimmedAlias] = { tag, score }; // Map each alias to the tag and its score.
        tagsLookup[tag].aliases.push(trimmedAlias); // Add alias to the tag's alias list.
        });
    });

    return tagsLookup;
    }

    // Middleware to set up tags in the request
    app.use(async (req, res, next) => {
    req.tagsLookup = await loadTags();
    next();
    });


    // Example endpoint to send CSV data
    app.get('/get-tags', async (req, res) => {
        const tagsLookup = await loadTags(); // Load or process your tags here
        res.json(tagsLookup);
    });







    app.get('/contact', async function (req,res) {
        res.render('contact',{session: req.session})
    })

    app.get('/download', async function (req, res) {
        try {
        const file = `${req.query.gameFile}`
    
        if (fs.existsSync(file)) {
            const fileStats = fs.statSync(file)
    
            if (fileStats.isDirectory()) {
            res.send('Invalid file')
            return
            }

            res.download(file)
              
            
    
            
            
        }

        } catch (err) {
        console.log(err)
        }
    });

    app.get('/', async function(req,res){

        console.log(req.session)

        let artAggregatePopular = await userContentSchema.aggregate([
            { $project: {
                contentId: 1,
                accountId: 1,
                timestamp: 1,
                contentUrl: 1,
                name: 1,
                description: 1,
                tags: 1,
                likes: 1,
                comments: 1,
                likesCount: { $size: "$likes" }
                } 
            },
            { $sort: { likesCount: -1, timestamp: -1 } },
            { $limit: 3 }
        ])
        let artAggregateRecent = await userContentSchema.aggregate([
            { $sort: { timestamp: -1 } },
            { $limit: 3 }
        ])

        let followedAccounts = await userProfileSchema.aggregate([
            { $match: {
                $or: [
                  { "followedBy.accountId": { "$regex": `${req.session.accountId}` }}
                ]
            }},
        ])

        let followsList = []

        await followedAccounts.forEach(followedAccount => {
            followsList.push(followedAccount.accountId)
        })

        let artAggregateFollowing = await userContentSchema.aggregate([
            {
                $match: {
                    accountId: {
                        $in: followsList
                    }
                }
            },
            { $sort: { timestamp: -1 } },
            { $limit: 3 }
        ])
        let gameAggregate = await userGameSchema.aggregate([
            { $limit: 2 },
            { $sort: { timestamp: -1 }}
        ])
        let accounts = []







        await Promise.all(
            artAggregatePopular.map(async artwork => {
                let result = await userProfileSchema.findOne({ accountId: artwork.accountId })
                let toPush = {}
                if(result) {
                    username = result.username
                    accountId = result.accountId
                    avatarUrl = result.avatarUrl
                    toPush = {
                        username: username,
                        accountId: accountId,
                        avatarUrl: avatarUrl
                    }
                }
                accounts.push(toPush)
                if(artwork.comments.length >= 1) {
                    await Promise.all(
                        artwork.comments.map(async comment => {
                        
                            let result = await userProfileSchema.findOne({ accountId: comment.accountId })
                            toPush = {}
                            if(result) {
                                username = result.username
                                accountId = result.accountId
                                avatarUrl = result.avatarUrl
                                toPush = {
                                    username: username,
                                    accountId: accountId,
                                    avatarUrl: avatarUrl
                                }
                                accounts.push(toPush)
                            }
                            
                        })
                    )
                }
            })
        )

        await Promise.all(
            artAggregateRecent.map(async artwork => {
                let result = await userProfileSchema.findOne({ accountId: artwork.accountId })
                let toPush = {}
                if(result) {
                    username = result.username
                    accountId = result.accountId
                    avatarUrl = result.avatarUrl
                    toPush = {
                        username: username,
                        accountId: accountId,
                        avatarUrl: avatarUrl
                    }
                }
                accounts.push(toPush)
                if(artwork.comments.length >= 1) {
                    await Promise.all(
                        artwork.comments.map(async comment => {
                        
                            let result = await userProfileSchema.findOne({ accountId: comment.accountId })
                            toPush = {}
                            if(result) {
                                username = result.username
                                accountId = result.accountId
                                avatarUrl = result.avatarUrl
                                toPush = {
                                    username: username,
                                    accountId: accountId,
                                    avatarUrl: avatarUrl
                                }
                                accounts.push(toPush)
                            }
                            
                        })
                    )
                }
            })
        )

        await Promise.all(
            artAggregateFollowing.map(async artwork => {
                let result = await userProfileSchema.findOne({ accountId: artwork.accountId })
                let toPush = {}
                if(result) {
                    username = result.username
                    accountId = result.accountId
                    avatarUrl = result.avatarUrl
                    toPush = {
                        username: username,
                        accountId: accountId,
                        avatarUrl: avatarUrl
                    }
                }
                accounts.push(toPush)
                if(artwork.comments.length >= 1) {
                    await Promise.all(
                        artwork.comments.map(async comment => {
                        
                            let result = await userProfileSchema.findOne({ accountId: comment.accountId })
                            toPush = {}
                            if(result) {
                                username = result.username
                                accountId = result.accountId
                                avatarUrl = result.avatarUrl
                                toPush = {
                                    username: username,
                                    accountId: accountId,
                                    avatarUrl: avatarUrl
                                }
                                accounts.push(toPush)
                            }
                            
                        })
                    )
                }
            })
        )

        await Promise.all(
            gameAggregate.map(async game => {
                let result = await userProfileSchema.findOne({ accountId: game.accountId })
                let toPush = {}
                if(result) {
                    username = result.username
                    accountId = result.accountId
                    avatarUrl = result.avatarUrl
                    toPush = {
                        username: username,
                        accountId: accountId,
                        avatarUrl: avatarUrl
                    }
                }
                accounts.push(toPush)
            })
        )

        

        res.render('beta/home', {
            session: req.session,
            // artAggregatePopular,
            // artAggregateRecent,
            // artAggregateFollowing,
            // gameAggregate,
            // accounts
        })
    })

    app.get('/art/:contentId', async function(req,res) {

        let contentId = req.params.contentId

        let artwork = await userContentSchema.findOne({ contentId: contentId })

        if(!artwork) {
            res.render('sysmessage', {
                session: req.session, message: 'Artwork with that contentId doesnt exist...',
                messageType: 'error', buttonText: 'To Home', buttonLink:'location.href="https://www.neversfw.gg/' })
            return true
        }

        let postedBy = await userProfileSchema.findOne({ accountId: artwork.accountId })


        if(!postedBy) {
            res.render('sysmessage', {
                session: req.session, message: 'OP doesnt exist... Report this to MiningP Immediately',
                messageType: 'error', buttonText: 'To Contact Page', buttonLink:'location.href="https://www.neversfw.gg/contact' })
            return true
        }

        let accounts = []
            
        let toPush = {
            username: postedBy.username,
            accountId: postedBy.accountId,
            avatarUrl: postedBy.avatarUrl
        }
        accounts.push(toPush)
        if(artwork.comments.length >= 1) {
            await Promise.all(
                artwork.comments.map(async comment => {
                
                    let result = await userProfileSchema.findOne({ accountId: comment.accountId })
                    let toPush = {}
                    if(result) {
                        toPush = {
                            username: result.username,
                            accountId: result.accountId,
                            avatarUrl: result.avatarUrl
                        }
                        accounts.push(toPush)
                    }
                    
                })
            )
        }

        res.render('beta/art', {
            session: req.session,
            artwork,
            accounts
        })

    })

    app.get('/art/:contentId/:artNumber', async function(req,res) {

        let contentId = req.params.contentId

        let artwork = await userContentSchema.findOne({ contentId: contentId })

        if(!artwork) {
            res.render('sysmessage', {
                session: req.session, message: 'Artwork with that contentId doesnt exist...',
                messageType: 'error', buttonText: 'To Home', buttonLink:'location.href="https://www.neversfw.gg/' })
            return true
        }

        let postedBy = await userProfileSchema.findOne({ accountId: artwork.accountId })


        if(!postedBy) {
            res.render('sysmessage', {
                session: req.session, message: 'OP doesnt exist... Report this to MiningP Immediately',
                messageType: 'error', buttonText: 'To Contact Page', buttonLink:'location.href="https://www.neversfw.gg/contact' })
            return true
        }

        let accounts = []
            
        let toPush = {
            username: postedBy.username,
            accountId: postedBy.accountId,
            avatarUrl: postedBy.avatarUrl
        }
        accounts.push(toPush)
        if(artwork.comments.length >= 1) {
            await Promise.all(
                artwork.comments.map(async comment => {
                
                    let result = await userProfileSchema.findOne({ accountId: comment.accountId })
                    let toPush = {}
                    if(result) {
                        toPush = {
                            username: result.username,
                            accountId: result.accountId,
                            avatarUrl: result.avatarUrl
                        }
                        accounts.push(toPush)
                    }
                    
                })
            )
        }

        artNumber = req.params.artNumber

        res.render('art-single', {
            session: req.session,
            artwork,
            accounts,
            artNumber
        })

    })

    app.get('/notifications', async function(req,res){

        if(!req.session.accountId) {
            res.render('sysmessage', {
                session: req.session,
                message: 'You need to be logged in to view messages!',
                messageType: 'error', buttonText: 'Go to Login', buttonLink:'location.href="https://www.neversfw.gg/login"' })
            return true
        }

        let user = await userProfileSchema.findOne({ accountId: req.session.accountId })

        let accounts = []
        let contents = []
        let games = []







        await Promise.all(
            user.notifications.map(async notification => {
                if(notification.type == "follow"){
                    let result = await userProfileSchema.findOne({ accountId: notification.fromAccountId })
                    let toPush = {}
                    if(result) {
                        username = result.username
                        accountId = result.accountId
                        avatarUrl = result.avatarUrl
                        toPush = {
                            username: username,
                            accountId: accountId,
                            avatarUrl: avatarUrl
                        }
                    }
                    accounts.push(toPush)
                }
                if(notification.type == "like"){
                    let result = await userContentSchema.findOne({ contentId: notification.contentId })
                    let toPush = {}
                    if(result) {
                        toPush = {
                            contentId: result.contentId,
                            name: result.name,
                        }
                    }
                    contents.push(toPush)
                }
                if(notification.type == "gameLike"){
                    let result = await userGameSchema.findOne({ gameId: notification.contentId })
                    let toPush = {}
                    if(result) {
                        toPush = {
                            gameId: result.gameId,
                        }
                    }
                    games.push(toPush)
                }
                if(notification.type == "followArtwork"){
                    let result = await userContentSchema.findOne({ contentId: notification.contentId })
                    let toPush = {}
                    if(result) {
                        toPush = {
                            contentId: result.contentId,
                            name: result.name,
                        }
                    }
                    contents.push(toPush)
                }
            })
        )


        let notifications = user.notifications.reverse()


        res.render('notifications', {
            session: req.session,
            notifications,
            accounts,
            contents,
            games
        })
    })

    app.get('/search', async function(req,res){


        try{
            let searchTerm = req.query.searchTerm

        let userAggregate = await userProfileSchema.aggregate([
            { $match: {
              $or: [
                { username: { "$regex": `^${searchTerm}$`, $options: 'i' }},
                { username: { "$regex": `${searchTerm}` }}
              ]
            }},
            { $project: {
                badges: 1,
                username: 1,
                avatarUrl: 1,
                bio: 1,
                accountId: 1,
                followedBy: 1,
                followerCount: { $size: "$followedBy" }
            } },
            { $sort: { followerCount: -1 } },
            { $limit: 15 }
        ])

        let artAggregate = ''

            artAggregate = await userContentSchema.aggregate([
                { $match:
                    { $or: [
                            { name: {"$regex": `^${searchTerm}$`,$options:'i'}},
                            { name: {"$regex": `${searchTerm}`}},
                            { tags: {"$regex": `^${searchTerm}$`,$options:'i'}},
                            { tags: {"$regex": `${searchTerm}`}},
                        ]
                    }
                },
                    { $project: {
                    contentId: 1,
                    accountId: 1,
                    timestamp: 1,
                    contentUrl: 1,
                    name: 1,
                    description: 1,
                    tags: 1,
                    likes: 1,
                    comments: 1,
                    likesCount: { $size: "$likes" }
                    } 
                },
                    { $sort: { likesCount: -1, timestamp: -1 } },
                    { $limit: 3 }
                ])
        // }
        let gameAggregate = await userGameSchema.aggregate({ $or: 
            [
                { name: {"$regex": `^${searchTerm}$`,$options:'i'}},
                { name: {"$regex": `${searchTerm}`}},
                { tags: {"$regex": `^${searchTerm}$`,$options:'i'}},
                { tags: {"$regex": `${searchTerm}`}},
            ]
        }).sort({timestamp:1}).limit(2)
        let accounts = []

        await Promise.all(
            artAggregate.map(async artwork => {
                let result = await userProfileSchema.findOne({ accountId: artwork.accountId })
                let toPush = {}
                if(result) {
                    username = result.username
                    accountId = result.accountId
                    avatarUrl = result.avatarUrl
                    toPush = {
                        username: username,
                        accountId: accountId,
                        avatarUrl: avatarUrl
                    }
                }
                accounts.push(toPush)
                if(artwork.comments.length >= 1) {
                    await Promise.all(
                        artwork.comments.map(async comment => {
                        
                            let result = await userProfileSchema.findOne({ accountId: comment.accountId })
                            toPush = {}
                            if(result) {
                                username = result.username
                                accountId = result.accountId
                                avatarUrl = result.avatarUrl
                                toPush = {
                                    username: username,
                                    accountId: accountId,
                                    avatarUrl: avatarUrl
                                }
                                accounts.push(toPush)
                            }
                            
                        })
                    )
                }
            })
        )

        await Promise.all(
            gameAggregate.map(async game => {
                let result = await userProfileSchema.findOne({ accountId: game.accountId })
                let toPush = {}
                if(result) {
                    username = result.username
                    accountId = result.accountId
                    avatarUrl = result.avatarUrl
                    toPush = {
                        username: username,
                        accountId: accountId,
                        avatarUrl: avatarUrl
                    }
                }
                accounts.push(toPush)
                if(game.comments.length >= 1) {
                    await Promise.all(
                        game.comments.map(async comment => {
                        
                            let result = await userProfileSchema.findOne({ accountId: comment.accountId })
                            toPush = {}
                            if(result) {
                                username = result.username
                                accountId = result.accountId
                                avatarUrl = result.avatarUrl
                                toPush = {
                                    username: username,
                                    accountId: accountId,
                                    avatarUrl: avatarUrl
                                }
                                accounts.push(toPush)
                            }
                            
                        })
                    )
                }
            })
        )

        let followedAccounts = []

        await Promise.all(
            userAggregate.map(async user => {
                if(user.followedBy.length >= 1){
                    user.followedBy.forEach(follow => {
                        toPush = {
                            following: user.accountId,
                            followedBy: follow.accountId
                        }
                        followedAccounts.push(toPush)
                    })
                }
            })
        )

        res.render('search', {
            session: req.session,
            artAggregate,
            gameAggregate,
            userAggregate,
            searchTerm,
            accounts,
            followedAccounts
        })
        } catch(err) {
            console.log(err)
            res.send(`ERROR CAUGHT: ${err}`)
        }

        
    })

    app.post('/showMore', async function(req,res){

        let newContentList = []

        let currentContentList = new Array()

        currentContentList = req.body.contentList.split(",");

        let responseAggregate = ''

        if(req.body.pageType == "userArt") {
            responseAggregate = await userContentSchema.aggregate([
                { $sort: { timestamp: -1 }},
                {
                    $match: {
                        contentId: {
                            $not: {
                            $in: currentContentList
                            }
                        },
                        accountId: req.body.accountId
                    }
                },
                { $limit: 3 }
            ])
        }

        if(req.body.pageType == "userGame") {
            responseAggregate = await userGameSchema.aggregate([
                { $match: { accountId: req.body.accountId }},
                { $sort: { timestamp: -1 }},
                {
                    $match: {
                        gameId: {
                            $not: {
                            $in: currentContentList
                            }
                        }
                    }
                },
                { $limit: 2 }
            ])
        }

        if(req.body.pageType == "homePopular") {
            responseAggregate = await userContentSchema.aggregate([
                {
                    $match: {
                        contentId: {
                            $not: {
                            $in: currentContentList
                            }
                        }
                    }
                },
                { $project: {
                    contentId: 1,
                    accountId: 1,
                    timestamp: 1,
                    contentUrl: 1,
                    name: 1,
                    description: 1,
                    tags: 1,
                    likes: 1,
                    comments: 1,
                    likesCount: { $size: "$likes" }
                    } 
                },
                { $sort: { likesCount: -1, timestamp: -1 } },
                { $limit: 3 }
            ])
        }

        if(req.body.pageType == "homeRecent") {
            responseAggregate = await userContentSchema.aggregate([
                { $sort: { timestamp: -1 }},
                {
                    $match: {
                        contentId: {
                            $not: {
                            $in: currentContentList
                            }
                        }
                    }
                },
                { $limit: 3}
            ])
        }

        if(req.body.pageType == "homeFollowing"){
            let followedAccounts = await userProfileSchema.aggregate([
                { $match: {
                    $or: [
                      { "followedBy.accountId": { "$regex": `${req.session.accountId}` }}
                    ]
                }},
            ])
    
            let followsList = []
    
            await followedAccounts.forEach(followedAccount => {
                followsList.push(followedAccount.accountId)
            })
    
            responseAggregate = await userContentSchema.aggregate([
                {
                    $match: {
                        contentId: {
                            $not: {
                            $in: currentContentList
                            }
                        },
                        accountId: {
                            $in: followsList
                        }
                    }
                },
                { $sort: { timestamp: -1 } },
                { $limit: 3 }
            ])
        }

        if(req.body.pageType == "gameHomeRecent") {
            responseAggregate = await userGameSchema.aggregate([
                { $sort: { timestamp: -1 }},
                {
                    $match: {
                        gameId: {
                            $not: {
                            $in: currentContentList
                            }
                        }
                    }
                },
                { $limit: 2}
            ])
        }

        if(req.body.pageType == "searchArt") {

            let searchTerm = req.body.searchTerm

            responseAggregate = await userContentSchema.aggregate([
                {
                    $match: {
                        contentId: {
                            $not: {
                            $in: currentContentList
                            }
                        },
                    
                        $or: [
                            { name: { "$regex": `^${searchTerm}$`, $options: 'i' }},
                            { name: { "$regex": `${searchTerm}` }},
                            { tags: { "$in": [new RegExp(`^${searchTerm}$`, 'i')] }},
                            { tags: { "$in": [new RegExp(`${searchTerm}`)] }},
                        ]
                    },
                },
                {
                    $project: {
                    contentId: 1,
                    accountId: 1,
                    timestamp: 1,
                    contentUrl: 1,
                    name: 1,
                    description: 1,
                    tags: 1,
                    likes: 1,
                    comments: 1,
                    likesCount: { $size: "$likes" },
                    },
                },
                { $sort: { likesCount: -1, timestamp: -1 } },
                { $limit: 3 },
            ]);
        }


        if(req.body.pageType == "searchGame") {
            let searchTerm = req.body.searchTerm

            responseAggregate = await userGameSchema.aggregate([
                { $match: {
                    gameId: {
                        $not: {
                            $in: currentContentList
                        }
                    },
                    $or: [
                        { gameId: { "$regex": `^${searchTerm}$`, $options: 'i' }},
                        { gameId: { "$regex": `${searchTerm}` }},
                        { tags: { "$regex": `^${searchTerm}$`, $options: 'i' }},
                        { tags: { "$regex": `${searchTerm}` }},
                    ]
                }},
                { $sort: { timestamp: -1 }},
                { $limit: 2}
            ])
        }
        
        let accounts = []

        await Promise.all(
            responseAggregate.map(async content => {
                if(content.contentId) {
                    newContentList.push(content.contentId)
                } else {
                    newContentList.push(content.gameId)
                }
                let result = await userProfileSchema.findOne({ accountId: content.accountId })
                let toPush = {}
                if(result) {
                    toPush = {
                        username: result.username,
                        accountId: result.accountId,
                        avatarUrl: result.avatarUrl
                    }
                }
                accounts.push(toPush)
                if(content.comments) {
                    await Promise.all(
                        content.comments.map(async comment => {
                            
                            let result = await userProfileSchema.findOne({ accountId: comment.accountId })
                            let toPush = {}
                            if(result) {
                                toPush = {
                                    username: result.username,
                                    accountId: result.accountId,
                                    avatarUrl: result.avatarUrl
                                }
                                accounts.push(toPush)
                            }
                            
                        })
                    )
                }
            })
        )

        newContentList.push(req.body.contentList)

        // Check if there is no more content to send back
        if (responseAggregate.length === 0) {
            return res.send({ message: "No more content", endOfContent: true });
        }
        console.log(responseAggregate.length)

        return res.send({accounts:accounts,responseAggregate: responseAggregate,newContentList: newContentList, pageType:req.body.pageType, session:req.session})
    })

    app.post('/artworkLike', async function(req,res) {
        if(!req.session.loggedIn){
            return res.send({likes:`Not Logged In`});
        }
        let like = {
          accountId: req.session.accountId,
          timestamp: Date.now()
        }

        let likedContent = await userContentSchema.findOne({contentId: req.body.contentId})

        let likedProfile = await userProfileSchema.findOne({accountId: likedContent.accountId})

        let notification = {
            notificationId: `${Number(likedProfile.notifications.length) + 1}`,
            timestamp: Date.now(),
            type: 'like',
            contentId: req.body.contentId,
            fromAccountId: req.session.accountId
        }

        let alreadyLiked = await userContentSchema.aggregate([
          {
            "$match": {"contentId": req.body.contentId}
          },
          {
            "$unwind": '$likes'
          },
          {
            "$match": {"likes.accountId": req.session.accountId}
          },
        ])
      
        if(alreadyLiked.length>0){

            let contentLike = alreadyLiked[0]
            await userContentSchema.updateOne(
                { contentId: contentLike.contentId },
                {
                    $pull: { 
                        likes: { accountId: req.session.accountId }, 
                        } 
                }
            )
            await userProfileSchema.updateOne(
                { accountId: likedProfile.accountId },
                {
                    $pull: {
                        notifications: { $and: [{fromAccountId: req.session.accountId}, {type: 'like'}] } 
                    }
                }
            )
            let newContent = await userContentSchema.findOne({contentId: req.body.contentId})
            return res.send({likes:`${newContent.likes.length}`});
        } else {
            await userContentSchema.updateOne({ contentId: req.body.contentId },
                { $push: { likes: like }}
            )
            await userProfileSchema.updateOne({ accountId: likedProfile.accountId },
                {
                    $push: { notifications: notification },
            })
              let newContent = await userContentSchema.findOne({contentId: req.body.contentId})
              return res.send({likes:`${newContent.likes.length}`});
        }
    })

    app.post('/artworkComment', async function(req,res) {
        if(!req.session.loggedIn){
            return res.send({likes:`Not Logged In`});
        }
        let comment = {
          accountId: req.session.accountId,
          timestamp: Date.now(),
          comment: req.body.comment
        }

        await userContentSchema.updateOne({ contentId: req.body.contentId },
            { $push: { comments: comment }}
        )
        let accounts = []
        let newContentDocument = await userContentSchema.findOne({ contentId: req.body.contentId })
        await Promise.all(newContentDocument.comments.map(async comment => {
            
            let result = await userProfileSchema.findOne({ accountId: comment.accountId })
            toPush = {}
            if(result) {
                username = result.username
                accountId = result.accountId
                avatarUrl = result.avatarUrl
                toPush = {
                    username: username,
                    accountId: accountId,
                    avatarUrl: avatarUrl
                }
                accounts.push(toPush)
            }
            
        })
        )
          

        return res.send({comments: newContentDocument.comments, count: newContentDocument.comments.length, accounts: accounts});
    })

    app.post('/gameLike', async function(req,res) {
        if(!req.session.loggedIn){
            return res.send({likes:`Not Logged In`});
        }
        let like = {
          accountId: req.session.accountId,
          timestamp: Date.now()
        }

        let likedContent = await userGameSchema.findOne({gameId: req.body.contentId})

        let likedProfile = await userProfileSchema.findOne({accountId: likedContent.accountId})

        let notification = {
            notificationId: `${Number(likedProfile.notifications.length) + 1}`,
            timestamp: Date.now(),
            type: 'gameLike',
            contentId: req.body.contentId,
            fromAccountId: req.session.accountId
        }

        let alreadyLiked = await userGameSchema.aggregate([
          {
            "$match": {"gameId": req.body.contentId}
          },
          {
            "$unwind": '$likes'
          },
          {
            "$match": {"likes.accountId": req.session.accountId}
          },
        ])

      
        if(alreadyLiked.length >= 1){

            let contentLike = alreadyLiked[0]
            await userGameSchema.updateOne(
                { gameId: contentLike.gameId },
                {
                    $pull: { 
                        likes: { accountId: req.session.accountId }, 
                        } 
                }
            )
            await userProfileSchema.updateOne(
                { accountId: likedProfile.accountId },
                {
                    $pull: {
                        notifications: { $and: [{fromAccountId: req.session.accountId}, {type: 'gameLike'}] } 
                    }
                }
            )
            let newContent = await userGameSchema.findOne({gameId: req.body.contentId})
            return res.send({likes:`${newContent.likes.length}`});
        } else {
            await userGameSchema.updateOne({ gameId: req.body.contentId },
                { $push: { likes: like }}
            )
            await userProfileSchema.updateOne({ accountId: likedProfile.accountId },
                {
                    $push: { notifications: notification },
                })
              let newContent = await userGameSchema.findOne({gameId: req.body.contentId})
              return res.send({likes:`${newContent.likes.length}`});
        }
    })

    app.post('/gameComment', async function(req,res) {
        if(!req.session.loggedIn){
            return res.send({likes:`Not Logged In`});
        }

        let comment = {
          accountId: req.session.accountId,
          timestamp: Date.now(),
          comment: req.body.comment
        }

        await userGameSchema.updateOne({ gameId: req.body.contentId },
            { $push: { comments: comment }}
        )
        let accounts = []
        let newContentDocument = await userGameSchema.findOne({ gameId: req.body.contentId })
        await Promise.all(newContentDocument.comments.map(async comment => {
            let commentAccount = await userProfileSchema.findOne({ accountId: comment.accountId })
            toPush = {}
            if(commentAccount) {
                username = commentAccount.username
                accountId = commentAccount.accountId
                avatarUrl = commentAccount.avatarUrl
                toPush = {
                    username: username,
                    accountId: accountId,
                    avatarUrl: avatarUrl
                }
                accounts.push(toPush)
            }
            
        })
        )
          

        return res.send({comments: newContentDocument.comments, count: newContentDocument.comments.length, accounts: accounts});
    })

    app.post('/userFollow', async function(req,res) {
        if(!req.session.loggedIn){
            return res.send({followCount:`Not Logged In`});
        }
        let follow = {
          accountId: req.session.accountId,
          timestamp: Date.now()
        }

        let followedProfile = await userProfileSchema.findOne({accountId: req.body.accountId})

        let notification = {
            notificationId: `${Number(followedProfile.notifications.length) + 1}`,
            timestamp: Date.now(),
            type: 'follow',
            fromAccountId: req.session.accountId
        }

        let alreadyFollowed = await userProfileSchema.aggregate([
            {
                "$match": { "accountId": req.body.accountId }
            },
            {
                "$unwind": '$followedBy'
            },
            {
                "$match": { "followedBy.accountId": req.session.accountId }
            },
        ])

        if(followedProfile.accountId == req.session.accountId) {
            alreadyFollowed = [{a:''},{a:''}]
        }

        if(alreadyFollowed.length > 0){
            await userProfileSchema.updateOne(
                { accountId: req.body.accountId },
                {
                    $pull: { 
                        followedBy: { accountId: req.session.accountId }, 
                        notifications: { $and: [{fromAccountId: req.session.accountId}, {type: 'follow'}] } 
                      } 
                },
            )
            let profileRefresh = await userProfileSchema.findOne({accountId: req.body.accountId})
            return res.send({followCount:`${profileRefresh.followedBy.length}`, accountId: profileRefresh.accountId});
        } else {
            await userProfileSchema.updateOne({ accountId: req.body.accountId },
                {
                    $push: { followedBy: follow, notifications: notification },
                })
            let profileRefresh = await userProfileSchema.findOne({accountId: req.body.accountId})
            return res.send({followCount:`${profileRefresh.followedBy.length}`, followed:`followed`, accountId: profileRefresh.accountId});
        }
    })

    app.post('/artUploadComplete', async function (req,res) {

        let userProfile = await userProfileSchema.findOne({accountId: req.session.accountId})

        let recentContent = await userContentSchema.aggregate(
            {accountId: req.session.accountId}
        ).sort({timestamp:-1})

        userProfile.followedBy.forEach(async follower => {
            let followerAccount = await userProfileSchema.findOne({accountId: follower.accountId })

            let notification = {
                notificationId: `${Number(followerAccount.notifications.length) + 1}`,
                timestamp: Date.now(),
                type: 'followArtwork',
                contentId: recentContent.contentId,
                fromAccountId: req.session.accountId
            }

            await userProfileSchema.updateOne({ accountId: follower.accountId },
                {
                    $push: { notifications: notification },
            })
        })



        res.send({username: `${req.session.username}`})
    })

    app.post('/gameCreate/',  upload.single('file'), async function(req,res){

        console.log(req.body)

        const endDestination = `./ugc/game/${req.body.gameName}/`

        const chunkNumber = req.body.chunk;
        const totalChunks = req.body.chunks;
        const fileName = req.body.name;
        
        await fs.promises.mkdir(endDestination, { recursive: true })
    
        // Move the uploaded chunk to a new location
        const chunkPath = path.join(endDestination, fileName + '-' + chunkNumber);
        fs.renameSync(req.file.path, chunkPath);
    
        // Check if all chunks have been uploaded
        let allChunksUploaded = true;
        for (let i = 0; i < totalChunks; i++) {
            if (!fs.existsSync(path.join(endDestination, fileName + '-' + i))) {
                allChunksUploaded = false;
                break;
            }
        }
    
        if (allChunksUploaded) {
            // Combine all the chunks
            const finalFilePath = path.join(endDestination, fileName);
            const writeStream = fs.createWriteStream(finalFilePath);
            for (let i = 0; i < totalChunks; i++) {
                const chunkData = fs.readFileSync(path.join(endDestination, fileName + '-' + i));
                writeStream.write(chunkData);
                fs.unlinkSync(path.join(endDestination, fileName + '-' + i));
            }
            writeStream.end();

            let versionNumber = req.body.version.replace(/[^\d.-]/g, '');

            let gameIdCheck = await userGameSchema.findOne({ gameId: req.body.gameName })
    
            if(gameIdCheck) {
                res.render('sysmessage', {
                    session: req.session,
                    message: `A Game with the name: "${req.body.gameName}" already exists.`, messageType: 'error',
                    buttonText: 'Back to Game Upload', buttonLink: 'history.back()'
                })
                return
            }

            let index = fileName.lastIndexOf(".");
            let after = fileName.slice(index+1);

            let finalFileName = `${endDestination}${req.body.gameName}-thumbnail.${after}`

            function renameFileWithRetry(oldPath, newPath, maxRetries = 50, retryDelay = 100) {
                let retries = 0;
            
                function attemptRename() {
                if (fs.existsSync(oldPath)) {
                    fs.rename(oldPath, newPath, (error) => {
                    if (error) {
                        console.error('Error renaming file:', error);
                    } else {
                        console.log('File renamed successfully!');
                    }
                    });
                } else {
                    retries++;
            
                    if (retries <= maxRetries) {
                    console.log('File does not exist yet. Retrying in', retryDelay / 1000, 'seconds...');
                    setTimeout(attemptRename, retryDelay);
                    } else {
                    console.error('Maximum number of retries reached. File renaming failed.');
                    }
                }
                }
            
                attemptRename();
            }

            await renameFileWithRetry(`${finalFilePath}`, finalFileName)

            let usernameTag = `${req.session.username}(author)`

            let contentTags = req.body.gameTags.split(',')
            contentTags.unshift(usernameTag)
            contentTags = await contentTags.map(element => {
                let elementTrimmed = element.trim();
                return elementTrimmed.toLowerCase()
            })
        
            await userGameSchema.create(
                {
                    gameId: `${req.body.gameName}`,
                    accountId: `${req.session.accountId}`,
                    version: versionNumber,
                    timestamp: Date.now(),
                    tags: contentTags,
                    thumbnailUrl: `https://www.neversfw.gg/ugc/game/${req.body.gameName}/${req.body.gameName}-thumbnail.${after}`,
                }
            )
        }
        res.send()
    })

    app.get('/about', async function(req,res){
        res.render('about', {session: req.session})
    })

    app.get('/termsofservice', async function(req,res){
        res.render('termsofservice', {session: req.session})
    })

    app.get('/register', async function(req,res) {
        res.render('register', {session: req.session})
    })

    app.get('/login', async function(req,res) {
        res.render('login', {session: req.session})
    })

    app.get('/logout', async function(req, res){
        console.log(req.session)
        req.session.loggedIn = false;
        req.session.username = undefined;
        req.session.accountId = undefined;
        console.log(req.session)
        res.redirect('/')
    });

    app.get('/user-edit', async function(req, res){
        let foundUserAccount = await userProfileSchema.findOne({accountId: req.session.accountId })
        if(!foundUserAccount) {

        }
        res.render('user-edit', { user: foundUserAccount, session: req.session })
    });

    app.get('/user/:username', async function(req, res){
        let foundUserAccount = await userProfileSchema.findOne({username: req.params.username })
        if(!foundUserAccount) {
            urlEnd = req.path.split('/')
            res.render('sysmessage', {session: req.session, message: `There is no account with the Username: ${urlEnd[2]}`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        let foundUserContent = await userContentSchema.find({ accountId: foundUserAccount.accountId }).sort({timestamp:-1})

        let artAggregate = await userContentSchema.aggregate([
            { $match: { accountId: foundUserAccount.accountId }},
            { $sort: { timestamp: -1 }},
            { $limit: 5}
        ])
        let gameAggregate = await userGameSchema.aggregate([
            { $match: { accountId: foundUserAccount.accountId }},
            { $limit: 3 },
            { $sort: { timestamp: -1 }}
        ])
        let accounts = []

        await Promise.all(
            artAggregate.map(async artwork => {
                let result = await userProfileSchema.findOne({ accountId: artwork.accountId })
                let toPush = {}
                if(result) {
                    username = result.username
                    accountId = result.accountId
                    avatarUrl = result.avatarUrl
                    toPush = {
                        username: username,
                        accountId: accountId,
                        avatarUrl: avatarUrl
                    }
                }
                accounts.push(toPush)
                if(artwork.comments.length >= 1) {
                    await Promise.all(
                        artwork.comments.map(async comment => {
                            result = await userProfileSchema.findOne({ accountId: comment.accountId })
                            toPush = {}
                            if(result) {
                                username = result.username
                                accountId = result.accountId
                                avatarUrl = result.avatarUrl
                                toPush = {
                                    username: username,
                                    accountId: accountId,
                                    avatarUrl: avatarUrl
                                }
                                accounts.push(toPush)
                            }
                            
                        })
                    )
                }
            })
        )

        await Promise.all(
            gameAggregate.map(async game => {
                let result = await userProfileSchema.findOne({ accountId: game.accountId })
                let toPush = {}
                if(result) {
                    username = result.username
                    accountId = result.accountId
                    avatarUrl = result.avatarUrl
                    toPush = {
                        username: username,
                        accountId: accountId,
                        avatarUrl: avatarUrl
                    }
                }
                accounts.push(toPush)
                if(game.comments.length >= 1) {
                    await Promise.all(
                        game.comments.map(async comment => {
                            let commentAccount = await userProfileSchema.findOne({ accountId: comment.accountId })
                            toPush = {}
                            if(commentAccount) {
                                username = result.username
                                accountId = result.accountId
                                avatarUrl = result.avatarUrl
                                toPush = {
                                    username: username,
                                    accountId: accountId,
                                    avatarUrl: avatarUrl
                                }
                                accounts.push(toPush)
                            }
                            
                        })
                    )
                }
            })
        )

        let alreadyFollowed = await userProfileSchema.aggregate([
            {
              "$match": { "accountId": foundUserAccount.accountId }
            },
            {
              "$unwind": '$followedBy'
            },
            {
              "$match": { "followedBy.accountId": req.session.accountId }
            },
        ])

        let followButtonText = ""

        if(alreadyFollowed.length > 0) {
            followButtonText = 'Following'
        } else {
            followButtonText = 'Follow'
        }
        
        res.render("beta/user", {session: req.session, user: foundUserAccount, followButtonText, gameAggregate, artAggregate, accounts } )
        return 
    })

    app.get('/beta/user/:username', async function(req, res){
        let foundUserAccount = await userProfileSchema.findOne({username: req.params.username })
        if(!foundUserAccount) {
            urlEnd = req.path.split('/')
            res.render('sysmessage', {session: req.session, message: `There is no account with the Username: ${urlEnd[2]}`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        let foundUserContent = await userContentSchema.find({ accountId: foundUserAccount.accountId }).sort({timestamp:-1})

        let artAggregate = await userContentSchema.aggregate([
            { $match: { accountId: foundUserAccount.accountId }},
            { $sort: { timestamp: -1 }},
            { $limit: 5}
        ])
        let gameAggregate = await userGameSchema.aggregate([
            { $match: { accountId: foundUserAccount.accountId }},
            { $limit: 3 },
            { $sort: { timestamp: -1 }}
        ])
        let accounts = []

        await Promise.all(
            artAggregate.map(async artwork => {
                let result = await userProfileSchema.findOne({ accountId: artwork.accountId })
                let toPush = {}
                if(result) {
                    username = result.username
                    accountId = result.accountId
                    avatarUrl = result.avatarUrl
                    toPush = {
                        username: username,
                        accountId: accountId,
                        avatarUrl: avatarUrl
                    }
                }
                accounts.push(toPush)
                if(artwork.comments.length >= 1) {
                    await Promise.all(
                        artwork.comments.map(async comment => {
                            result = await userProfileSchema.findOne({ accountId: comment.accountId })
                            toPush = {}
                            if(result) {
                                username = result.username
                                accountId = result.accountId
                                avatarUrl = result.avatarUrl
                                toPush = {
                                    username: username,
                                    accountId: accountId,
                                    avatarUrl: avatarUrl
                                }
                                accounts.push(toPush)
                            }
                            
                        })
                    )
                }
            })
        )

        await Promise.all(
            gameAggregate.map(async game => {
                let result = await userProfileSchema.findOne({ accountId: game.accountId })
                let toPush = {}
                if(result) {
                    username = result.username
                    accountId = result.accountId
                    avatarUrl = result.avatarUrl
                    toPush = {
                        username: username,
                        accountId: accountId,
                        avatarUrl: avatarUrl
                    }
                }
                accounts.push(toPush)
                if(game.comments.length >= 1) {
                    await Promise.all(
                        game.comments.map(async comment => {
                            let commentAccount = await userProfileSchema.findOne({ accountId: comment.accountId })
                            toPush = {}
                            if(commentAccount) {
                                username = result.username
                                accountId = result.accountId
                                avatarUrl = result.avatarUrl
                                toPush = {
                                    username: username,
                                    accountId: accountId,
                                    avatarUrl: avatarUrl
                                }
                                accounts.push(toPush)
                            }
                            
                        })
                    )
                }
            })
        )

        let alreadyFollowed = await userProfileSchema.aggregate([
            {
              "$match": { "accountId": foundUserAccount.accountId }
            },
            {
              "$unwind": '$followedBy'
            },
            {
              "$match": { "followedBy.accountId": req.session.accountId }
            },
        ])

        let followButtonText = ""

        if(alreadyFollowed.length > 0) {
            followButtonText = 'Following'
        } else {
            followButtonText = 'Follow'
        }
        
        res.render("beta/user", {session: req.session, user: foundUserAccount, followButtonText, gameAggregate, artAggregate, accounts } )
        return 
    })

    app.get('/game/:gameId', async function(req, res) { 
        let foundGame = await userGameSchema.findOne({gameId: req.params.gameId })
        if(!foundGame) {
            urlEnd = req.path.split('/')
            res.render('sysmessage', {session: req.session, message: `There is no game with the gameId/name: ${urlEnd[2]}`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        let foundUserAccount = await userProfileSchema.findOne({accountId: foundGame.accountId })
        if(!foundUserAccount) {
            urlEnd = req.path.split('/')
            res.render('sysmessage', {session: req.session, message: `Game owner account doesn't exist (accountId: ${foundGame.accountId})`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }

        let accounts = []
        
        if(foundGame.comments.length >= 1) {
            await Promise.all(
                foundGame.comments.map(async comment => {
                    let result = await userProfileSchema.findOne({ accountId: comment.accountId })
                    let toPush = {}
                    if(result) {
                        username = result.username
                        accountId = result.accountId
                        avatarUrl = result.avatarUrl
                        toPush = {
                            username: username,
                            accountId: accountId,
                            avatarUrl: avatarUrl
                        }
                    }
                    accounts.push(toPush)
                })
            )
        }
        
        res.render("beta/game", {
            session: req.session,
            game: foundGame,
            accounts,
            account: foundUserAccount } )
        return 
    })

    //BETA
    app.get('/beta/game/:gameId', async function(req, res) { 
        let foundGame = await userGameSchema.findOne({gameId: req.params.gameId })
        if(!foundGame) {
            urlEnd = req.path.split('/')
            res.render('sysmessage', {session: req.session, message: `There is no game with the gameId/name: ${urlEnd[2]}`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        let foundUserAccount = await userProfileSchema.findOne({accountId: foundGame.accountId })
        if(!foundUserAccount) {
            urlEnd = req.path.split('/')
            res.render('sysmessage', {session: req.session, message: `Game owner account doesn't exist (accountId: ${foundGame.accountId})`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }

        let accounts = []
        
        if(foundGame.comments.length >= 1) {
            await Promise.all(
                foundGame.comments.map(async comment => {
                    let result = await userProfileSchema.findOne({ accountId: comment.accountId })
                    let toPush = {}
                    if(result) {
                        username = result.username
                        accountId = result.accountId
                        avatarUrl = result.avatarUrl
                        toPush = {
                            username: username,
                            accountId: accountId,
                            avatarUrl: avatarUrl
                        }
                    }
                    accounts.push(toPush)
                })
            )
        }
        
        res.render("beta/game", {
            session: req.session,
            game: foundGame,
            accounts,
            account: foundUserAccount } )
        return 
    })

    app.get('/game/:gameId/edit', async function(req, res) { 
        let foundGame = await userGameSchema.findOne({gameId: req.params.gameId })
        if(!foundGame) {
            urlEnd = req.path.split('/')
            res.render('sysmessage', {session: req.session, message: `There is no game with the gameId/name: ${urlEnd[2]}`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        if(foundGame.accountId !== req.session.accountId) {
            res.render('sysmessage', {session: req.session, message: `You are not authorised to edit this game`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        let foundUserAccount = await userProfileSchema.findOne({accountId: foundGame.accountId })
        if(!foundUserAccount) {
            res.render('sysmessage', {session: req.session, message: `Game owner account doesn't exist (accountId: ${foundGame.accountId})`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        
        res.render("game-edit", {
            session: req.session,
            game: foundGame,
            account: foundUserAccount } )
        return 
    })

    app.get('/game/:gameId/update', async function(req, res) { 
        let foundGame = await userGameSchema.findOne({gameId: req.params.gameId })
        if(!foundGame) {
            urlEnd = req.path.split('/')
            res.render('sysmessage', {session: req.session, message: `There is no game with the gameId/name: ${req.params.gameId}`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        if(foundGame.accountId !== req.session.accountId) {
            res.render('sysmessage', {session: req.session, message: `You are not authorised to edit this game`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        let foundUserAccount = await userProfileSchema.findOne({accountId: foundGame.accountId })
        if(!foundUserAccount) {
            res.render('sysmessage', {session: req.session, message: `Game owner account doesn't exist (accountId: ${foundGame.accountId})`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        
        res.render("gameUpdateSelector", {
            session: req.session,
            game: foundGame,
            account: foundUserAccount } )
        return 
    })

    app.get('/game/:gameId/update/:platform', async function(req, res) {
        let foundGame = await userGameSchema.findOne({gameId: req.params.gameId })
        if(!foundGame) {
            urlEnd = req.path.split('/')
            res.render('sysmessage', {session: req.session, message: `There is no game with the gameId/name: ${req.params.gameId}`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        if(foundGame.accountId !== req.session.accountId) {
            res.render('sysmessage', {session: req.session, message: `You are not authorised to edit this game`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        let foundUserAccount = await userProfileSchema.findOne({accountId: foundGame.accountId })
        if(!foundUserAccount) {
            res.render('sysmessage', {session: req.session, message: `Game owner account doesn't exist (accountId: ${foundGame.accountId})`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }

        let platform = req.params.platform

        switch(platform) {
            case'windows': 
            break;
            case'macos': 
            break;
            case'linux': 
            break;
            case'android': 
            break;
            case'ios': 
            break;
            default: 
            {
                res.render('sysmessage', {session: req.session, message: `That platform "${platform}" currently isnt supported, please contact the site admin if this is an error.`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
                return
            }
        }
        
        res.render("gameUpdateUploader", {
            session: req.session,
            game: foundGame,
            platform,
            account: foundUserAccount } )
        return 
    })

    app.get('/verifyEmail', async function(req, res) {
        let veriEmail = req.query.email
        let userAccountWanted = await userProfileSchema.findOne({ email: veriEmail })

        if(userAccountWanted == null) {
            res.render('sysmessage', {
                session: req.session,
                message: 'An email with that account doesnt exist!',
                messageType: 'success', buttonText: 'Go to Home', buttonLink:'location.href="https://www.neversfw.gg/"' })
            return true
        }

        if(userAccountWanted.tempEmailHash == req.query.hash){
            await userProfileSchema.findOneAndUpdate({ email: veriEmail }, { isVerified: true })
            res.render('sysmessage', {
                session: req.session,
                message: 'Email Verified! Click below to go to the login page!',
                messageType: 'success', buttonText: 'Go to Login', buttonLink:'location.href="https://www.neversfw.gg/login"' })
        return true
        }
    })

    app.post('/game/:gameId/updateVersion', async function(req, res) {

        let foundGame = await userGameSchema.findOne({gameId: req.params.gameId })
        if(!foundGame) {
            res.render('sysmessage', {session: req.session, message: `There is no game with the gameId/name: ${req.params.gameId}`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        if(foundGame.accountId !== req.session.accountId) {
            res.render('sysmessage', {session: req.session, message: `You are not authorised to edit this game`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }
        let foundUserAccount = await userProfileSchema.findOne({accountId: foundGame.accountId })
        if(!foundUserAccount) {
            res.render('sysmessage', {session: req.session, message: `Game owner account doesn't exist (accountId: ${foundGame.accountId})`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }

        await userGameSchema.findOneAndUpdate(
            { gameId: foundGame.gameId },
            { version: req.body.version }
        )

        return res.send({newVersion: `${req.body.version}`})
    })

    app.post('/gameSave', async function(req,res){

        let potentialGame = await userGameSchema.findOne({ gameId: req.body.gameId })

        if(potentialGame.accountId !== req.session.accountId){
            res.render('sysmessage', {
                session: req.session,
                message: 'You are not authorized to edit this game',
                messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return true
        }

        await userGameSchema.findOneAndUpdate(
            {
                gameId: req.body.gameId
            }, {
                description: req.body.html
            }, {
                upsert: false
            }
        )

        res.send({saved: 'Saved'})
    })

    app.post('/upload', upload.single('file'), async function(req, res) {

        console.log(req.body)

        if(req.body.artName == undefined) {
            res.render('sysmessage', {session: req.session, message: `You need to provide a name for your artwork.`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }

        if(req.body.tags == undefined) {
            res.render('sysmessage', {session: req.session, message: `You need to provide tags for your artwork.`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }

        if(req.body.artName.length < 1) {
            res.render('sysmessage', {session: req.session, message: `You need to provide a name for your artwork.`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }

        if(req.body.tags.length < 1) {
            res.render('sysmessage', {session: req.session, message: `You need to provide tags for your artwork.`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
            return
        }

        if(req.body.description.length > 1) {
            if(req.body.description.length > 250) {
                res.render('sysmessage', {session: req.session,
                    message: `Description too long!.`, messageType: 'error',
                    buttonText: 'Go Back', buttonLink: 'history.back()' })
                return
            }
        }

        const endDestination = `./ugc/art/${req.session.accountId}/`

        await fs.promises.mkdir(endDestination, { recursive: true })

        const chunkNumber = req.body.chunk;
        const totalChunks = req.body.chunks;
        const fileName = req.body.name;
        
    
        // Move the uploaded chunk to a new location
        const chunkPath = path.join(endDestination, fileName + '-' + chunkNumber);
        fs.renameSync(req.file.path, chunkPath);
    
        // Check if all chunks have been uploaded
        let allChunksUploaded = true;
        for (let i = 0; i < totalChunks; i++) {
            if (!fs.existsSync(path.join(endDestination, fileName + '-' + i))) {
                allChunksUploaded = false;
                break;
            }
        }
    
        if (allChunksUploaded) {
            // Combine all the chunks
            const finalFilePath = path.join(endDestination, fileName)
            const writeStream = fs.createWriteStream(finalFilePath)
            for (let i = 0; i < totalChunks; i++) {
                const chunkData = fs.readFileSync(path.join(endDestination, fileName + '-' + i))
                writeStream.write(chunkData)
                fs.unlinkSync(path.join(endDestination, fileName + '-' + i))
            }
            writeStream.end()

            let index = fileName.lastIndexOf(".")
            let after = fileName.slice(index+1)

            let artName = req.body.artName
            let tags = req.body.tags

            let artNameNumbers = ''
            let tagsNumbers = ''

            for(let numberOfCharsProcessed = 0; numberOfCharsProcessed < artName.length; ) {
                artNameNumbers = artNameNumbers + (artName.toLowerCase().charCodeAt(numberOfCharsProcessed) - 97 + 1)
                numberOfCharsProcessed++
            }

            for(let numberOfCharsProcessed = 0; numberOfCharsProcessed < tags.length; ) {
                tagsNumbers = tagsNumbers + (tags.toLowerCase().charCodeAt(numberOfCharsProcessed) - 97 + 1)
                numberOfCharsProcessed++
            }

            let timestampRaw = Date.now()
            timestampString = timestampRaw.toString()
            timestamp = timestampString.substring(0, 5)

            let nextContentId = `${req.session.accountId}-${timestamp}-${artNameNumbers}-${tagsNumbers}`
            
            nextContentId = nextContentId.substring(0, 35)

            let contentIdSearch = await userContentSchema.findOne({ contentId: nextContentId })

            let fileNameNumber = 0;
            let finalFileName = `${endDestination}${nextContentId}-${fileNameNumber}.${after}`
            while (fs.existsSync(finalFileName)) {
                fileNameNumber++
                finalFileName = `${endDestination}${nextContentId}-${fileNameNumber}.${after}`
            }

            function renameFileWithRetry(oldPath, newPath, maxRetries = 50, retryDelay = 100) {
                let retries = 0;
            
                function attemptRename() {
                if (fs.existsSync(oldPath)) {
                    fs.rename(oldPath, newPath, (error) => {
                    if (error) {
                        console.error('Error renaming file:', error);
                    } else {
                        console.log('File renamed successfully!');
                    }
                    });
                } else {
                    retries++;
            
                    if (retries <= maxRetries) {
                    console.log('File does not exist yet. Retrying in', retryDelay / 1000, 'seconds...');
                    setTimeout(attemptRename, retryDelay);
                    } else {
                    console.error('Maximum number of retries reached. File renaming failed.');
                    }
                }
                }
            
                attemptRename();
            }

            await renameFileWithRetry(`${finalFilePath}`, finalFileName)


            if(contentIdSearch){
                await userContentSchema.findOneAndUpdate(
                    { contentId: contentIdSearch.contentId },
                    {
                        $push: { contentUrl: `/ugc/art/${req.session.accountId}/${nextContentId}-${fileNameNumber}.${after}` }
                    }
                )
            } else {

                let usernameTag = `${req.session.username}(author)`

                let contentTags = req.body.tags.split(',')
                contentTags.unshift(usernameTag)
                contentTags = await contentTags.map(element => {
                    let elementTrimmed = element.trim();
                    return elementTrimmed.toLowerCase()
                })

                if(req.body.description.length > 1) {
                    await userContentSchema.create({
                        contentId: nextContentId,
                        accountId: req.session.accountId,
                        contentUrl: [`/ugc/art/${req.session.accountId}/${nextContentId}-${fileNameNumber}.${after}`],
                        name: artName,
                        timestamp: Date.now(),
                        description: req.body.description,
                        tags: contentTags
                    })
                } else {
                    await userContentSchema.create({
                        contentId: nextContentId,
                        accountId: req.session.accountId,
                        contentUrl: [`/ugc/art/${req.session.accountId}/${nextContentId}-${fileNameNumber}.${after}`],
                        name: artName,
                        timestamp: Date.now(),
                        tags: contentTags
                    })
                }

                

            }


        }
        res.send()
    })

    app.get('/uploadArt', async function(req, res){
        if(req.session.loggedIn) {
            res.render("beta/upload-art", {session: req.session} )
        } else {
            res.render('sysmessage', {session: req.session, message: 'You need to be logged in to upload Art!', messageType: 'error', buttonText: 'Go to Login', buttonLink:'location.href="/login"' })
            return true
        }
    })

    app.get('/uploadGame', async function(req, res){
        if(req.session.loggedIn) {
            res.render("beta/upload-game", {session: req.session} )
        } else {
            res.render('sysmessage', {session: req.session, message: 'You need to be logged in to upload Games!', messageType: 'error', buttonText: 'Go to Login', buttonLink:'location.href="/login"' })
            return true
        }
    })

    // app.get('/test', async function(req,res) {
    //     res.render('sysmessage', {session: req.session, message: 'Account Created! An email has been sent to you! (Make sure to check your spam folder!)', messageType: 'success', buttonText: 'Go to Login', buttonLink:'location.href="/login"' })
    //     return true
    // })

    app.post('/register/', async function(req, res){
        //is the email,username,password valid?
        error = await validateEmail(req, res)
        if(error == true) {return}
        error = await validateUsername(req, res)
        if(error == true) {return}
        error = await validatePassword(req, res)
        if(error == true) {return}

        //hashing
        let hashedPassword = await encryptPassword(req.body.password)
        let tempEmailHash = Math.floor(Math.random() * 1000).toString()
        tempEmailHash = tempEmailHash.toString() + Math.floor(Math.random() * 1000).toString()
        tempEmailHash = tempEmailHash.toString() + Math.floor(Math.random() * 1000).toString()
        tempEmailHash = tempEmailHash.toString() + Math.floor(Math.random() * 1000).toString()
        tempEmailHash = tempEmailHash.toString() + Math.floor(Math.random() * 1000).toString()
        tempEmailHash = tempEmailHash.toString() + Math.floor(Math.random() * 1000).toString()
        tempEmailHash = tempEmailHash.toString() + Math.floor(Math.random() * 1000).toString()
        tempEmailHash = tempEmailHash.toString() + Math.floor(Math.random() * 1000).toString()
      
        //mongoose creating account
        let recentAccount = await userProfileSchema.aggregate([
          {
            $addFields: {
              numericAccountId: { $toInt: "$accountId" }
            }
          },
          {
            $sort: {
              numericAccountId: -1
            }
          },
          {
            $limit: 1
          }
        ])

        let nextAccountId = 0
        if(recentAccount[0] != undefined){
          nextAccountId = `${Number(recentAccount[0].accountId) + 1}`
        } else {
          nextAccountId = 0
        }

        accountTimestamp = Date.now()
      
        //create the account
        await userProfileSchema.create({
          accountId: nextAccountId,
          username: req.body.username,
          email: req.body.email,
          password: hashedPassword,
          tempEmailHash: tempEmailHash,
          timestamp: accountTimestamp
        })

        console.log(`Click on the link below to verify your email:\nhttps://neversfw.gg/verifyEmail?email=${req.body.email}&hash=${tempEmailHash}\n(If you did not make this account you can safely ignore this email)`)
        console.log(`${req.body.email}`)

        let info = await transporter.sendMail({
            from: '"NeverSFW" <neversfw.gg@gmail.com>', // sender address
            to: `${req.body.email}`, // list of receivers
            subject: "Email Verification", // Subject line
            text: `Click on the link below to verify your email:\nhttps://neversfw.gg/verifyEmail?email=${req.body.email}&hash=${tempEmailHash}\n(If you did not make this account you can safely ignore this email)`, // plain text body
        });

        console.log(info)
      
        // res.render('sysmessage', {session: req.session, message: 'Account creation is temporarily disabled.', messageType: 'error' })
    
        res.render('sysmessage', {session: req.session, message: 'Account Created! An email has been sent to you! (Make sure to check your spam folder!)', messageType: 'success', buttonText: 'Go to Login', buttonLink:'location.href="/login"' })
        return true
    })

    app.post('/login/', async function(req, res){

        let username = req.body.username
        let password = req.body.password
      
        let usernameAccountCount = await userProfileSchema.countDocuments({ username: username })
      
        if(!usernameAccountCount){
            res.render('sysmessage', {
                session: req.session,
                message: 'Invalid Username/Password', messageType: 'error',
                buttonText: 'Go back', buttonLink: 'history.back()' 
            })
          return
        }
      
        let userAccountWanted = await userProfileSchema.findOne({ username: username, })

        if(userAccountWanted.isVerified == false) {
            res.render('sysmessage', { session: req.session,
                message: 'Email not verified, please check your email.', messageType: 'error',
                buttonText: 'Go back', buttonLink: 'history.back()' 
            })
            return
        }
      
        const passwordCompare = await bcrypt.compare(password, userAccountWanted.password);
        if(!passwordCompare){
          res.render('sysmessage', { session: req.session,
            message: 'Invalid Username/Password', messageType: 'error',
            buttonText: 'Go back', buttonLink: 'history.back()' 
        })
          return
        }
      
        
      
        req.session.loggedIn = true;
        req.session.username = username;
        req.session.accountId = userAccountWanted.accountId;
        console.log(req.session)
        res.redirect(`/user/${username}`)
    })

    app.post('/gameUploadComplete', async function(req,res) {
        let recentContent = await userGameSchema.findOne(
            { accountId: req.session.accountId}
            ).sort({timestamp: -1})

        res.send({gameName: `${recentContent.gameId}`})
    })

    app.post('/gameFileUploadComplete', async function(req,res) {
        let recentContent = await userGameSchema.aggregate([
            { $match: { accountId: req.session.accountId}},
            { $sort: { timestamp: -1 } },
            { $limit: 1 }
        ])

        res.redirect(`https://www.neversfw.gg/game/${recentContent[0].gameId}/update`)
    })

    app.post('/game/:gameId/update/:platform', upload.single('file'), async function(req, res) {

        const endDestination = `./ugc/game/${req.params.gameId}/`

        await fs.promises.mkdir(endDestination, { recursive: true })

        const chunkNumber = req.body.chunk;
        const totalChunks = req.body.chunks;
        const fileName = req.body.name;
        
    
        // Move the uploaded chunk to a new location
        const chunkPath = path.join(endDestination, fileName + '-' + chunkNumber);
        fs.renameSync(req.file.path, chunkPath);
    
        // Check if all chunks have been uploaded
        let allChunksUploaded = true;
        for (let i = 0; i < totalChunks; i++) {
            if (!fs.existsSync(path.join(endDestination, fileName + '-' + i))) {
                allChunksUploaded = false;
                break;
            }
        }
    
        if (allChunksUploaded) {
            // Combine all the chunks
            const finalFilePath = path.join(endDestination, fileName);
            const writeStream = fs.createWriteStream(finalFilePath);
            for (let i = 0; i < totalChunks; i++) {
                const chunkData = fs.readFileSync(path.join(endDestination, fileName + '-' + i));
                writeStream.write(chunkData);
                fs.unlinkSync(path.join(endDestination, fileName + '-' + i));
            }
            writeStream.end();

            let foundGame = await userGameSchema.findOne({gameId: req.params.gameId })
            if(!foundGame) {
                urlEnd = req.path.split('/')
                res.render('sysmessage', {session: req.session, message: `There is no game with the gameId/name: ${urlEnd[2]}`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
                return
            }
            if(foundGame.accountId !== req.session.accountId) {
                res.render('sysmessage', {session: req.session, message: `You are not authorised to edit this game`, messageType: 'error', buttonText: 'Go Back', buttonLink: 'history.back()' })
                return
            }

            let index = fileName.lastIndexOf(".");
            let after = fileName.slice(index+1);

            await fs.rename(`${finalFilePath}`, `./ugc/game/${foundGame.gameId}/${foundGame.gameId}-v${foundGame.version}-${req.params.platform}.${after}`, (err) => {
                if(err){
                    console.log(err)
                }
            })

            let replacement = {
                platform: `${req.params.platform}`,
                downloadUrl: `./ugc/game/${foundGame.gameId}/${foundGame.gameId}-v${foundGame.version}-${req.params.platform}.${after}`
            }

            let alreadyExists = await userGameSchema.aggregate([
                {
                  "$match": {"gameId": foundGame.gameId}
                },
                {
                  "$unwind": '$gameFiles'
                },
                {
                  "$match": {"gameFiles.platform": req.params.platform}
                },
            ])

            
            if(alreadyExists.length>0){
                await userGameSchema.updateOne(
                    { gameId: foundGame.gameId },
                    { $pull: { gameFiles: { platform: req.params.platform } } },
                    { limit: 1 }
                )
                await userGameSchema.updateOne({ gameId: foundGame.gameId },
                    { $push: { gameFiles: replacement }})
            } else {
                await userGameSchema.updateOne({ gameId: foundGame.gameId },
                    { $push: { gameFiles: replacement }})
            }
        }
        res.send();
    });

    app.post('/user-edit/', async function(req, res){

        let editLoggedOut = false
    
        if(req.body.username){
        error = await validateUsername(req, res)
        if(error) {
            return
        }
    
        await userProfileSchema.findOneAndUpdate({ accountId: req.session.accountId },
            {
            username: req.body.username
            })
    
        async function updateContentUsername() {
            const query = { accountId: req.session.accountId };
            const update = { $set: { "tags.0": `${req.body.username}(author)` } };
            const options = { multi: true };
            
            result = await userContentSchema.updateMany(query, update, options);
        }
            
        await updateContentUsername().catch(console.error);
    
        //logging out
        editLoggedOut = true
        }
    
        if(req.body.password){
        
            //is the password valid?
            error = await validatePassword(req, res)
            if(error) {
                return
            }
        
        
        
            //hashing
            let hashedPassword = await encryptPassword(req.body.password)
        
            //updating userProfile
            await userProfileSchema.findOneAndUpdate({ accountId: req.session.accountId },
                {
                    password: hashedPassword
                })
            
            
            //logging out
            editLoggedOut = true
        }
    
        if(req.body.bio){
        error = await validateBio(req, res)
        if(error) {
            return
        }

        await userProfileSchema.findOneAndUpdate({ accountId: req.session.accountId },
            {
            bio: req.body.bio
            }
        )
        }


    
        if(editLoggedOut){
            //logging out
            req.session.loggedIn = false;
            req.session.username = undefined;
            req.session.accountId = undefined;
            res.redirect('/')
        }else{
            res.redirect(`/user/${req.session.username}`)
        }
    
    })

    app.post('/user-edit/avatar', upload.single('file'), async function(req, res) {

        const endDestination = `./ugc/avatar/`

        await fs.promises.mkdir(endDestination, { recursive: true })

        const chunkNumber = req.body.chunk;
        const totalChunks = req.body.chunks;
        const fileName = req.body.name;
        
    
        // Move the uploaded chunk to a new location
        const chunkPath = path.join(endDestination, fileName + '-' + chunkNumber);
        fs.renameSync(req.file.path, chunkPath);
    
        // Check if all chunks have been uploaded
        let allChunksUploaded = true;
        for (let i = 0; i < totalChunks; i++) {
            if (!fs.existsSync(path.join(endDestination, fileName + '-' + i))) {
                allChunksUploaded = false;
                break;
            }
        }
    
        if (allChunksUploaded) {
            // Combine all the chunks
            const finalFilePath = path.join(endDestination, fileName)
            const writeStream = fs.createWriteStream(finalFilePath)
            for (let i = 0; i < totalChunks; i++) {
                const chunkData = fs.readFileSync(path.join(endDestination, fileName + '-' + i))
                await writeStream.write(chunkData)
                await fs.unlinkSync(path.join(endDestination, fileName + '-' + i))
            }
            await writeStream.end()

            let index = fileName.lastIndexOf(".")
            let after = fileName.slice(index+1)

            function checkExistsWithTimeout(filePath, timeout) {
                return new Promise(function (resolve, reject) {
            
                    var timer = setTimeout(function () {
                        watcher.close();
                        reject(new Error('File did not exists and was not created during the timeout.'));
                    }, timeout);
            
                    fs.access(filePath, fs.constants.R_OK, function (err) {
                        if (!err) {
                            clearTimeout(timer);
                            watcher.close();
                            resolve();
                        }
                    });
            
                    var dir = path.dirname(filePath);
                    var basename = path.basename(filePath);
                    var watcher = fs.watch(dir, function (eventType, filename) {
                        if (eventType === 'rename' && filename === basename) {
                            clearTimeout(timer);
                            watcher.close();
                            resolve();
                        }
                    });
                });
            }

            let oldUserProfile = await userProfileSchema.findOne({accountId: req.session.accountId})

            if(oldUserProfile.avatarUrl !== "pic.png"){
                fs.rmSync(`${endDestination}${oldUserProfile.avatarUrl}`)
            }
            

            await checkExistsWithTimeout(finalFilePath, 2000)

            let finalFileName = `${endDestination}${req.session.accountId}.${after}`
            
            await fs.rename(`${finalFilePath}`, finalFileName, (err) => {
                if(err){
                    console.log(err)
                }
            })
            
            
            await userProfileSchema.findOneAndUpdate({ accountId: req.session.accountId },
                {
                    avatarUrl: `${req.session.accountId}.${after}`
                }
            )
        }
        res.send();
    })

    app.get('/user-edit/avatarComplete', async function(req,res) {
        res.redirect(`https://www.neversfw.gg/user/${req.session.username}`)
    })

    let cachedYAMLData = null
    const flaskServerURL = "https://neversfw.ngrok.dev/get-lora-yaml"

    // Function to sort an object by its keys
    function sortObjectByKey(obj) {
        return Object.keys(obj).sort().reduce((acc, key) => {
            acc[key] = obj[key];
            return acc;
        }, {});
    }

    // Function to fetch, sort, and cache YAML data
    function updateYAMLCache() {
        fetch(flaskServerURL)
            .then(response => response.json())
            .then(data => {
                // Sort the data
                Object.keys(data).forEach(category => {
                    data[category] = sortObjectByKey(data[category]);
                });

                cachedYAMLData = sortObjectByKey(data);
                // console.log('YAML data updated and sorted.');
            })
            .catch(err => console.error('Error fetching YAML data:', err));
    }

    
    updateYAMLCache()
    setInterval(updateYAMLCache, 5 * 1000);

    app.get('/ai', async function(req, res){
        try {

            await updateYAMLCache()

            if(req.session.loggedIn){
                reqIdString = `${req.session.accountId}`
                foundAccount = await userProfileSchema.findOne({accountId: reqIdString})
                
                if(!foundAccount.ai) {
                    foundAccount = {ai: {prompt: "", negativeprompt: "", model: "furry"}}
                }
            } else {
                foundAccount = {ai: {prompt: "", negativeprompt: "", model: "furry"}}
            }

            const selectedLoras = foundAccount.ai.loras || {style:[],concept:[],clothing:[],effect:[],character:[],pose:[]};

            console.log(selectedLoras)

            if (selectedLoras.style = []) {
                selectedLoras.style = []
            }
            if (selectedLoras.concept = []) {
                selectedLoras.concept = []
            }
            if (selectedLoras.clothing = []) {
                selectedLoras.clothing = []
            }
            if (selectedLoras.effect = []) {
                selectedLoras.effect = []
            }
            if (selectedLoras.character = []) {
                selectedLoras.character = []
            }
            if (selectedLoras.pose = []) {
                selectedLoras.pose = []
            }

            console.log(foundAccount.ai)

            res.render('ai', { 
                session: req.session,
                data: cachedYAMLData,
                promptValue: foundAccount.ai.prompt,
                negativePromptValue: foundAccount.ai.negativeprompt,
                modelValue: foundAccount.ai.model,
                selectedLoras: selectedLoras
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading tags data');
        }
    });

    app.post('/ai-generate', async function(req, res) {
        if(req.session.loggedIn){
            reqIdString = `${req.session.accountId}`
            await userProfileSchema.findOneAndUpdate(
                { accountId: reqIdString },
                { 
                    ai: {
                        prompt: req.body.prompt,
                        negativeprompt: req.body.negativeprompt,
                        model: req.body.model,
                        loras: req.body.savedloras 
                    }
                }
            )
        }
    })

}