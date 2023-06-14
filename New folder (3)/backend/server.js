const express = require("express");
const app = express();
const cors = require('cors');
const dotenv = require("dotenv");
dotenv.config();
const PORT = process.env.PORT || 5000;
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");


app.use(cors());
app.use(express.json());

connectDB();

app.get("/",(req,res)=>{
    res.send("API is Running");
});


app.use('/api/user',userRoutes);
app.use('/api/chat',chatRoutes);
app.use('/api/message',messageRoutes);


app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT,()=>{
    console.log(`Server Strarted on PORT ${PORT}`);
});


const io = require('socket.io')(server,{
    pingTimeout: 60000,
    cors:{
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});


let onlineUsers = [];

io.on("connection",(socket)=>{
  console.log(socket.id);
    console.log("connected to socket.io");
    socket.on("setup", (newUserId) => {
        // io.in(newUserId).socketsLeave(newUserId);
        console.log(io.sockets.adapter.rooms.get(newUserId));
        if(!(io.sockets.adapter.rooms.get(newUserId)))
        {
          socket.join(newUserId);
          if (!onlineUsers.some((user) => user.id === newUserId)) {
            onlineUsers.push({
               id: newUserId,
               socketId: socket.id 
            });
          }
          io.emit("get online users", onlineUsers);
        }
        socket.emit("connected");
      });

      socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
      });


      socket.on("leave chat", (room) => {
        socket.leave(room);
        console.log("User leaved Room: " + room);
      });

      socket.on("typing", (room) => socket.broadcast.to(room).emit("typing"));
      socket.on("stop typing", (room) => socket.broadcast.to(room).emit("stop typing"));



      socket.on("new message", (newMessageRecieved) => {
        console.log(newMessageRecieved);
        var chat = newMessageRecieved.chat;
    
        if (!chat.users) return console.log("chat.users not defined");
    
        chat.users.forEach((user) => {
          if (user._id !== newMessageRecieved.sender._id ){
            socket.in(user._id).emit("message recieved", newMessageRecieved);
          }
        });
      });

      socket.on("send video call", (userId,peerId) => {
        
      });

      
      socket.on("logout", (room) => {
        socket.leave(room);
        onlineUsers = onlineUsers.filter((user) => user.id !== room);
        console.log("User leaved Room: " + room);
        io.emit("get online users", onlineUsers);
      });

      socket.on("disconnect", () => {
        // remove user from active users
        onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
        console.log("User Disconnected", onlineUsers);
        // send all active users to all users
        io.emit("get online users", onlineUsers);
      });
});

