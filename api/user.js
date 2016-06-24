var User = require('../user');

module.exports.getAllUsers = function(req, res) {
	User.find(function(err, user) {
		if (err) {
			res.send(err);
		}
		res.json({user});
	});
};