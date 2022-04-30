const express = require('express')
const app = express()

const minimist = require('minimist')


const args = require('minimist')(process.argv.slice(2))

args["port", "debug", "log", "help"]
console.log(args)

const port = args.port || process.env.PORT || 5555
const debug = args.debug || false
const log = args.log || true
// const help = args.help

const logdb = require("./src/services/database.js");
const fs = require('fs');
const morgan = require('morgan');
app.use(express.urlencoded({extended: true}));
app.use(express.json());

const help = (`
server.js [options]
--por		Set the port number for the server to listen on. Must be an integer
              between 1 and 65535.
--debug	If set to true, creates endlpoints /app/log/access/ which returns
              a JSON access log from the database and /app/error which throws 
              an error with the message "Error test successful." Defaults to 
  false.
--log		If set to false, no log files are written. Defaults to true.
  Logs are always written to database.
--help	Return this message and exit.
`);

if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

if (args.log != "false" && args.log != false) {
    const accesslog = fs.createWriteStream('access.log', { flags: 'a' })
    app.use(morgan('combined', {stream: accesslog}))
} 
// else {
//     console.log("No written log.")
// }

if (args.debug) {
    app.get('/app/log/access', (req, res) => {
        const stmt = logdb.prepare('SELECT * FROM accesslog').all();
        res.status(200).json(stmt)
        //res.writeHead(res.statusCode, {"Content-Type" : "text/json"});
    })

    app.get('/app/error', (req, res) => {
        throw new Error('error test successful.')
    })
}

// app.use((req, res, next) => {
//     let logData = {
//             remoteaddr: req.ip,
//             remoteuser: req.user,
//             time: Date.now(),
//             method: req.method,
//             url: req.url,
//             protocol: req.protocol,
//             httpversion: req.httpVersion,
//             status: res.statusCode,
//             referer: req.headers['referer'],
//             useragent: req.headers['user-agent']
//         }
//         console.log(logData)
//         const stmt = logdb.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
//         const info = stmt.run(logData.remoteaddr, logData.remoteuser, logData.time, logData.method, logData.url, logData.protocol, logData.httpversion, logData.status, logData.referer, logData.useragent)
//         next()
//     })

function coinFlip() {
    return (Math.random() < 0.5 ? 'tails' : 'heads');
}

function coinFlips(flips) {
    var flips_arr = [];
  
    if (flips<=0 || typeof flips=="undefined") {
      flips=1;
    } 
  
    for (let i=0;i<flips;i++){
      flips_arr.push(coinFlip());
    }
  
    return flips_arr
}

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

  function flipACoin(call) {
    var flip=coinFlip();
    var result='lose'
  
    if (flip==call){
      result='win'
    }
      
    return { 'call': call, 'flip': flip, 'result': result };  
}


const server = app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

app.use((req, res, next) => {
  let logdata = {
      remoteaddr: req.ip,
      remoteuser: req.user,
      time: Date.now(),
      method: req.method,
      url: req.url,
      protocol: req.protocol,
      httpversion: req.httpVersion,
      status: res.statusCode,
      referer: req.headers['referer'],
      useragent: req.headers['user-agent']
  }
  const stmt = logdb.prepare("INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?,?,?,?,?,?,?,?,?,?)")
  const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent)
  next()
})
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
app.use(function (req, res) {
  res.status(404).send("404 NOT FOUND")
})

process.on('SIGINT', () => {
    server.close(() => {
		console.log('\nApp stopped.');
	});
});