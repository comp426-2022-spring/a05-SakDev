const args = require('minimist')(process.argv.slice(2))
var express = require('express')
var app = express()
const fs = require('fs')
const morgan = require('morgan')
const logdb = require('./src/services/database.js')


const help = (`
server.js [options]
--port, -p	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.
--debug, -d If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.
--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
--help, -h	Return this message and exit.
`)
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

// Server port
const port = args.port || args.p || process.env.PORT || 5000
if (args.log == 'false') {
    console.log("NOTICE: not creating file access.log")
} else {
    const logdir = './log/';

    if (!fs.existsSync(logdir)){
        fs.mkdirSync(logdir);
    }
    const accessLog = fs.createWriteStream( logdir+'access.log', { flags: 'a' })
    app.use(morgan('combined', { stream: accessLog }))
}app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referrer: req.headers['referer'],
        useragent: req.headers['user-agent']
    };
    const stmt = logdb.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referrer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referrer, logdata.useragent)
    //console.log(info)
    next();
})


function coinFlips(flips) {
    let array = [];
    for (let i = 1; i <= flips; i++) {
        array.push(coinFlip());
    }
    return array;
}
// Count coin flips
function countFlips(array) {
    var head_count=0;
    var tail_count=0;
  
    for (let i=0;i<array.length;i++){
      if (array[i]=='heads'){
        head_count++;
      }
      else{
        tail_count++;
      }
    }
   
    if (head_count > 0 && tail_count == 0) {
      return { "heads": head_count}
    } 
    else if (tail_count > 0 && head_count == 0) {
      return { "tails": tail_count}
    } 
    else {
      return { "heads": head_count, "tails": tail_count} 
    }
}

function coinFlip() {
    return (Math.floor(Math.random() * 2) == 0) ? 'heads' : 'tails';
}

function flipACoin(call) {
    var flip=coinFlip();
    var result='lose'
  
    if (flip==call){
      result='win'
    }
      
    return { 'call': call, 'flip': flip, 'result': result };  
}

app.use(express.static('./public'))
app.get("/app/", (req, res) => {
  res.statusCode = 200
  res.statusMessage = "ok"
  res.writeHead(res.statusCode, { "Content-Type": "text/plain" })
  res.end(res.statusCode + " " + res.statusMessage)
})

app.get("/app/flip/", (req, res) => {
  var flip = coinFlip()
  return res.status(200).json({ "flip": flip })
})

app.get("/app/flips/:number", (req, res) => {
  var numFlips = req.params.number
  var flipResults = coinFlips(numFlips)
  var summary = countFlips(flipResults)
  return res.status(200).json({ "raw": flipResults, "summary": summary })
})

app.get("/app/flip/call/heads", (req, res) => {
  return res.status(200).json(flipACoin("heads"))
})

app.get("/app/flip/call/tails", (req, res) => {
  return res.status(200).json(flipACoin("tails"))
})

if (args.debug || args.d) {
    app.get('/app/log/access/', (req, res, next) => {
        const stmt = logdb.prepare("SELECT * FROM accesslog").all();
	    res.status(200).json(stmt);
    })

    app.get('/app/error/', (req, res, next) => {
        throw new Error('Error test works.')
    })
}

app.use(function(req, res){
    const statusCode = 404
    const statusMessage = 'NOT FOUND'
    res.status(statusCode).end(statusCode+ ' ' +statusMessage)
});

const server = app.listen(port, () => {
    console.log("Server running on port %PORT%".replace("%PORT%",port))
});
process.on('SIGINT', () => {
    server.close(() => {
		console.log('\nApp stopped.');
	});
});