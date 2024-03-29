const express = require('express');
const path = __dirname + '/client/';

const fs = require('fs');
const pathMod = require('path');

const webConfigSubPath = 'web';
const pnidConfigSubPath = 'pnid';
var configPath = '';
var gotConfigArg = false;

var app = express();
var http = require('http').Server(app);
var ioClient = require('socket.io')(http);
var clients = [];
var port = 80;

const { exec } = require('child_process');

const bp = require('body-parser');
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

// Search for argument port= in node cli arguments
process.argv.forEach(arg => {
    if(arg.startsWith("port=")){
        var reqPort = arg.slice(arg.indexOf("=") + 1);
        reqPort = Number.parseInt(reqPort);
        
        // check validity of requested port
        if(reqPort >= 0 && reqPort <= 65353) port = reqPort;
        else console.log(arg + " doesn't include a valid port number, using default port instead: " + port);
    }
    else if (arg.startsWith("config="))
    {
        gotConfigArg = true;
        var newConfigPath = arg.slice(arg.indexOf("=") + 1);
        
        // check validity of requested port
        if (!fs.existsSync(newConfigPath))
        {
            console.error("Config path provided in arguments does not exist.");
            console.error("try to add as an argument configure docker env variable 'ECUI_CONFIG_PATH=<your_path>' or use 'echo \"ECUI_CONFIG_PATH=<your_path>\" >> /etc/environment'!");
            process.exit(1);
        }  
        else
        {
            configPath = newConfigPath;
        } 
    }
});

if (!gotConfigArg)
{
    configPath = process.env.ECUI_CONFIG_PATH;
    if (configPath == undefined)
    {
        console.error("Config path is missing, try to add as an argument configure docker env variable 'ECUI_CONFIG_PATH=<your_path>' or use 'echo \"ECUI_CONFIG_PATH=<your_path>\" >> /etc/environment'!");
        process.exit(1);
    }
}

console.log("using config path: " + configPath);

port = process.env.PORT || port;

app.use(express.static(__dirname + '/client/'));

var MCSocket = require('./server/ClientSocket');
var sequenceManMod = require('./server/SequenceManager');
var pnidManMod = require('./server/PnIDManager');
var checklistManMod = require('./server/ChecklistManager');

var sequenceMan = new sequenceManMod(configPath);
var pnidMan = new pnidManMod(__dirname, configPath);
var checklistMan = new checklistManMod();

var sequenceRunning = false;
var llServerConnected = false;

var commandsJson = [];

// Import net module.
var net = require('net');
var llServerMod = require('./server/LLServerSocket');

console.log(llServerMod);


// Create and return a net.Server object, the function will be invoked when client connect to this server.
var llServer;
var server = net.createServer(function(client){llServer = llServerMod.onLLServerConnect(client, processLLServerMessage, onLLServerDisconnect); onLLServerConnect();});

// Make the server a TCP server listening on port 5555.
server.listen(5555, function(){ llServerMod.onCreateTCP(server)});

//console.log(checklistMan._loadChecklist());

//test read-write
// console.log(sm.loadSequence());
// console.log(sm.loadAbortSequence());
// sm.saveAbortSequence(sm.loadAbortSequence());

var events = require('events');
const { NONAME } = require('dns');
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

var onCommandsLoad = function(ioClient, socket)
{
    console.log("commands-load");
    console.log(commandsJson);
    llServerMod.sendMessage(llServer, 'commands-load');
    // if (commandsJson === [])
    // {
    //     llServerMod.sendMessage(llServer, 'commands-load');
    // }
    // else
    // {
    //     socket.emit('commands-load', commandsJson);
    // }
    
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
                llServerMod.sendMessage(llServer, 'states-start');
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
                llServerMod.sendMessage(llServer, 'states-start');
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
                llServerMod.sendMessage(llServer, 'states-start');
            }
        }, 3500);
    }
}

var onAutoAbortChange = function(ioClient, socket, isAutoAbortActive)
{
    if (!sequenceRunning) {
        llServerMod.sendMessage(llServer, 'auto-abort-change', isAutoAbortActive);
    }
}

var onTimerStart = function (ioClient) {

    if (!sequenceRunning) {
        sequenceRunning = true;
        console.log('timer start');
        ioClient.emit('timer-start');
    }

}

var onMasterChange = function (socket) {
    if(master === socket.id){
	    socket.emit('master-change', 'master');
    }
    else {
	    socket.emit('master-change', 'client');
    }
}

