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

// Import net module.
var net = require('net');
var llServerMod = require('./server/LLServerSocket');

console.log(llServerMod);
// Create and return a net.Server object, the function will be invoked when client connect to this server.
var llServer;
var server = net.createServer(function(client){llServer = llServerMod.onLLServerConnect(client, processLLServerMessage);});

// Make the server a TCP server listening on port 5555.
server.listen(5555, function(){ llServerMod.onCreateTCP(server)});

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

    //send new socket up to date checklist
    let jsonChecklist = checklistManMod.loadChecklist();
    socket.emit('checklist-load', jsonChecklist);
};

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
        console.log('sequence start');
        ioClient.emit('sequence-start');

        // sequenceManMod.init();
        // //TODO: maybe change so emitter is invoking events
        // sequenceManMod.startSequence(1.0,
        //     function(time){onSequenceSync(ioClient,socket,time);},
        //     function(){onSequenceDone(ioClient,socket);}
        //     );
        llServerMod.sendMessage(llServer, 'sequence-start', [sequenceManMod.loadSequence(), sequenceManMod.loadAbortSequence()]);
    }
    else
    {
        console.log("Can't start sequence, already running");
    }
}

var onSequenceSync = function (ioClient, time) {
    console.log('sequence sync');


    ioClient.emit('sequence-sync', time);
}

var onSequenceDone = function (ioClient) {
    console.log('sequence done');
    ioClient.emit('sequence-done');
    sequenceRunning = false;
}

var onAbort = function (ioClient, socket) {
    if (sequenceRunning) {
        //sequenceManMod.abortSequence();
        socket.broadcast.emit('abort');
        ioClient.emit('chat message', 'ABORT!!!!!');
        sequenceRunning = false;

        llServerMod.sendMessage(llServer, 'abort');
    }
}

var onAbortAll = function(ioClient)
{
    if (sequenceRunning) {
        ioClient.emit('abort');
        sequenceRunning = false;

    }
}

var onTimerStart = function (ioClient) {

    if (!sequenceRunning) {
        sequenceRunning = true;
        console.log('timer start');
        ioClient.emit('timer-start');
    }

}

// var senDataInterval;
// var sensorTime = 0;
// var onSendTestSensorData = function(ioClient)
// {
//     let jsonSensor0 = {
//         "name": "Chamber",
//         "time": sensorTime,
//         "value": Math.random().toPrecision(3) * 2048
//     };
//
//     let jsonSensor1 = {
//         "name": "Injector",
//         "time": sensorTime,
//         "value": Math.random().toPrecision(3) * 2048
//     };
//
//     let jsonSensor2 = {
//         "name": "FuelTank",
//         "time": sensorTime,
//         "value": Math.random().toPrecision(3) * 2048
//     };
//
//
//     let jsonSensor3 = {
//         "name": "digital test",
//         "time": sensorTime,
//         "value": Math.round(Math.random())
//     };
//
//     ioClient.emit('sensors', [jsonSensor0, jsonSensor1, jsonSensor2, jsonSensor3]);
//
//     if (sensorTime >= 10000)
//     {
//         clearInterval(senDataInterval);
//     }
//     sensorTime+=100;
// }

//Assign the event handler to an event:
//TODO: check if events slowing down process and instead emit messages of sockets directly inside incoming message events
eventEmitter.on('onChecklistStart', onChecklistStart);
eventEmitter.on('onChecklistDone', onChecklistDone);
eventEmitter.on('onChecklistTick', onChecklistTick);

eventEmitter.on('onSequenceStart', onSequenceStart);
eventEmitter.on('onSequenceSync', onSequenceSync);
eventEmitter.on('onSequenceDone', onSequenceDone);

eventEmitter.on('onAbort', onAbort);
eventEmitter.on('onAbortAll', onAbortAll);

eventEmitter.on('onTimerStart', onTimerStart);


//senDataInterval = setInterval(function(){onSendTestSensorData(ioClient)}, 100);
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

    //send new socket up to date sequence
    let jsonSeq = sequenceManMod.loadSequence();
    socket.emit('sequence-load', jsonSeq);

    //send new socket up to date servo end positions
    let jsonServos = [
        {
            "id": 0,
            "name": "Fuel Servo",
            "min": 20,
            "max": 1900
        },
        {
            "id": 1,
            "name": "Oxidizer Servo",
            "min": 0,
            "max": 2000
        }
    ];
    socket.emit('servos-load', jsonServos);

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
        console.log('sequence-start');
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

    socket.on('servos-calibrate', function(jsonServos){
        console.log('servos-calibrate');
        for (let i in jsonServos)
        {
            console.log(jsonServos[i]);
        }
    });

    socket.on('servos-set', function(jsonServos){
        console.log('servos-set');
        for (let i in jsonServos)
        {
            console.log(jsonServos[i]);
        }
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

function processLLServerMessage(data)
{
    // Print received client data and length.
    let testmsg = {};
    testmsg.type = "success";
    testmsg.content = {};

    console.log(data);
    data = JSON.parse(data);

    let type = data.type;

    switch (type) {
        case "TEST":
            console.log("hello");
            break;
        case "timer-start":
            console.log("timer-start");
            eventEmitter.emit('onTimerStart', ioClient);
            break;
        case "timer-sync":
            console.log("timer-sync");
            let time = Math.round(data.content.toPrecision(3) * 100) / 100;
            console.log(data.content.toPrecision(3));
            console.log(time);
            eventEmitter.emit('onSequenceSync', ioClient, time);
            break;
        case "timer-done":
            console.log("timer-done");
            eventEmitter.emit('onSequenceDone', ioClient);
            break;
        case "sensors":
            console.log("sensors");
            ioClient.emit('sensors', data.content);
            break;
        case "abort":
            console.log("abort from llserver");
            eventEmitter.emit('onAbortAll', ioClient);
            break;

    }
    //llServer.write(JSON.stringify(testmsg));
}

app.get('/', function(req, res){
    res.sendFile(path + 'index.html');
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});