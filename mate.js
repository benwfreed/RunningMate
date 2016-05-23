var mongoose = require('mongoose');


var mateSchema = mongoose.Schema({
	mate1: {
		type: String,
		required: true
	},
	mate2: {
		type: String,
		required: true
	}
});

var Mate = module.exports = mongoose.model('Mate', mateSchema);

module.exports.makeMate = function(mate, callback) {
	Mate.create(mate, callback);
	Mate.find({}, function(err, themate) {
	});
};

module.exports.getMate = function(username, callback) {
	Mate.findOne({ $or: [ {'mate1': username}, {'mate2': username}] }, function(err, result) {
		if (err) {console.log(err);}
		else {
			if (err) {
				console.log(err);
			}
			console.log(result);
			if (result){
				var themate = result.mate1;
				console.log(themate);
				if (themate == username) {
					themate = result.mate2;
				}
			}
		}
		if (callback) {callback(themate)};
	});
};

