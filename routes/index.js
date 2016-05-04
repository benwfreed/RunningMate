var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');
var mongoose = require('mongoose');

Runner = require('./../runner.js');

var url = 'mongodb://localhost:27017/runningmate';
mongoose.connect(url);
var db = mongoose.connection;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Running Mate' });
  //console.log(req.headers);
});

router.get('/login', function(req, res, next) {
	res.render('login', {title: 'Running Mate'});
});

router.post('/login', function(req, res) {
	console.log(req.body.username);
	console.log(req.body.password);
	res.redirect('/');
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

router.get('/newrunner', function(req, res) {
    res.render('newrunner', {title: 'Add Runner'});
});

router.post('/addrunner', function(req, res) {			
            
	var runner1 = {runner: req.body.runner, leavingin: req.body.leavingin, 
                city: req.body.city, state: req.body.state, 
                gender: req.body.gender, distance: req.body.distanced};
				
	Runner.addRunner(runner1, function() {
		res.redirect('/runnerlist');
	});
});

module.exports = router;
