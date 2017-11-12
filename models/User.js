var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    	score: {
        type: Number
    },

    username: {
    	type: String,
    	unique:true
    },

    counts:{
    	type: Number,
    	default: 0
    }
});

var User = mongoose.model('scores', userSchema);
module.exports = User;