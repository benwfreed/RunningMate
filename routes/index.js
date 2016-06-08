var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');
var mongoose = require('mongoose');
var passport = require('passport');
var expressValidator = require('express-validator');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

Runner = require('./../runner.js');
User = require('./../user.js');
Mate = require('./../mate.js');

router.get('/', ensureAuthenticate, function(req, res, next) {
	Runner.findOne({username: req.user.username}, function(err, runner) {
		if (err) console.log(err);
		if (runner) {
			req.flash('warning_msg', 'You already committed to run. Please cancel this run before starting another.');
			res.redirect('/run');
		} else {
			res.render('index', {title: 'Running Mate'});
		}
	});
});

function ensureAuthenticate(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	}
	else {res.redirect('/login')};
};

router.get('/login', function(req, res, next) {
	res.render('login', {title: 'Running Mate'});
});

router.post('/login', passport.authenticate('local', {
	succesRedirect: '/',
	failureRedirect: '/login',
	failureFlash: true}), function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	
	req.checkBody('username', 'Please enter username').notEmpty();
	req.checkBody('password', 'Please enter password').notEmpty();
	
	var errors = req.validationErrors();
	
	if (errors) {
		res.render('login', {
			title: 'Running Mate', 
			errors: errors
		});
	} else {
		req.flash('success_msg', 'You are now logged in!');
		res.redirect('/');
	}
});

router.get('/register', function(req, res, next) {
	res.render('register', {title: 'Running Mate'});
});

router.post('/register', function(req, res) {
	req.checkBody('newusername', 'Please provide username.').notEmpty();
	req.checkBody('newpassword', 'Please provide password.').notEmpty();
	
	var errors = req.validationErrors();
	if (errors) {
		console.log('errors');
		res.render('register', {
			title: 'Running Mate',
			errors: errors
		});
	} else {
		User.findOne({username: req.body.newusername}, function(err, user){
			if (user) {
				req.flash('error_msg', 'Username is taken.');
				res.redirect('/register');
			}
			else {
				var newUser = {
					username: req.body.newusername, 
					password: req.body.newpassword,
					city: req.body.city, 
					email: req.body.email, 
					lastrun: {
						city: "",
						time: "",
						distance: "",
						notes: ""
					},
					matelastrun: {
						matecity: "",
						matetime: "",
						matedistance: "",
						matenotes: ""
					}
				};
				User.addUser(newUser, function(err, user) {
					if(err) {console.log(err)};
					console.log(user);
				});
				req.login(newUser, function(err) {
					if(err) {console.log(err);}
				});
				req.flash('success_msg', 'You are now registered and logged in!');
				res.redirect('/');
			}
		});
	}
	
});

router.get('/runnerlist', function(req, res) {
  
	Runner.getRunners(function(err, runners){
		if(err) {
			console.log(err);
		}
		res.render('runnerlist', {
			"title": "Running Mate",
			"runnerlist": runners
		});
	});
});

router.get('/logout', function(req, res) {
	req.logout();
	req.flash('success_msg', 'You are logged out');
	res.redirect('/login');
});

router.get('/newrunner', function(req, res) {
    res.render('newrunner', {title: 'Add Runner'});
});

router.post('/addrunner', function(req, res, next) {
	
	Runner.findOne({username: req.user.username}, function(err, runner) {
		if (err) console.log(err);
		if (runner) {
			res.redirect('/run');
		} else {
			var blankself = {
				city: "",
				time: "",
				distance: "",
				notes: ""
			};
	
			var blankmate = {
				matename: "",
				matecity: "",
				matetime: "",
				matedistance: "",
				matenotes: ""
			};
	
	
	
			User.findOneAndUpdate(
				{username: req.user.username}, 
				{$set: 
					{
					lastrun: blankself, 
					matelastrun: blankmate,
					active: true
					}
				},
				{new: true}, 
				function(err, user) {
				console.log(user.matelastrun);
			});
	
            
			var newRunner = {username: req.user.username, duration: req.body.gettingBackIn, 
				city: req.body.city, distance: req.body.distance, notes: req.body.notes, 
			    runstatus: 'Leaving Soon'};
		
			Runner.findMate(newRunner, function(potentialmate) {
				res.redirect('/run');
			});		
		}
	});
});

router.get('/run', function(req, res) {
	Runner.getRunner(req.user.username, function(err, runner) {
		if (!runner) {
			req.flash('warning_msg', 'You didn\'t fill out your Running Mate form yet!');
			res.redirect('/');
		} else {
			console.log(runner.mate);
			res.render('run', {
				title: 'Run',
				mate: runner.mate
			});
		}
	});
});

router.get('/giveresults', ensureAuthenticate, function(req, res) {
	Runner.getRunner(req.user.username, function(err, runner) {
		res.render('giveresults', {
			runner: runner
		});
	});
});

router.post('/giveresults', ensureAuthenticate, function(req, res) {
	Runner.findOne({username: req.user.username}, function(err, runner) {
		if (runner) var city = runner.city;
		var lastrun = {
			city: city,
			time: req.body.time,
			distance: req.body.distance,
			notes: req.body.notes
		};
		var matelastrun = {
			matename: req.user.username,
			matecity: city,
			matetime: req.body.time,
			matedistance: req.body.distance,
			matenotes: req.body.notes
		};
		User.findOneAndUpdate({username: req.user.username}, {lastrun: lastrun}, {new: true}, function(err, user) {
			console.log(user.username+' lastrun updated.');
			User.findOneAndUpdate({username: runner.mate}, {matelastrun: matelastrun}, {new: true}, function(err, mate) {
				console.log(mate.username+' matelastrun updated.');
				Runner.remove({username: req.user.username}, function(err, removed) {
					console.log(req.user.username+' removed from Runners');
				});
				res.render('seeresults', {
					title: 'Results',
					lastrun: lastrun,
					matelastrun: user.matelastrun
				});
			});
		});
	});
});

router.get('/seeresults', ensureAuthenticate, function(req, res) {
	User.findOne({username: req.user.username}, function(err, user) {
		console.log(user.email);
		res.render('seeresults', {
			title: 'Results',
			lastrun: user.lastrun,
			matelastrun: user.matelastrun
		});
	});
});


module.exports = router;
