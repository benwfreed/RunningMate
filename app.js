var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var passportSocketIo = require('passport.socketio');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var flash = require('connect-flash');
var expressValidator = require('express-validator');
var mongoose = require('mongoose');
var mongo = require('mongodb');
var url = 'mongodb://localhost:27017/runningmate';
mongoose.connect(url);
var db = mongoose.connection;
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FitbitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;
var bcrypt = require('bcryptjs');

User = require('./user.js');
Runner = require('./runner.js');
Mate = require('./mate.js');

var routes = require('./routes/index');
var users = require('./routes/users');
var credentials = require('./credentials.js');

server.listen(3000);



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

var sessionStore = new (require('express-sessions'))({
		storage: 'mongodb',
		instance: mongoose,
		host: 'localhost',
		port: 27017,
		db: 'runningmate',
		collection: 'sessions',
		expire: 86400
});

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
	//name: 'session-id',
    secret: credentials.cookieSecret,
	store: sessionStore,
    resave: true,
    saveUninitialized: true
}));


app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use(function (req, res, next) {
	res.locals.success_msg = req.flash('success_msg');
	res.locals.error_msg = req.flash('error_msg');
	res.locals.warning_msg = req.flash('warning_msg');
	res.locals.error = req.flash('error');
	res.locals.user = req.user;
	next();
});

app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

passport.use(new LocalStrategy(function(username, password, done){
	User.getUserByUsername(username, function(err, user) {
		if (err) {console.log(err)};
		if (!user) {
			return done(null, false, {message: 'Sorry! The username provided is not in our records.'});
		}
		User.comparePassword(password, user.password, function(err, isMatch) {
			if (err) {console.log(err)};
			if (isMatch) {
				return done(null, user);
			} else {
				return done(null, false, {message: 'Sorry! The password provided is incorrect.'})
			}
		});
	});
}));

const CLIENT_ID = '227V4J';
const CLIENT_SECRET = '377cb66591da54119334ce7c8ba57129';

app.use(passport.initialize());

var fitbitStrategy = new FitbitStrategy({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  scope: ['activity','heartrate','location','profile'],
  callbackURL: "http://localhost:3000/auth/fitbit/callback"
}, function(accessToken, refreshToken, profile, done) {
  // TODO: save accessToken here for later use
	
	
	User.fitbitLogin(profile.id, profile.displayName, function() {
		User.findOne({fitbitId: profile.id}, function(err, user) {
			user.accessToken = accessToken;
			user.refreshToken = refreshToken;
			user.save();
		    done(null, {
		      accessToken: accessToken,
		      refreshToken: refreshToken,
		      profile: profile,
		  	  username: user.username
		    });
		});
	});
});

passport.use(fitbitStrategy);

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});


var fitbitAuthenticate = passport.authenticate('fitbit', {
  successRedirect: '/auth/fitbit/success',
  failureRedirect: '/auth/fitbit/failure'
});

app.use('/', routes);
app.use('/users', users);



app.get('/auth/fitbit', fitbitAuthenticate);
app.get('/auth/fitbit/callback', fitbitAuthenticate);

app.get('/auth/fitbit/success', function(req, res, next) {
  
  console.log(req.user.profile.id);
  res.redirect('/');
});

/*
function autoroute(req, res, next) {
	console.log('middleware');
	if (req.user) {
		User.findOne({username: req.user.username}, function(err, user) {
			if (user.active) {
				if (true) {
					Runner.findOne({username: req.user.username}, function(err, runner) {
						if (err) console.log(err);
						if (runner && runner.runstatus === 'Run Completed!') {
							if (req.url != '/giveresults') res.render('giveresults', {
								runner: runner
							});
						}
						else if (req.url != '/run') res.run('run', {
							title: 'Run',
							mate: runner.mate
						});
					});
				} else {
					res.render('/seeresults', {
						title: 'Results',
						lastrun: user.lastrun,
						matelastrun: user.matelastrun
					});
				}
			}
		});
	}
	else next();
}
*/



io.use(passportSocketIo.authorize({
	secret: credentials.cookieSecret,
	store: sessionStore,
	fail: onAuthorizeFail,
}));


function onAuthorizeFail(data, message, error, accept){
  // error indicates whether the fail is due to an error or just a unauthorized client
  if(error)  {
	  throw new Error(message);
	  console.log(message);
  }
  // send the (not-fatal) error-message to the client and deny the connection
  return accept(new Error(message));
}
//var namespace = io.of('One');
io.of('/').on('connection', function(socket) {
	console.log(socket.request.user.username+' connected');
	socket.join(socket.request.user.username);
	User.findOne({'mate.username': socket.request.user.username}, function(er, user) {
		console.log('inside find');
		if (user) {
			console.log('found');
			console.log(user.username);
			io.to(user.username).emit('matefeedback', {
				mate: user.mate
			});
			io.to(socket.request.user.username).emit('statusfeedback', {
				runstatus: user.runstatus
			});
			/*Runner.getRunner(runner.mate, function(er, themate) {
				io.to(socket.request.user.username).emit('matefeedback', {
					mate: themate,
				});
				if (themate) {
					io.to(themate.username).emit('statusfeedback', {
						runstatus: themate.runstatus
					});
				}
			});*/
		}
	});
	
	socket.on('mateinfo', function(data) {
		console.log(data);
		if (data.matename) {
			Runner.getRunner(data.matename, function(er, runner) {
				console.log(runner);
				socket.join(data.matename);
				io.to(data.matename).emit('matefeedback', {
					room: data.matename,
					mate1: data.myname, 
					mate2: data.matename,
					mate1details: runner
				});
			});
		} else {
			socket.join(data.myname);
			io.to(data.myname).emit('matefeedback', {
				room: data.myname,
				mate1: data.myname, 
				mate2: null
			});
		}
	});
	
	socket.on('mateupdate', function(data) {
		console.log('received mate update from '+socket.request.user.username);
		console.log(data);
		User.findOneAndUpdate({'mate.username': socket.request.user.username}, {$set: {'mate.runstatus': data.runstatus}}, 
			{new: true}, function(err, updatereceiver) {
		    User.update({username: socket.request.user.username}, {$set: {'runstatus': data.runstatus}}, function (err) {
		    	if (err) console.log(err);
		    });
			io.to(updatereceiver.username).emit('matefeedback', {
				mate: updatereceiver.mate
			});
		});
	});
	
	socket.on('rundone', function(data) {
		console.log(socket.request.user.username);
		console.log(data);
		User.findOne({ username : socket.request.user.username}, function(err, user) {
			if (user) {
				console.log('sending message to '+user.mate.username);
				User.findOne({username: user.mate.username}, function(err, mate) {
					io.to(user.mate.username).emit('mateback', {
						results: mate.mate.results
					});
				});
			}
		});
	});
	
	socket.on('sessiondone', function(data) {
		console.log(socket.request.user.username+' is done');
		User.findOne({username: socket.request.user.username}, function(err, user) {
			if (err) {console.log(err)};
			if (user) {
				user.results = {
					runcity: "",
					time: 0, 
					distance: 0, 
					notes: ""
				};
				user.runcity = "";
				user.time = 0;
				user.distance = 0;
				user.notes = 0;
				user.mate = {
					username: "",
					runcity: "",
					time: 0,
					distance: 0,
					notes: "",
					runstatus: "Leaving Soon"
				}
				user.runstatus = "Leaving Soon";
				user.active = false;
				user.save();
			}
		});
	});
	
	socket.on('disconnect', function(data) {
		console.log(data);
		console.log('someone disconnected');
	});
});

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
