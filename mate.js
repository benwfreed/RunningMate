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
	Mate.findOne({ $or: [ {'mate1': username}, {'mate2': username}] }, callback);
};

//