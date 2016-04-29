var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Running Mate' });
});

router.get('/runnerlist', function(req, res) {
  var MongoClient = mongodb.MongoClient;
  
  var url = 'mongodb://localhost:27017/runningmate';
  
  MongoClient.connect(url, function(err, db) {
      if (err) {
          console.log('Cannot connect to server', err);
      } else {
          console.log("Connection Established");
          
          var collection = db.collection('runners');
          
          collection.find({}).toArray(function(err, result) {
              if (err) {
                  res.send(err);
              } else if (result.length) {
                  res.render('runnerlist', {
                      "title" : "Running Mate",
                      "runnerlist": result
                  });
              } else {
                  res.send('No documents found');
              }
              
              db.close();
          });
      }
  });
});

router.get('/newrunner', function(req, res) {
    res.render('newrunner', {title: 'Add Runner'});
});

router.post('/addrunner', function(req, res) {
    var MongoClient = mongodb.MongoClient;
    
    var url = 'mongodb://localhost:27017/runningmate';
    
    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('Cannot connect to server', err);
        } else {
            console.log('Connected to server');
            
            var collection = db.collection('runners');
            
            var runner1 = {runner: req.body.runner, leavingin: req.body.leavingin, 
                city: req.body.city, state: req.body.state, 
                gender: req.body.gender, distance: req.body.distanced}; 
            
            collection.insert([runner1], function(err, result) {
                if (err) {
                    console.log(err);
                } else {
                    res.redirect("runnerlist");
                }
                db.close();
            });
        }
    });
});

module.exports = router;
