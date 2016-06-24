var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var userSchema = mongoose.Schema({
	username: String,
	password: String,
	fitbitId: String,
	accessToken: String,
	refreshToken: String,
	email: String,
	city: String,
	active: Boolean,
	runcity: String,
	time: Number,
	distance: Number,
	notes: String,
	runstatus: String,
	lastrun: {
		runcity: String,
		time: Number, 
		distance: Number, 
		notes: String,
		mate: {
			username: String,
			runcity: String,
			time: Number,
			distance: Number,
			notes: String,
			runstatus: String
		}
	},
	mate: {
		username: String,
		runstatus: String,
		runcity: String,
		time: Number,
		distance: Number,
		notes: String,
		results: {
			runcity: String,
			time: Number,
			distance: Number,
			notes: String,
			calories: Number,
			fitbitdistance: Number
		}
	},
	results: {
		runcity: String,
		time: Number, 
		distance: Number, 
		notes: String,
		calories: Number,
		fitbitdistance: Number
	}
});

var User = module.exports = mongoose.model('User', userSchema);


module.exports.getUsers = function(callback, limit) {
	User.find(callback).limit(limit);
}

module.exports.fitbitLogin = function(fitbitId,  displayName, callback) {
	console.log('here1');
	User.findOne({fitbitId: fitbitId}, function (err, user) {
		if (err) {console.log(err)};
		if (user) {
			callback();
		}
		else {
			console.log('here2');
			var newuser = newFitbitUser;
			setUsername(displayName, function(newUsername) {
				newuser.fitbitId = fitbitId;
				newuser.username = newUsername;
				User.create(newuser, function(err, doc) {
					if(err) {console.log(err)};
					console.log(doc);
					callback();
				});
			});
		}
	});
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

module.exports.findMate = function(postinguser, callback) {
	User.findOne({'mate.username': "", time: postinguser.time,
	username: {$ne: postinguser.username}}, function(err, dbuser) {
		if (dbuser) {
			postinguser.mate = {
				username: dbuser.username,
				runstatus: dbuser.runstatus,
				runcity: dbuser.runcity,
				time: dbuser.time,
				distance: dbuser.distance,
				notes: dbuser.notes
			};
			dbuser.mate = {
				username: postinguser.username,
				runstatus: postinguser.runstatus,
				runcity: postinguser.runcity,
				time: postinguser.time,
				distance: postinguser.distance,
				notes: postinguser.notes
			};
			postinguser.save(function(err, doc, success) {
				if (err) console.log(err);
				//console.log(doc);
				//console.log(success);
			});
			dbuser.save(function(err, doc, success) {
				if (err) console.log(err);
				//console.log(doc);
				//console.log(success);
			});
		}
		else{
			console.log("no mate yet");
		}
		callback();
	});
}

var newFitbitUser = {
	username: "", 
	password: "",
	city: "", 
	email: "", 
	active: false,
	runcity: "",
	time: 0,
	distance: 0,
	notes: "",
	runstatus: "Leaving Soon",
	lastrun: {
		city: "",
		time: 0, 
		distance: 0, 
		notes: "",
		mate: {
			username: "",
			time: 0,
			distance: 0,
			city: "",
			notes: ""
		}
	},
	mate: {
		username: "",
		runstatus: "",
		runcity: "",
		time: "",
		distance: "",
		notes: "",
		lastrun: {
			matename: "",
			matecity: "",
			matetime: "",
			matedistance: "",
			matenotes: "",
			runstatus: "Leaving Soon"
		}
	},
};

var setUsername = function(aName, callback) {
	console.log('aName: '+aName);
	var potentialName = aName;
		console.log(potentialName);
		User.findOne({username: potentialName}, function(err, user) {
			if (err) {console.log(err)};
			console.log(user);
			if (user) {
				pieces = potentialName.split(" ");
				if (isNaN(pieces[1])) {
					potentialName = potentialName+' 1';
				}
				else {
					newPotentialName = pieces[0];
					newPotentialName += " " + ++pieces[1];
					potentialName = newPotentialName;
				}
			} else {
				console.log('true');
				callback(potentialName);
			}
		});
};
