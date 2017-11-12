var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var _ = require('underscore');
var User = require('../models/User');
var request = require('./request');

router.get('/', function(req, res, next){
	res.render('index');
})

router.get('/get_username', function(req,res){
	var name = new Object();
	name.username = req.sess.username;
	name = JSON.stringify(name);
	res.send(name);
});

router.get('/ret_score', function(req,res,next){
	User.find({},"score username counts",{sort:{'score':'desc'}}, function(err, score){
		res.send(score);
		console.log('score sent to server');
		console.log("daa",score);
	});
});

router.post('/isdjfisjdfkshflakdjalskjd', function(req, res, next){
	var score = req.body.score;
	console.log(score);
	var username = req.sess.username;
	console.log(username);

	User.count({username: username}, function(err,count){
		if(err) throw err;
		console.log("sda "+count);

		if(count>0)
		{
			// username='Haramrit';
			//username = req.sess.username;  //for main
			User.update({username: username},{$set:{score: score}},{multi: true},function(err,user){
				if(err) throw err;
				request.updateScore("spaceTerra",score,username,function(result){
					console.log('update done?: '+result);
				});
				console.log(user);
				res.send(JSON.stringify({'msg': 'success'}));
			});
		}
		else{
			console.log('new user created');
			var new_user = new User();
			new_user.score = score;
			new_user.username = username;
			new_user.save(function(err, newuser){
				if(err){
					console.log(err);
					return res.status(500).send(JSON.stringify({'msg':'servererror'}));
				}
				else{
					console.log('score sent from index');
					request.updateScore("spaceTerra",score,username,function(result){
					console.log('update done?: '+result);
				});
					res.send(JSON.stringify({'msg':'success'}));
				}
			});
		}
	});

});


router.post('/input_count', function(req, res, next){
	var counts = req.body.counts;
	console.log(counts);
	var username = req.sess.username;
	console.log(username);

	User.count({username: username}, function(err,count){
		if(err) throw err;
		// console.log("sda "+count);

		else if(count>0)
		{
			
			User.update({username: username},{$set:{counts: counts}},{multi: true},function(err,user){
				if(err) throw err;
				});
				res.send(JSON.stringify({'msg': 'success'}));
			
		}
		else{
			console.log('new user created');
			var new_user = new User();
			new_user.counts = counts;
			new_user.username = username;
			new_user.save(function(err, newuser){
				if(err){
					console.log(err);
					return res.status(500).send(JSON.stringify({'msg':'servererror'}));
				}
				else{
					console.log('count sent from index');
					// request.updateScore("spaceTerra",score,username,function(result){
					// console.log('update done?: '+result);
				// });
					res.send(JSON.stringify({'msg':'success'}));
				}
			});
		}
	});

});

router.post('/input_mega', function(req,res,next){
	var username = req.sess.username;
	var point = req.body.point;

	console.log(point);
	console.log(username); 

request.updateMega(username,point,function(result){ //increase mega points by 10 for user sidwa
    console.log("Mega update Done?:"+result); //result is 1 if update successful
});
})

module.exports = router;
