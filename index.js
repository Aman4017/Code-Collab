
const express = require("express")
const app = express();
const http = require("http");
const {Server} = require("socket.io");
const ACTIONS = require("./Actions");

// 
const bodyParser = require('body-parser');
const cors = require('cors');
const compiler = require('compilex');

// const ser = express();
app.use(bodyParser.json());
app.use(cors());
  

const option = { stats: true }; 
compiler.init(option);

app.post('/editor', (req, res) => {
    const { code, input, language } = req.body;

    

    try {
        if(language=="cpp" || language=='c'){
            if(!input){
                var envData = { OS : "windows" , cmd : "g++", options:{timeout:10000}}; // (uses g++ command to compile )
                //else
                compiler.compileCPP(envData , code , function (data) {
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output: "error"})
                    }
                });
            }
            else{
                //if windows  
                var envData = { OS : "windows" , cmd : "g++", options:{timeout:10000}}; // (uses g++ command to compile )
                compiler.compileCPPWithInput(envData , code , input , function (data) {
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output: "error"})
                    }
                });
            }
        }
        else if(language=="java"){
            if(!input){
                //if windows  
                var envData = { OS : "windows"}; 
                compiler.compileJava( envData , code , function(data){
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output: "error"})
                    }
                }); 
            }
            else{
                //if windows  
                var envData = { OS : "windows"}; 
                compiler.compileJavaWithInput( envData , code , input ,  function(data){
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output: "error"})
                    }
                });
            }
        }
        else if(language=="python"){
            if(!input){
                //if windows  
                var envData = { OS : "windows"}; 
                compiler.compilePython( envData , code , function(data){
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output: "error"})
                    }
                }); 
            }
            else{
                //if windows  
                var envData = { OS : "windows"};  
                compiler.compilePythonWithInput( envData , code , input ,  function(data){
                    if(data.output){
                        res.send(data);
                    }
                    else{
                        res.send({output: "error"})
                    }        
                });
            }
        }
        else {
            res.json({output: "Unsupported Language"});
        }
    } catch (error) {
        
    }  
});

// 

const server = http.createServer(app);
const io = new Server(server);


const userSocketMap = {};
function getAllConnectedClients(rooId){

    return Array.from(io.sockets.adapter.rooms.get(rooId) || []).map(
        (socketId) => {
            return {
                socketId,
                userName: userSocketMap[socketId],
            }
        }
    )
}


io.on('connection', (socket)=>{
    console.log("Socket Connected: ", socket.id);
    socket.on(ACTIONS.JOIN, ({rooId, userName})=>{
        userSocketMap[socket.id] = userName;
        socket.join(rooId);
        const clients = getAllConnectedClients(rooId);
        clients.forEach(({socketId})=>{
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                userName,
                socketId: socket.id,
            });
        });
    });



    socket.on(ACTIONS.CODE_CHANGE, ({roomId, code})=>{
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {code});
    })

    socket.on(ACTIONS.SYNC_CODE, ({socketId, code})=>{
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, {code});
    })




    socket.on('disconnecting', ()=>{
        const rooms = [...socket.rooms];
        rooms.forEach((rooId)=>{
            socket.in(rooId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                userName: userSocketMap[socket.id],
            });
        });

        delete userSocketMap[socket.id];
        socket.leave();
    });


    socket.on("user-call", ({to, offer})=>{
        io.to(to).emit("incomming-call", {from:socket.id, offer});
    });

    socket.on('call-accepted', ({to, ans})=>{
        io.to(to).emit("call-accepted", {from:socket.id, ans});
    });

    socket.on('peer-nego-needed', ({to, offer})=>{
        console.log("Offer to server is: ", offer);
        io.to(to).emit("peer-nego-needed", {from: socket.id, offer});
    });

    socket.on('peer-nego-done', ({to, ans})=>{
        console.log("Ans to server is: ", ans);
        io.to(to).emit('peer-nego-final', {from: socket.id, ans});
    })

});

const PORT = process.env.PORT || 8080;

server.listen(PORT, ()=> console.log(`Listening on port ${PORT}`));