require( 'console-stamp' )( console, { 
    format: ':date(HH:MM:ss)' 
} );

//express stuffs
const express = require('express')
var compression = require('express-compression')
const app = express()
const port = 80

app.use(compression())

const mongoose = require('mongoose')
const bodyParser = require('body-parser')

//cookies (client side login memory)
let cookieSession = require('cookie-session')


//https stuffs
const http = require('http');
const https = require('https');

//node filesystem
const fs = require('fs')

//cors stuffs
const cors = require('cors')
app.use(cors());

const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
	windowMs: (1 * 60 * 1000),
	max: 1000,
	standardHeaders: true,
	legacyHeaders: false,
})

const downloadLimiter = rateLimit({
  windowMs: (1 * 60 * 1000),
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})


app.use(limiter)
app.use('/download', downloadLimiter)

//discord webhooks
const { Webhook, MessageBuilder } = require('discord-webhook-node');

//connects to the mongodb database
mongoose.connect('mongodb://127.0.0.1:27017/neversfw-gg')
mongoose.set('strictQuery', false)


app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    domain: '.neversfw.gg'
}))

app.use(express.static(__dirname));


// //file upload limits
// app.use(
//     fileUpload({
//         limits: { fileSize: 999999 * 1024 * 1024},
//         abortOnLimit: true,
//         uploadTimeout: 0,
//     })
// );

app.use(bodyParser.json({limit: '99999999mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '99999999mb',}))

//redirect anything else to www.
function wwwRedirect(req, res, next) {
    if (!req.headers.host.slice(0, 4) === 'www.') {
        var newHost = `www.${req.headers.host}`
        return res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
    }
    next();
};

app.set('trust proxy', true);
app.use(wwwRedirect);

function requireHTTPS(req, res, next) {
    // The 'x-forwarded-proto' check is for Heroku
    if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV !== "development") {
      return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
}
  
app.use(requireHTTPS);


//request logger
var loggerCount = 0
let logger = function(req, res, next){
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  var method = req.method;
  var url = req.url;

  loggerCount++

  if(req.session.loggedIn){
    console.log(`${loggerCount} | ${method} | ${url} | ${ip} | ${req.session.username}`);
  } else {
    console.log(`${loggerCount} | ${method} | ${url} | ${ip} | `);
  }
  
  next();
}

app.use(logger)

app.set('view engine', 'ejs');

app.get('/progress', (req, res) => {
    res.json(req.uploadProgress);
});

require('./routes')(app,fs);


let privateKey = fs.readFileSync('./neversfw_gg.key')
let certificate = fs.readFileSync("./www_neversfw_gg.crt")
let ca = fs.readFileSync("./www_neversfw_gg.ca-bundle")

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(443, () => {
	console.log(`HTTPS Server running on port: 443`);
});

httpServer.listen(80, () => {
	console.log(`HTTP Server running on port: 80`);
});