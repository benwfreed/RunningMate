var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var mongo = require('mongodb');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var routes = require('./routes/index');
var users = require('./routes/users');
var credentials = require('./credentials.js');

var app = express();

// view engine setup
var handlebars = require('express-handlebars');
app.engine('handlebars', handlebars({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
	name: 'session-id',
    secret: credentials.cookieSecret,
    resave: true,
    saveUninitialized: true
}));

passport.use(new LocalStrategy(function(username, password, done){
	for (var u in users) {
		if (username == users[u].username && password == users[u].password){
			return done(null, users[u]);
		}
	}
	return done(null, false, {message: 'Unable to login'});
}
		
));

app.use(function(req, res, next) {
    console.log("middleware 1");
	next();	
});

app.use(function(req, res, next) {
	console.log("middleware 2");
	next();
})

app.use('/', routes);
app.use('/users', users);

//mongoose.connect('mongodb://localhost:27017/runningmate');

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
