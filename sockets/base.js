module.exports=function(io){
	io.on('connection',function(socket){
		console.log("user is connected");
	
		//whenever connection is on then use these events
		socket.on('newMsg',function(data){
			console.log(data);
			socket.emit('newMessage',{'msg':data.msg});
		});

	});
}