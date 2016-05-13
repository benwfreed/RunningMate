var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var userSchema = mongoose.Schema({
	username: {
		type: String,
	},
	password: {
		type: String,
		required: true
	},
	email: {
		type: String
	},
	firstname: String
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
