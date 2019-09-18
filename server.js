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

const express = require('express');
const path = __dirname + '/client/';

var app = express();
var http = require('http').Server(app);
var ioClient = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/client/'));

var MCSocket = require('./server/ClientSocket');
var sm = require('./server/SequenceManager');
var checklistManMod = require('./server/ChecklistManager')

//console.log(checklistMan._loadChecklist());

//test read-write
// console.log(sm.loadSequence());
// console.log(sm.loadAbortSequence());
// sm.saveAbortSequence(sm.loadAbortSequence());

var events = require('events');
var eventEmitter = new events.EventEmitter();

//Create an event handler:
var checklistMan = new checklistManMod();
var onChecklistTick = function (ioClient, socket, id) {
    let retTick = checklistMan.tick(id);
    if (retTick === 1)
    {
        socket.broadcast.emit('checklist-update', id);
        socket.broadcast.emit('chat message', 'Tick id: ' + id);
        eventEmitter.emit('onChecklistDone', ioClient, socket);
    }
    else if (retTick === 0)
    {
        socket.broadcast.emit('checklist-update', id);
        socket.broadcast.emit('chat message', 'Tick id: ' + id);
    }
}

var onChecklistDone = function (ioClient, socket) {
    console.log('checklist done');
    ioClient.emit('checklist-done');
    ioClient.emit('chat message', 'checklist done!');
}

//Assign the event handler to an event:
eventEmitter.on('onChecklistDone', onChecklistDone);
eventEmitter.on('onChecklistTick', onChecklistTick);


var master = null;

ioClient.on('connection', function(socket){

    console.log('userID: ' + socket.id + ' userAddress: ' + socket.handshake.address + ' connected');
    // if (master == null)
    // {
    //     //TODO: change to ip address after development (socket.handshake.address)
    //     master = socket.handshake.address;
    // }
    //choose last one connected for testing
    master = socket.id;

    socket.on('chat message', function(msg){
        ioClient.emit('chat message', msg);
    });

    socket.on('abort', function(msg){
        console.log('abort');
    });

    socket.on('checklist-start', function(msg){
        console.log('checklist-start');
        if (master === socket.id) {
            eventEmitter.emit('onChecklistTick', ioClient, socket, 0);
            eventEmitter.emit('onChecklistTick', ioClient, socket, 2);
            eventEmitter.emit('onChecklistTick', ioClient, socket, 5);
        }
    });

    socket.on('checklist-send', function(msg){
        console.log('checklist-send');
    });

    socket.on('checklist-tick', function(msg){
        console.log('checklist-tick');
        if (master === socket.id) {
            eventEmitter.emit('onChecklistTick', ioClient, socket, msg)
        }
    });

    socket.on('sequence-send', function(msg){
        console.log('sequence-send');
    });

    socket.on('abortSequence-send', function(msg){
        console.log('abortSequence-send');
    });

    socket.on('servo', function(msg){
        console.log('servo');
    });

    socket.on('disconnect', function(msg){
        console.log('user disconnected');
    });
});

app.get('/', function(req, res){
    res.sendFile(path + 'index.html');
});

app.get('/sharks', function(req,res){
   res.sendFile(path + 'sharks.html');
 });

app.get('/chat', function(req,res){
   res.sendFile(path + 'chat.html');
 });

http.listen(port, function(){
    console.log('listening on *:' + port);
});
