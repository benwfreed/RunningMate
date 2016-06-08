var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var userSchema = mongoose.Schema({
	active: Boolean,
	username: String,
	password: String,
	email: String,
	city: String,
	lastrun: {
		city: String,
		time: String, 
		distance: String, 
		notes: String
	},
	matelastrun: {
		matename: String,
		matecity: String,
		matetime: String,
		matedistance: String,
		matenotes: String
	}
});

var User = module.exports = mongoose.model('User', userSchema);


module.exports.getUsers = function(callback, limit) {
	User.find(callback).limit(limit);
}

module.exports.addUser = function(user, callback) {
	bcrypt.genSalt(10, function(err, salt) {
		bcrypt.hash(user.password, salt, function(err, hash) {
			user.password = hash;
			User.create(user, callback);
		});
	});
}

module.exports.getUserByUsername = function(username, callback) {
	var query = {username: username};
	User.findOne(query, callback);
}

module.exports.comparePassword = function(candidatePassword, hash, callback) {
	bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
		if (err) console.log(err);
		callback(null, isMatch);
	});
}
