var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');
var mongoose = require('mongoose');
var passport = require('passport');
var https = require('https');
var http = require('http');
var expressValidator = require('express-validator');
var LocalStrategy = require('passport-local').Strategy;
var FitBitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;
var flash = require('connect-flash');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Runner = require('./../runner.js');
User = require('./../user.js');
Mate = require('./../mate.js');
var users = require('../api/user.js');
var FitBit = require('./../fitbit.js');

router.get('/', ensureAuthenticate, function(req, res, next) {
		res.render('index', {title: 'Running Mate'});
});

function ensureAuthenticate(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	}
	else {res.redirect('/login')};
};

//LOGIN

router.get('/login', function(req, res, next) {
	res.render('login', {noflash: true, nocontainer: true});
});

router.post('/login', passport.authenticate('local', {
	noflash: true,
	succesRedirect: '/',
	failureRedirect: '/login',
	failureFlash: true}), function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	
	req.checkBody('username', 'Please enter a username.').notEmpty();
	req.checkBody('password', 'Please enter a password.').notEmpty();
	
	var errors = req.validationErrors();
	
	if (errors) {
		res.render('login', {
			errors: errors
		});
	} else {
		req.flash('success_msg', 'You are now logged in!');
		res.redirect('/');
	}
});

//REGISTRATION

router.get('/register', function(req, res, next) {
	res.render('register', {nocontainer: true, noflash: true});
});

router.post('/register', function(req, res) {
	req.checkBody('newusername', 'Please provide a username.').notEmpty();
	req.checkBody('newpassword', 'Please provide a password.').notEmpty();
	
	var errors = req.validationErrors();
	if (errors) {
		console.log('errors');
		res.render('register', {
			nocontainer: true,
			noflash: true,
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
				User.addUser(newUser, function(err, user) {
					if(err) {console.log(err)};
					User.findOne({username: newUser.username})
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

//LOGOUT

router.get('/logout', function(req, res) {
	req.logout();
	req.flash('success_msg', 'You are now logged out.');
	res.redirect('/login');
});

router.get('/newrunner', function(req, res) {
    res.render('newrunner', {title: 'Add Runner'});
});

//PRE-RUN FORM

router.post('/runform', function(req, res, next) {
	
	User.findOne({username: req.user.username}, function(err, user) {
		if (err) console.log(err);
		if (user.active) {
			req.flash('warning-msg', 'You\'re original run has not been changed.');
			res.redirect('/run');
		} else {
			User.findOneAndUpdate(
				{username: req.user.username}, 
				{$set: 
					{
					runcity: req.body.city, 
					time: req.body.time,
					distance: req.body.distance,
					notes: req.body.notes,
					runstatus: 'Leaving Soon',
					active: true
					}
				},
				{new: true}, 
				function(err, user) {
				User.findMate(user, function() {
					res.redirect('/run');
				});
			});	
		}
	});
});

//RUN

router.get('/run', function(req, res) {
	User.findOne({username:req.user.username}, function(err, user) {
		if (user.time <= 0 && user.distance <= 0) {
			req.flash('warning_msg', 'You didn\'t fill out your Running Mate form yet!');
			res.redirect('/');
		} else {
			res.render('run', {
				title: 'Run',
				info: user
			});
		}
	});
});

//GIVE RESULTS

router.get('/giveresults', ensureAuthenticate, function(req, res) {
	User.findOne({username: req.user.username}, function(err, user) {
		res.render('giveresults', {
			user: user.username,
			mate: user.mate.username
		});
	});
});

router.post('/giveresults', ensureAuthenticate, function(req, res) {
	User.findOne({username: req.user.username}, function(err, user) {
		var results = {
			runcity: user.runcity, 
			time: req.body.time,
			distance: req.body.distance,
			notes: req.body.notes
		};
		user.results = results;
		user.save();
		User.findOne({'mate.username': req.user.username}, function(err, mate) {
				user.lastrun = results;
				user.lastrun.mate = mate.results;
				user.lastrun.mate.username = mate.username;
				user.save();
				mate.lastrun = mate.results;
				mate.lastrun.mate = results;
				mate.lastrun.mate.username = user.username;
				mate.mate.results = results;
				mate.save();
				if (user.fitbitId) {
					var options = {
					    host: 'api.fitbit.com',
					    port: 443,
					    path: '/1/user/-/activities/date/today.json',
					    method: 'GET',
					    headers: {
					        'Content-Type': 'application/json',
							'Authorization': 'Bearer ' + req.user.accessToken
					    }
					};
					FitBit.getJSON(options,
				        function(statusCode, result) {
							user.results.calories = result.summary.activityCalories;
							user.results.fitbitdistance = result.summary.distances[1].distance;
							user.save();
							mate.mate.results.calories = result.summary.activityCalories;
							mate.mate.results.fitbitdistance = result.summary.distances[1].distance;
							mate.save();
							res.redirect('/seeresults');
					});
				} else {
					res.redirect('/seeresults');
				}
		});
	});
});

//SEE RESULTS

router.get('/seeresults', ensureAuthenticate, function(req, res) {
	User.findOne({username: req.user.username}, function(err, user) {
			res.render('seeresults', {
			username: req.user.username,
			title: 'Results',
			results: user.results,
			fitbitcalories: user.results.calories,
			fitbitdistance: user.results.fitbitdistance,
			matename: user.mate.username,
			materesults: user.mate.results,
			matefitbitcalories: user.mate.results.calories,
			matefitbitdistance: user.mate.results.fitbitdistance
			});
	});
});

//This route is for unit testing

router.get('/unittest', function(req, res) {
	
	//Unit testing the FitBit API...
	
	var options = {
	    host: 'api.fitbit.com',
	    port: 443,
	    path: '/1/user/-/activities/date/2016-06-20.json',
	    method: 'GET',
	    headers: {
	        'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + req.user.accessToken
	    }
	};
	
	FitBit.getJSON(options,
        function(statusCode, result) {
            console.log("onResult: (" + statusCode + ")" + JSON.stringify(result));
            res.statusCode = statusCode;
            res.send(result);
     });
});

module.exports = router;