var onMasterLock = function (socket, flag) {
    masterLocked = flag == 1 ? true : false;
    socket.broadcast.emit('master-lock', flag);
    console.log('master lock ' + flag);
}

var onRpiHalt = function () {
    exec("/sbin/shutdown -h now", (error, stdout, stderr) => {
        if (error) {
            console.log('rpi halt error: ' + error.message);
            return;
        }
        if (stderr) {
            console.log('rpi halting: ' + stderr);
            return;
        }
        console.log('rpi halting');
    });
}

var onLLRestart = function () {
    exec("docker restart llserver-ecui", (error, stdout, stderr) => {
        if (error) {
            console.log('ll restart error: ' + error.message);
            return;
        }
        if (stderr) {
            console.log('ll restart stderr: ' + stderr);
            return;
        }
        console.log('ll restarting');
    });
}

var onExportLog = function () {
    let localDate = new Date();
    // get utc date
    var dateObj = new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000); // covert to UTC time

    // current date
    // adjust 0 before single digit date
    let date = ("0" + dateObj.getDate()).slice(-2);

    // current month
    let month = ("0" + (dateObj.getMonth() + 1)).slice(-2);

    // current year
    let year = dateObj.getFullYear();

    // current hours
    let hours = ("0" + dateObj.getHours()).slice(-2);

    // current minutes
    let minutes = ("0" + dateObj.getMinutes()).slice(-2);

    // current seconds
    let seconds = ("0" + dateObj.getSeconds()).slice(-2);

    // prints date & time in YYYY-MM-DD HH:MM:SS format
    let currTime = year + "-" + month + "-" + date + "T" + hours + ":" + minutes + ":" + seconds + "Z";

    let utc = dateObj.getTime() - 60000; // go back mins (60.000ms)

    // create new Date object for old time
    let oldDateObj = new Date(utc);
    let oldDate = ("0" + oldDateObj.getDate()).slice(-2);
    let oldMonth = ("0" + (oldDateObj.getMonth() + 1)).slice(-2);
    let oldYear = oldDateObj.getFullYear();
    let oldHours = ("0" + oldDateObj.getHours()).slice(-2);
    let oldMinutes = ("0" + oldDateObj.getMinutes()).slice(-2);
    let oldSeconds = ("0" + oldDateObj.getSeconds()).slice(-2);
    let oldTime = oldYear + "-" + oldMonth + "-" + oldDate + "T" + oldHours + ":" + oldMinutes + ":" + oldSeconds + "Z";

    console.log('exporting log from ' + oldTime + ' to ' + currTime);
    // execute export command with increased (50MB) buffer size for the large log file
    /*
    exec("python3 /home/pi/export.py hotfire" + date + "T" + hours + minutes + seconds + "Z" + ".csv testDb sensors " + oldTime + " --end " + currTime, {maxBuffer: 50000 * 1024}, (error, stdout, stderr) => {
        if (error) {
            console.log('log export error: ' + error.message);
            return;
        }
        if (stderr) {
            console.log('log export stderr: ' + stderr);
            return;
        }
        console.log('log exporting');
    })
    */
    var spawn = require('child_process').spawn;
    var child = spawn('python3', ['../export.py', 'hotfire' + date + 'T' + hours + minutes + seconds + 'Z' + '.csv', 'testDb',  'sensors', '' + oldTime, '--end', '' + currTime]);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(data) {
    //Here is where the output goes

        console.log('stdout: ' + data);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(data) {
    //Here is where the error output goes

        console.log('stderr: ' + data);
    });

    child.on('close', function(code) {
    //Here you can get the exit code of the script

        console.log('Exporting done: ' + code);
    });
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

eventEmitter.on('onCommandsLoad', onCommandsLoad);

eventEmitter.on('onAbort', onAbort);
eventEmitter.on('onAbortAll', onAbortAll);
eventEmitter.on('onAutoAbortChange', onAutoAbortChange);

eventEmitter.on('onTimerStart', onTimerStart);

eventEmitter.on('onMasterChange', onMasterChange);
eventEmitter.on('onMasterLock', onMasterLock);
eventEmitter.on('onRpiHalt', onRpiHalt);
eventEmitter.on('onLLRestart', onLLRestart);
eventEmitter.on('onExportLog', onExportLog);

//senDataInterval = setInterval(function(){onSendTestSensorData(ioClient)}, 100);
var master = null;
var masterLocked = false;

