var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var passportSocketIo = require('passport.socketio');

server.listen(3000);

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
var bcrypt = require('bcryptjs');

User = require('./user.js');
Runner = require('./runner.js');
Mate = require('./mate.js');

var routes = require('./routes/index');
var users = require('./routes/users');
var credentials = require('./credentials.js');



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
			return done(null, false, {message: 'Unknown User'});
		}
		User.comparePassword(password, user.password, function(err, isMatch) {
			if (err) {console.log(err)};
			if (isMatch) {
				return done(null, user);
			} else {
				return done(null, false, {message: 'Invalid Password'})
			}
		});
	});
}));

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

app.use('/', routes);
app.use('/users', users);


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
	Runner.getRunner(socket.request.user.username, function(er, runner) {
		if (runner.mate) {
			console.log(runner.mate);
			io.to(runner.mate).emit('matefeedback', {
				mate: runner,
			});
			io.to(socket.request.user.username).emit('statusfeedback', {
				runstatus: runner.runstatus
			});
			Runner.getRunner(runner.mate, function(er, mate) {
				io.to(socket.request.user.username).emit('matefeedback', {
					mate: mate,
				});
				io.to(mate.username).emit('statusfeedback'), {
					runstatus: mate.runstatus
				}
			});
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
		Runner.findOneAndUpdate({username: data.myname}, {status: data.status}, function(err, runner) {
			io.to(data.room).emit('', {
				room: data.matename,
				mate1: data.myname, 
				mate2: data.matename,
				mate1details: runner
			})
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
