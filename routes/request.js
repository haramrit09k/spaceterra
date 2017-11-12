// DO NOT EDIT!!!!!!!
//Import this file as a module into whatever file updates the score on your DB
var http = require("http");
var options = {
	hostname: '127.0.0.1',
	port: 3000,
	path: '',    //path used in router 
	method: 'POST',                                //request method get or post
	headers: {
		'Content-Type': 'application/json',
	}
};
//game table 
/*
Event name                - name to pass to the function
Mega Event                - megaPoints
Virtual Stock Market      - vsm
Terraverse                - terraverse
Auction it                - auctionIt
Online Treasure Hunt      - OTH
Planets Orb               - planetOrb
Deadly Exhaust Wat        - DEW
Chase Infinity            - chaseInfinity
space terra               - spaceTerra
Do or Die                 - DOD
Space Rush                - spaceRush
*/

function updateScore(game,score,username,func){   //use this only for high score
    options.path="/updateScore"
    var request = http.request(options, function(response) {
        console.log('Status: ' + response.statusCode);
        response.setEncoding('utf8');
        response.on('data', function (result) {               // on receiving data from server
            func(result);  //if result is 1, then the score has been updated successfully
        });
    });
    request.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        func("error connecting "+e.message);
    });
    var password="ahjc135kbahjd19357"
    var str='{"'+game+'":'+score+',"username":"'+username+'","password":"'+password+'"}';
    // write data to request body
    request.write(str);  // sending JSON data as specified in the header
    request.end();
}




function getScore(game,username,func){   //used to fetch high score and create leaderboard
    options.path="/getScore"
    var request = http.request(options, function(response) {
        console.log('Status: ' + response.statusCode);
        response.setEncoding('utf8');
        response.on('data', function (score) {               // on receiving data from server
            func(score);
        });
    });
    request.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        func("error connecting "+e.message);
    });
    var str='{"username":"'+username+'","game":"'+game+'"}';
    request.write(str);  // sending JSON data as specified in the header
    request.end();
}



function updateMega(username,score,func){ //increments mega points by the 'score' sent as argument
    options.path="/updateMega"
    var request = http.request(options, function(response) {
        console.log('Status: ' + response.statusCode);
        response.setEncoding('utf8');
        response.on('data', function (result) {               // on receiving data from server
            func(result); //if result is 1, mega points have been updated successfully
        });
    });
    request.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        func("error connecting "+e.message);
    });
    var password="iqwurg4609dkshiuyqr"
    var str='{"megaPoints":'+score+',"username":"'+username+'","password":"'+password+'"}';
    // write data to request body
    request.write(str);  // sending JSON data as specified in the header
    request.end();   
}



function getMega(username,func){
    options.path="/getMega"
    var request = http.request(options, function(response) {
        console.log('Status: ' + response.statusCode);
        response.setEncoding('utf8');
        response.on('data', function (score) {               // on receiving data from server
            func(score);
        });
    });
    request.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        func("error connecting "+e.message);
    });
    var str='{"username":"'+username+'"}';
    request.write(str);  // sending JSON data as specified in the header
    request.end();
}



// **** USAGE OF ALL FUNCTIONS ****

//put game name as specified in the table at the top of this file

// usage for update score
// updateScore("DEW",2000,"sidwa",function(result){ //update (high)score for deadly exhaust war for user sidwa 
//     console.log("update Done?:"+result); //result is 1 if update successful
// });

//usage for get score
// getScore("OTH","sidwa",function(score){     //get score for online treasure hunt for user sidwa
//     console.log("score:"+score);
// });

//usage for updateMega
// updateMega("sidwa",100,function(result){ //increase mega points by 10 for user sidwa
//     console.log("update Done?:"+result); //result is 1 if update successful
// });

//usage for getMega
// getMega("sidwa",function(score){
//     console.log("score:"+score);
// });




module.exports.updateScore=updateScore;
module.exports.getScore=getScore;
module.exports.updateMega=updateMega;
module.exports.getMega=getMega;