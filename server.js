const express = require('express');
const path = __dirname + '/client/';

var app = express();
var http = require('http').Server(app);
var ioClient = require('socket.io')(http);
var clientsCount = 0;
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

var onSequenceLoad = function (ioClient, socket)
{
    //send new socket up to date sequence
    let jsonSeq = sequenceManMod.loadSequence();
    let jsonAbortSeq = sequenceManMod.loadAbortSequence();
    if (jsonSeq === undefined || jsonAbortSeq === undefined)
    {
        console.error("can't start sequence, sequence or " +
            "abort-sequence not loaded yet, check sequences for errors!");
        return;
    }
    let sequences = sequenceManMod.getAllSequences();
    let abortSequences = sequenceManMod.getAllAbortSequences();

    console.log("sequences");
    console.log(sequences);
    console.log("abortSequences");
    console.log(abortSequences);


    socket.emit('sequence-load', [sequences, abortSequences, jsonSeq, jsonAbortSeq]);
}


var onChecklistStart = function (ioClient, socket) {
    console.log('checklist start');
    checklistMan = new checklistManMod();

    //send new socket up to date checklist
    let jsonChecklist = checklistManMod.loadChecklist();
    socket.emit('checklist-load', jsonChecklist);
    if (jsonChecklist.length === 0)
    {
        eventEmitter.emit('onChecklistDone', ioClient, socket);
    }
};

var onChecklistTick = function (ioClient, socket, id) {
    let retTick = checklistMan.tick(id);
    if (retTick === 1)
    {
        socket.broadcast.emit('checklist-update', id);
        eventEmitter.emit('onChecklistDone', ioClient, socket);
    }
    else if (retTick === 0)
    {
        socket.broadcast.emit('checklist-update', id);
    }
}

var onChecklistDone = function (ioClient, socket) {
    console.log('checklist done');
    ioClient.emit('checklist-done');

    //send everyone up to date sequence
    eventEmitter.emit('onSequenceLoad', ioClient, socket);
}

var onSequenceStart = function (ioClient, socket, msg) {

    if (!sequenceRunning) {
        console.log('sequence start');
        ioClient.emit('sequence-start');

        // sequenceManMod.init();
        // //start timer on this server instead of LLServer
        // sequenceManMod.startSequence(1.0,
        //     function(time){onSequenceSync(ioClient,socket,time);},
        //     function(){onSequenceDone(ioClient,socket);}
        //     );

        let jsonSeq = sequenceManMod.loadSequence();
        let jsonAbortSeq = sequenceManMod.loadAbortSequence();
        if (jsonSeq === undefined || jsonAbortSeq === undefined)
        {
            console.error("can't start sequence, sequence or " +
                "abort-sequence not loaded yet, check sequences for errors!");
            return;
        }

        llServerMod.sendMessage(llServer, 'sequence-start', [jsonSeq, jsonAbortSeq, msg]);
    }
    else
    {
        console.log("Can't start sequence, already running");
    }
}

var onPostSeqComment = function (ioClient, socket, msg) {
    console.log('send-postseq-comment')
    llServerMod.sendMessage(llServer, 'send-postseq-comment', [msg]);
}

var onSequenceSync = function (ioClient, time) {
    console.log('sequence sync');


    ioClient.emit('sequence-sync', time);
}

var onSequenceDone = function (ioClient) {
    console.log('sequence done');
    ioClient.emit('sequence-done');
    sequenceRunning = false;

    setTimeout(function () {
            if (!sequenceRunning)
            {
                llServerMod.sendMessage(llServer, 'sensors-start');
            }
        }, 3500);
}

var onAbort = function (ioClient, socket) {
    if (sequenceRunning) {
        //sequenceManMod.abortSequence();
        socket.broadcast.emit('abort');
        sequenceRunning = false;

        llServerMod.sendMessage(llServer, 'abort');

        setTimeout(function () {
            if (!sequenceRunning)
            {
                llServerMod.sendMessage(llServer, 'sensors-start');
            }
        }, 3500);
    }
}

var onAbortAll = function(ioClient, abortMsg)
{
    if (sequenceRunning) {
        if (abortMsg !== undefined && abortMsg !== "")
        {
            ioClient.emit('abort', abortMsg);
        }
        else
        {
            ioClient.emit('abort');
        }
        sequenceRunning = false;

        setTimeout(function () {
            if (!sequenceRunning)
            {
                llServerMod.sendMessage(llServer, 'sensors-start');
            }
        }, 3500);
    }
}

var onTimerStart = function (ioClient) {

    if (!sequenceRunning) {
        sequenceRunning = true;
        console.log('timer start');
        ioClient.emit('timer-start');
    }

}

//Assign the event handler to an event:
//TODO: check if events slowing down process and instead emit messages of sockets directly inside incoming message events
eventEmitter.on('onChecklistStart', onChecklistStart);
eventEmitter.on('onChecklistDone', onChecklistDone);
eventEmitter.on('onChecklistTick', onChecklistTick);

eventEmitter.on('onSequenceLoad', onSequenceLoad);
eventEmitter.on('onSequenceStart', onSequenceStart);
eventEmitter.on('onPostSeqComment', onPostSeqComment);
eventEmitter.on('onSequenceSync', onSequenceSync);
eventEmitter.on('onSequenceDone', onSequenceDone);

eventEmitter.on('onAbort', onAbort);
eventEmitter.on('onAbortAll', onAbortAll);

eventEmitter.on('onTimerStart', onTimerStart);


//senDataInterval = setInterval(function(){onSendTestSensorData(ioClient)}, 100);
var master = null;