ioClient.on('connection', function(socket){
    if(!sequenceRunning) {
        clients.push(socket);
        console.log(clients.length);
        if (llServer === undefined)
        {
            var intDel = setInterval(function () {
                if (llServer !== undefined)
                {
                    // llServerMod.sendMessage(llServer, 'commands-load');
                    // llServerMod.sendMessage(llServer, 'states-load');
                    // llServerMod.sendMessage(llServer, 'states-start');
                    if (llServerConnected)
                    {
                        socket.emit("llserver-connect");
                    }
                    clearInterval(intDel);
                }
            }, 1000);
        }
        else
        {
            // llServerMod.sendMessage(llServer, 'commands-load');
            // llServerMod.sendMessage(llServer, 'states-load');
            // llServerMod.sendMessage(llServer, 'states-start');
            if (llServerConnected)
            {
                socket.emit("llserver-connect");
            }
        }
        console.log('userID: ' + socket.id + ' userAddress: ' + socket.handshake.address + ' connected');
        // if (master == null)
        // {
        //     //TODO: change to ip address after development (socket.handshake.address)
        //     master = socket.handshake.address;
        // }
        
        if (master === null)
        {
            master = socket.id;
            eventEmitter.emit('onMasterChange', socket);
        }

        socket.on('request-master', function() {
            var masterSocket = getClientSocketById(master);

            // If the master is not locked or the same device requests a master switch (e.g. when using multiple tabs) and no sequence is running
            if((!masterLocked || (masterSocket != null && socket.handshake.address ===  masterSocket.handshake.address)) && !sequenceRunning) {
                console.log('change master to ' + socket.id + ' ' + socket.handshake.address);

				//TODO: adapt to states
				// //disable servos here since old master isn't allowed to do so anymore
				// llServerMod.sendMessage(llServer, 'servos-disable');

                master = socket.id;
                eventEmitter.emit('onMasterChange', socket);
                // In case the old master disconnected
                if(masterSocket != null) eventEmitter.emit('onMasterChange', masterSocket);
            }
        });

        socket.on('master-lock', (flag) => {
            // Although the master lock is only visible for the master, prevent malicious user that tinkers around with the html/css
            if(socket.id === master)
                eventEmitter.emit('onMasterLock', socket, flag);
        });

        eventEmitter.emit('onSequenceLoad', ioClient, socket);
        // eventEmitter.emit('onCommandsLoad', ioClient, socket);

        socket.on('abort', function(msg){
            console.log('abort');
            //TODO: maybe change so everyone can abort
            if (master === socket.id) {
                //TODO: CAREFUL even if not running tell llServer from abort IN ANY CASE
                eventEmitter.emit('onAbort', ioClient, socket);
            }
        });

        socket.on('auto-abort-change', function(isAutoAbortActive){
            eventEmitter.emit('onAutoAbortChange', ioClient, socket, isAutoAbortActive);
        });

        socket.on('rpi-halt', function(){
            console.log('rpi-halt');
            if (master === socket.id) {
                eventEmitter.emit('onRpiHalt', ioClient, socket);

            }
        });

        socket.on('ll-restart', function(){
            console.log('ll-restart');
            if (master === socket.id) {
                eventEmitter.emit('onLLRestart', ioClient, socket);

            }
        });

	socket.on('log-export', function(){
	    console.log('export-log');
	    if (master == socket.id) {
		eventEmitter.emit('onExportLog', ioClient, socket);
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

        socket.on('states-get', function(jsonStates){
            console.log('states-get');
            llServerMod.sendMessage(llServer, 'states-get', jsonStates);
            
        });

		socket.on('states-set', function(jsonStates){
            console.log('states-set');
            if (master === socket.id) {
                llServerMod.sendMessage(llServer, 'states-set', jsonStates);
            }

        });

        socket.on('states-load', function(jsonStates){
            console.log('states-load');
            llServerMod.sendMessage(llServer, 'states-load');
        });

        socket.on('states-start', function(jsonStates){
            console.log('states-start');
            llServerMod.sendMessage(llServer, 'states-start');
        });

        socket.on('commands-set', function(jsonCommands){
            console.log('commands-set');
            if (master === socket.id) {
                llServerMod.sendMessage(llServer, 'commands-set', jsonCommands);
            }

        });

        socket.on('commands-load', function(jsonCommands){
            console.log('commands-load');
            eventEmitter.emit('onCommandsLoad', ioClient, socket);

        });

        socket.on('pythonScript-runChecklistItem', function(jsonPythonContent){
            console.log('pythonScript-runChecklistItem');
            if (master === socket.id) {
                llServerMod.sendMessage(llServer, 'pythonScript-runChecklistItem', jsonPythonContent);
            }

        });

        socket.on('pythonScript-start', function(scriptPath){
            console.log('pythonScript-start');
            if (master === socket.id) {
                llServerMod.sendMessage(llServer, 'pythonScript-start', scriptPath);
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
                masterLocked = false;
            }
            
            var socketIndex = clients.indexOf(socket);
            clients.splice(socketIndex, 1);
    
            if (clients.length === 0)
            {
                llServerMod.sendMessage(llServer, 'abort');
                llServerMod.sendMessage(llServer, 'states-stop');
            }
        });
    }
    else {
        socket.emit('connect_error', 'A sequence is currently being executed');
        socket.disconnect();
    }
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
                case "states":
                    ioClient.emit('states', jsonData.content);
                    break;
                case "states-load":
                    console.log("states-load");
                    ioClient.emit('states-load', jsonData.content);
                    break;
                case "states-init":
                    console.log("states-init");
                    ioClient.emit('states-init', jsonData.content);
                    break;
                case "commands-load":
                    console.log("commands-load llserver");
                    //commandsJson += jsonData.content;
                    ioClient.emit('commands-load', jsonData.content);
                    break;
                case "commands-error":
                    console.log("commands-error");
                    ioClient.emit('commands-error', jsonData.content);
                    break;
                case "abort":
                    console.log("abort from llserver");
                    eventEmitter.emit('onAbortAll', ioClient, jsonData.content);
                    break;
                case "auto-abort-change":
                    console.log("auto abort change from llserver", jsonData.content);
                    ioClient.emit('auto-abort-change', jsonData.content);
            }
        }
    }
}

function onLLServerConnect()
{
    ioClient.emit("llserver-connect");
    llServerConnected = true;

    if (clients.length > 0)
    {
        console.log('llserver-connect init');
        ioClient.emit("commands-clear");
        llServerMod.sendMessage(llServer, 'commands-load');
        llServerMod.sendMessage(llServer, 'states-load');
        llServerMod.sendMessage(llServer, 'states-start');
    }
}

function onLLServerDisconnect()
{
    ioClient.emit("llserver-disconnect");
    commandsJson = null;
    llServerConnected = false;
}

function getClientSocketById (id) {
	for(var i = 0; i < clients.length; i++) {
		if(clients[i].id === id) return clients[i];
	}
	return null;
}

app.get('/', function(req, res){
    res.sendFile(path + 'ecui.html');
	//res.sendFile(path + '404.html')
});

app.get('/pnidList', function(req, res){
    console.log(pnidManMod.getAllPnIDs());
    res.json(pnidManMod.getAllPnIDs());
});

app.get('/web_config/main', (req, res) => {
    console.log("requested ecui config");
	res.sendFile(pathMod.join(configPath, webConfigSubPath, 'ecui_config.json'))
});

app.get('/pnid_config/custom', (req, res) => {
    console.log("requested config");
	res.sendFile(pathMod.join(configPath, pnidConfigSubPath, 'config.json'))
});

app.get('/pnid_config/default', (req, res) => {
    console.log("requested default config");
	res.sendFile(pathMod.join(configPath, pnidConfigSubPath, 'defaultConfig.json'))
});

app.get('/pnid_config/thresholds', (req, res) => {
    console.log("requested thresholds definitions");
	res.sendFile(pathMod.join(configPath, pnidConfigSubPath, 'thresholds.json'))
});

app.get('/pnid_config/grafana', (req, res) => {
    res.sendFile(pathMod.join(configPath, pnidConfigSubPath, 'grafanaPanelConfig.json'));
});

app.post('/pnid', function(req, res){
    console.log(req.body.file);
    pnidManMod.setPnID(req.body.file);
    //apparently res.send is not great compared to res.sendFile because sendFile can be done asynchronously
    //and is easier on memory/garbage collecting. this is however only relevant on larger servers and we
    //prefer not storing these files on disk. still, would be nice to make a better solution
    res.send(pnidManMod.getPnID());
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});

console.log("config path", configPath);
console.log("dirname", __dirname + "/client/pnid_houbolt/client/config/");
