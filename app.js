// add all the required modules and dependancies
// check the documentation of each module at www.npmjs.com
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('client-sessions');


// include RESTful APIs in express
var index = require('./routes/index');
var users = require('./routes/users');



// initialize express framework
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');	// set jade as default view engine. render .jade files in the view folder according to requests. 
// http://html2jade.org/ use this converter to convert html files into jade. jade is indentation based framework 
app.engine('html', require('ejs').renderFile);	// uses ejs modules to add html engine. app.engine defines new engine
app.set('view engine', 'html'); // set html as default view/render engine

// database connection
// connection to mongodb should be created only once in the entire application. if database switch is necessary then previous connection needs to be close before initializing new connection
mongoose.connect('mongodb://gladydennyson123:haramrit09k@localhost:27017/space-terra'); // syntax: mongoose.connect('mongodb:hostaddress:configured_port/database_name');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger('dev'));
app.use(bodyParser.json()); // bodyParser allows to parse incoming requests made by ajax calls to handlers. using bodyParser requests can handled using req parameter e.g. req.body.variable. bodyParser.json allows to communicate with json object
app.use(bodyParser.urlencoded({ extended: false }));  // allows to parse requests using urls e.g. GET and POST requests
app.use(cookieParser());

app.use('/bower_components', express.static(path.join(__dirname, 'bower_components'))); // bower is used to install frontend packages. all the packages are located into bower_components. by default node prevents clients from accessing any other folder than public.
// folder or file needs to be added to static path with specific request e.g. www.teknack.in/users/user.js or in this case /bower_components/component_name/dist/filename
// syntax for adding any static path to folder is 'app.use('/request_name', express.static(path.join(__dirname, 'folder name')))
app.use(express.static(path.join(__dirname, 'public'))); // default path to access files available for client. files present in public folder are accessible to client without any restrictions



//*****    client-sessions usage  **********//
//cookie setup KEEP THIS THE SAME AS BELOW!!
app.use(session({                
	cookieName: "sess",
	secret: "134klh389dbcbsldvn1mcbj",
	duration: 30 * 60 * 1000, //30 min session duration
	activeDuration: 5 * 60 * 1000 //5 min active session
}));

//cookie usage 
app.use(function (req, res, next) {   //enforce a cookie requirement for all requests starting with '/' 
	if (!req.sess.username) {              //i.e. accessing the server needs session to be set
		console.log("redirecting cookie not found");
		res.redirect("http://teknack.in"); //this url will be provided later 
		// res.redirect("/error.html");
		//next();
	} else {
		next();
	}
});
//****** END OF client-sessions usage ********//


// app.use(session ({
// 	secret: "asdasa89y8asdhasd80",	// key used for encryption
// 	resave: false,	//forces session to be saved when unmodified
// 	saveUninitialized: true	//forces session to start uninitialized, no login info should be saved at the start of session
// }));

// routes definition
app.use('/', index);	// base route e.g. www.teknack.in -> /

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');	// error definition
	err.status = 404;		// if request is not valid e.g www.teknack.in/event1 and if event1.html is not in the views then the request is invalid and 404 error is send to browser
	next(err);				// forward error to browser
});

// see the http status codes www.restapitutorial.com/httpstatuscodes.html

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;		// export express app as node module to initialized in /bin/www
