var length = 0;
var readyForMessage = true;

const MAX_MSG_LENGTH = 65536-1; //2^16 - 1
const RECEIVE_STATES = {
    INIT: 0,
    HEADER: 1,
    MESSAGE: 2
};
const HEADER_SIZE = 2;

var stateDataBuffer = Buffer.allocUnsafe(0);

let currReceiveState = RECEIVE_STATES.HEADER;
let prevReceiveState = RECEIVE_STATES.INIT;

module.exports = {

    onLLServerConnect: function(client, msgRecvCallback, onDisconnectCallback) {

        console.log('Client connect. Client local address : ' + client.localAddress + ':' + client.localPort + '. client remote address : ' + client.remoteAddress + ':' + client.remotePort);

        //only use when assuming only string messages
        //client.setEncoding('ascii');

        client.setTimeout(1000);

        // When receive client data.
        client.on('data', function (data) {

            stateDataBuffer = Buffer.concat([stateDataBuffer, data]);
            
            do {
                //while header already fetched
                if (stateDataBuffer.length >= HEADER_SIZE)
                {
                    switch (currReceiveState)
                    {
                        case RECEIVE_STATES.HEADER:
                            if (stateDataBuffer.length >= HEADER_SIZE) {

                                let header = stateDataBuffer.slice(0, 2);
                                length = header.readUInt16BE(0);
                                stateDataBuffer = stateDataBuffer.slice(2);

                                prevReceiveState = currReceiveState;
                                currReceiveState = RECEIVE_STATES.MESSAGE;
                            }

                        case RECEIVE_STATES.MESSAGE:

                            if (stateDataBuffer.length >= length) {

                                let payloadBuffer = stateDataBuffer.slice(0, length);
                                stateDataBuffer = stateDataBuffer.slice(length);
                                msgRecvCallback(payloadBuffer.toString('ascii'));

                                prevReceiveState = currReceiveState;
                                currReceiveState = RECEIVE_STATES.HEADER;

                            } else {
                                // console.log("message not complete, waiting for data...");
                            }

                            break;
                        default:
                            console.error("state not supported");
                            break;
                    }
                }
            } while(stateDataBuffer.length > 0 && currReceiveState == RECEIVE_STATES.HEADER);
        });

        // When client disconnects.
        client.on('end', function () {
            console.log('llserver disconnected.');
            onDisconnectCallback();
            
        });

        // When client timeout.
        client.on('timeout', function () {
            console.log('Client request time out. ');
        });

        client.on('error', function(err) {
             // process error here
             console.log("llserver error: " + err);
         });

        return client;
    },

    onCreateTCP: function(server) {

        // Get server address info.
        var serverInfo = server.address();

        var serverInfoJson = JSON.stringify(serverInfo);

        console.log('TCP server listen on address : ' + serverInfoJson);

        server.on('close', function () {
            console.log('TCP server socket is closed.');
        });

        server.on('error', function (error) {
            console.error(JSON.stringify(error));
        });
    },

    sendMessage: function(client, type, content={})
    {
        const Buffer = require('buffer').Buffer;

        if (client !== undefined)
        {
            let msg = {};
            msg.type = type;
            msg.content = content;

            let strMsg = JSON.stringify(msg) + '\n';
            let strMsgLen = strMsg.length;

            if (strMsgLen <= MAX_MSG_LENGTH)
            {
                let LSB = strMsgLen & 0x00FF;
                let MSB = strMsgLen >> 8;

                // console.log("SEND| MSB:", MSB, "LSB:", LSB);

                console.log("------------------");
                console.log("send header:", Buffer.from([MSB, LSB]));
                console.log("send msg:", strMsg);
                console.log("------------------");

                var msgBuffer = Buffer.concat([Buffer.from([MSB, LSB]),Buffer.from(strMsg, 'ascii')])
                client.write(msgBuffer);
            }
        }
        else
        {
            console.error("cannot send to llserver, no connection established");
        }
    }
};