ioClient.on('connection', function(socket){

    clientsCount++;
    console.log(clientsCount);
    if (llServer === undefined)
    {
        var intDel = setInterval(function () {
            if (llServer !== undefined)
            {
                llServerMod.sendMessage(llServer, 'sensors-start');
                clearInterval(intDel);
            }
        }, 1000);
    }
    else
    {
        llServerMod.sendMessage(llServer, 'sensors-start');
    }
    console.log('userID: ' + socket.id + ' userAddress: ' + socket.handshake.address + ' connected');
    // if (master == null)
    // {
    //     //TODO: change to ip address after development (socket.handshake.address)
    //     master = socket.handshake.address;
    // }
    //choose last one connected for testing
    if (master === null)
    {
        master = socket.id;
    }


    eventEmitter.emit('onSequenceLoad', ioClient, socket);

    //send new socket up to date servo end positions
    llServerMod.sendMessage(llServer, 'servos-load');

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
        //everyone is allowed to call for checklist
        eventEmitter.emit('onChecklistStart', ioClient, socket);
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
            eventEmitter.emit('onSequenceStart', ioClient, socket, msg);

        }
    });

    socket.on('send-postseq-comment', function(msg){
        console.log('send-postseq-comment');
        if (master === socket.id) {
            eventEmitter.emit('onPostSeqComment', ioClient, socket, msg);

        }
    });


    socket.on('sequence-set', function(msg){
        console.log('sequence-set');
        if (master === socket.id) {
            sequenceManMod.setSequence(msg);

            eventEmitter.emit('onSequenceLoad', ioClient, socket);
        }
    });

    socket.on('abortSequence-set', function(msg){
        console.log('abortSequence-set');
        if (master === socket.id) {
            sequenceManMod.setAbortSequence(msg);

            eventEmitter.emit('onSequenceLoad', ioClient, socket);
        }
    });

    socket.on('servos-enable', function(){
        console.log('servos-enable');
        if (master === socket.id) {
            llServerMod.sendMessage(llServer, 'servos-enable');
        }

    });

    socket.on('servos-disable', function(){
        console.log('servos-disable');
        if (master === socket.id) {
            llServerMod.sendMessage(llServer, 'servos-disable');
        }

    });

    socket.on('servos-calibrate', function(jsonServos){
        console.log('servos-calibrate');
        if (master === socket.id) {
            llServerMod.sendMessage(llServer, 'servos-calibrate', jsonServos);
        }

    });

    socket.on('servos-set', function(jsonServos){
        console.log('servos-set');
        if (master === socket.id) {
            llServerMod.sendMessage(llServer, 'servos-set', jsonServos);
        }

    });

    socket.on('servos-set-raw', function(jsonServos){
        console.log('servos-set-raw');
        if (master === socket.id) {
            llServerMod.sendMessage(llServer, 'servos-set-raw', jsonServos);
        }
    });

    socket.on('digital-outs-set', function(jsonDigitalOutputs){
        console.log('digital-outs-set');
        console.log(jsonDigitalOutputs)
        if (master === socket.id) {
            llServerMod.sendMessage(llServer, 'digital-outs-set', jsonDigitalOutputs);
        }

    });

    socket.on('setpoint-set', function(jsonSetPoint){
        console.log('setpoint-set');
		console.log(jsonSetPoint);
        if (master === socket.id) {
            llServerMod.sendMessage(llServer, 'setpoint-set', jsonSetPoint);
        }

    });

    socket.on('tare', function(){
        console.log('tare');
        if (master === socket.id) {
            llServerMod.sendMessage(llServer, 'tare');
        }

    });

    socket.on('disconnect', function(msg){
        console.log('user disconnected');
        if (master === socket.id) {
            if (sequenceRunning)
            {
                eventEmitter.emit('onAbort', ioClient, socket);
            }
            master = null;
        }
        clientsCount--;
        if (clientsCount === 0)
        {
            llServerMod.sendMessage(llServer, 'abort');
            llServerMod.sendMessage(llServer, 'sensors-stop');
        }
    });
});

var llServerMsg = "";

function processLLServerMessage(data) {
    // Print received client data and length.
    llServerMsg += data;
    let index = llServerMsg.lastIndexOf("\n");
    if (index !== -1)
    {
        dataArr = llServerMsg.split("\n");

        llServerMsg = llServerMsg.substring(index+1);
        if (llServerMsg !== "")
            console.log("uncomplete substring msg:", llServerMsg);

        if (dataArr.length > 2)
        {
            console.log("multiple messages detected");

        }

        let jsonData;
        for (let dataInd = 0; dataInd < dataArr.length-1; dataInd++) // ignore last empty string
        {
            //console.log(dataArr[dataInd]);
            jsonData = JSON.parse(dataArr[dataInd]);

            let type = jsonData.type;

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
                    let time = Math.round(jsonData.content.toPrecision(3) * 100) / 100;
                    console.log(jsonData.content.toPrecision(3));
                    console.log(time);
                    eventEmitter.emit('onSequenceSync', ioClient, time);
                    break;
                case "timer-done":
                    console.log("timer-done");
                    eventEmitter.emit('onSequenceDone', ioClient);
                    break;
                case "sensors":
                    ioClient.emit('sensors', jsonData.content);
                    break;
                case "servos-load":
                    console.log("servos-load");
                    ioClient.emit('servos-load', jsonData.content);
                    break;
                case "abort":
                    console.log("abort from llserver");
                    eventEmitter.emit('onAbortAll', ioClient, jsonData.content);
                    break;

            }
        }
    }
}

app.get('/', function(req, res){
    res.sendFile(path + 'index.html');
});

app.get('/pnid', function(req, res){
    res.sendFile(path + 'pnid.html');
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});
