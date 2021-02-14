// set up basic express routing
const http = require('http');
const express = require('express');
const path = require('path');
const app = express();

const port = process.env.PORT || 3008;

app.use(express.json());
// app.use(express.static("express"));
// app.use('/assets', express.static(path.join(__dirname, 'assets')))
app.use(express.static(path.join(__dirname, 'public'))); // default path to access files available for client. files present in public folder are accessible to client without any restrictions

app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);	// uses ejs modules to add html engine. app.engine defines new engine
app.set('view engine', 'html'); // set html as default view/render engine
app.set('port', port);


// default URL for website
app.use('/', function(req,res){
    res.render('index');
    //__dirname : It will resolve to your project folder.
  });
const server = http.createServer(app);
server.listen(port);
console.debug('Server listening on port ' + port);
var originList = process.env.NODE_ENV == 'production'? "https://mangochat.herokuapp.com" : "http://localhost:3008";

console.log('ORIGIN SELECTED IS '+originList);

// setup mongo and socket.io
const mongo = require('mongodb').MongoClient;
const client = require('socket.io')(server, {
    cors: {
      origin: originList,
      methods: ["GET", "POST"],
      credentials: true,
      transports: ['websocket', 'polling'],
    }  
});

if(process.env.NODE_ENV === "production"){
    var uri = process.env.MONGODB_URI;
}
else{
    var uri = "mongodb://127.0.0.1/spaceterra";
}

// mongo connection
mongo.connect(uri, function(err, db){
  if(err){
      throw err;
  }
  else{
      console.log("Connection to DB established!");
      console.log(uri);
  }

  // connection to socket.io
  client.on('connection', function(socket){
      
      let spaceterra = db.db('spaceterra');
      let leaderboard = spaceterra.collection('leaderboard');

      socket.on('send_score', function(data){
        let username = data.username;
        let score = data.score;

        leaderboard.insertOne({username: username, score: score});

       leaderboard.find().limit(7).sort({score:-1}).toArray(function(err, response){
        if(err){
            throw err;
        }
        socket.emit('rec_score', response);
    });
       
      });

      socket.on('fetch_score', function(){
        leaderboard.find().limit(7).sort({score:-1}).toArray(function(err, response){
          if(err){
              throw err;
          }
          socket.emit('rec_score', response);
      });
      })
  });
});