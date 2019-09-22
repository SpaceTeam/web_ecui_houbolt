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
var sequenceManMod = require('./server/SequenceManager');
var checklistManMod = require('./server/ChecklistManager')

var sequenceMan = new sequenceManMod();
var checklistMan = new checklistManMod();

var sequenceRunning = false;

//console.log(checklistMan._loadChecklist());

//test read-write
// console.log(sm.loadSequence());
// console.log(sm.loadAbortSequence());
// sm.saveAbortSequence(sm.loadAbortSequence());

var events = require('events');
var eventEmitter = new events.EventEmitter();


var onChecklistStart = function (ioClient, socket) {
    console.log('checklist start');
    checklistMan = new checklistManMod();

    //send everyone up to date checklist
    let jsonChecklist = checklistManMod.loadChecklist();
    console.log(jsonChecklist)
    ioClient.emit('checklist-load', jsonChecklist);
}

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

    //send everyone up to date sequence
    let jsonSeq = sequenceManMod.loadSequence();
    console.log(jsonSeq)
    ioClient.emit('sequence-load', jsonSeq);
}

var onSequenceStart = function (ioClient, socket) {

    if (!sequenceRunning) {
        sequenceRunning = true;
        console.log('sequence start');
        ioClient.emit('sequence-start');

        sequenceManMod.init();
        //TODO: maybe change so emitter is invoking events
        sequenceManMod.startSequence(1.0,
            function(time){onSequenceSync(ioClient,socket,time);},
            function(){onSequenceDone(ioClient,socket);}
            );

    }
    else
    {
        console.log("Can't start sequence, already running");
    }
}

var onSequenceSync = function (ioClient, socket, time) {
    console.log('sequence sync');
    console.log(time)
    ioClient.emit('sequence-sync', time);
}

var onSequenceDone = function (ioClient, socket) {
    console.log('sequence done');
    ioClient.emit('sequence-done');
    sequenceRunning = false;
}

var onAbort = function (ioClient, socket) {
    if (sequenceRunning) {
        sequenceManMod.abortSequence();
        socket.broadcast.emit('abort');
        ioClient.emit('chat message', 'ABORT!!!!!');
        sequenceRunning = false;
    }
}

var senDataInterval;
var sensorTime = 0;
var onSendTestSensorData = function(ioClient)
{
    let jsonSensor0 = {
        "id": 0,
        "name": "Chamber",
        "time": sensorTime,
        "value": Math.random().toPrecision(3) * 2048
    };

    ioClient.emit('sensor', jsonSensor0);

    let jsonSensor1 = {
        "id": 1,
        "name": "Injector",
        "time": sensorTime,
        "value": Math.random().toPrecision(3) * 2048
    };

    ioClient.emit('sensor', jsonSensor1);

    let jsonSensor2 = {
        "id": 2,
        "name": "FuelTank",
        "time": sensorTime,
        "value": Math.random().toPrecision(3) * 2048
    };

    ioClient.emit('sensor', jsonSensor2);

    if (sensorTime >= 10000)
    {
        clearInterval(senDataInterval);
    }
    sensorTime+=100;
}

//Assign the event handler to an event:
//TODO: check if events slowing down process and instead emit messages of sockets directly inside incoming message events
eventEmitter.on('onChecklistStart', onChecklistStart);
eventEmitter.on('onChecklistDone', onChecklistDone);
eventEmitter.on('onChecklistTick', onChecklistTick);

eventEmitter.on('onSequenceStart', onSequenceStart);
eventEmitter.on('onSequenceSync', onSequenceSync);
eventEmitter.on('onSequenceDone', onSequenceDone);

eventEmitter.on('onAbort', onAbort);


senDataInterval = setInterval(function(){onSendTestSensorData(ioClient)}, 100);
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

    //send everyone up to date sequence
    let jsonSeq = sequenceManMod.loadSequence();
    ioClient.emit('sequence-load', jsonSeq);

    socket.on('chat message', function(msg){
        ioClient.emit('chat message', msg);
    });

    socket.on('abort', function(msg){
        console.log('abort');
        //TODO: maybe change so everyone can abort
        if (master === socket.id) {
            //TODO: CAREFUL even if not running tell llServer from abort IN ANY CASE
            eventEmitter.emit('onAbort', ioClient, socket);
        }
    });

    socket.on('checklist-start', function(msg){
        console.log('checklist-start');
        if (master === socket.id) {
            eventEmitter.emit('onChecklistStart', ioClient, socket);
        }
    });

    socket.on('checklist-save', function(msg){
        console.log('checklist-save');
        if (master === socket.id) {
            checklistManMod.saveChecklist(msg);
        }
    });

    socket.on('checklist-tick', function(msg){
        console.log('checklist-tick');
        if (master === socket.id) {
            eventEmitter.emit('onChecklistTick', ioClient, socket, msg)
        }
    });

    socket.on('sequence-start', function(msg){
        console.log('sequence-save');
        if (master === socket.id) {
            eventEmitter.emit('onSequenceStart', ioClient, socket);
        }
    });

    socket.on('sequence-save', function(msg){
        console.log('sequence-save');
        if (master === socket.id) {
            sequenceManMod.saveSequence(msg);
        }
    });

    socket.on('abortSequence-save', function(msg){
        console.log('abortSequence-save');
        if (master === socket.id) {
            sequenceManMod.saveAbortSequence(msg);
        }
    });

    socket.on('servo', function(msg){
        console.log('servo');
    });

    socket.on('disconnect', function(msg){
        console.log('user disconnected');
        if (master === socket.id) {
            if (sequenceRunning)
            {
                eventEmitter.emit('onAbort', ioClient, socket);
            }
        }
    });
});

app.get('/', function(req, res){
    res.sendFile(path + 'index.html');
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});
