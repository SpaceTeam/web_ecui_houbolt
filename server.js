// 'use strict';
//
// const express = require('express');
//
// // Constants
// const PORT = 8080;
// const HOST = '0.0.0.0';
//
// // App
// const app = express();
// app.get('/', (req, res) => {
//   res.send('Hello world\n');
// });
//
// app.listen(PORT, HOST);
// console.log(`Running on http://${HOST}:${PORT}`);


// const express = require('express');
// const app = express();
// const router = express.Router();
//
// const path = __dirname + '/views/';
// const port = 8080;
//
// router.use(function (req,res,next) {
//   console.log('/' + req.method);
//   next();
// });
//
// router.get('/', function(req,res){
//   res.sendFile(path + 'index.html');
// });
//
// router.get('/sharks', function(req,res){
//   res.sendFile(path + 'sharks.html');
// });
//
// app.use(express.static(path));
// app.use('/', router);
//
// app.listen(port, function () {
//   console.log('Example app listening on port 8080!')
// })

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/chat.html');
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
