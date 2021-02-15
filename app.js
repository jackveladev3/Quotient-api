const http = require('http');
const path = require('path');
const methods = require('methods');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const passport = require('passport');
const errorhandler = require('errorhandler');
const mongoose = require('mongoose');
const chalk = require('chalk');
const secret = require('./config').secret;
require('dotenv').config();
const isProduction = process.env.NODE_ENV === 'production';

console.log("process.env.NODE_ENV => ", process.env.NODE_ENV);
console.log("process.env.PORT => ", process.env.PORT);
console.log(" secret =>", secret);
console.log(" isProduction =>", isProduction);

// Create global app object
const app = express();

app.use(cors());

// Normal express config defaults
app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(require('method-override')());
app.use(express.static(__dirname + '/public'));

app.use(session({ secret: secret, cookie: { maxAge: 60000 }, resave: false, saveUninitialized: false }));

// Passport Js config for app to know
require("./config/passport");

app.use(passport.initialize());
app.use((req, res, next) => {
   // console.log(chalk.bgRedBright("req.body => "), req.body);
   // console.log("req.session => ", req.session);
   // console.log("req.user =>", req.user);
   next();
});

if (!isProduction) {
   app.use(errorhandler());
}

if (isProduction) {
   mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
      console.log(chalk.bgGreen("!!!! MongoDB was connected successfully !!!"));
   });
} else {
   mongoose.connect('mongodb://localhost:27017/quotehard_db', { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
      console.log(chalk.bgGreen("!!!! MongoDB was connected successfully !!!"));
   });
   mongoose.set('debug', true);
}


require('./models/AccountCompany');
require('./models/Account');
require('./models/Person');
require('./models/Company');
require('./models/Quote');
require('./models/PriceItem.js');
require('./models/TextItem.js');
require('./models/Template.js');
require('./models/DefaultSetting.js');

app.use(require('./routes'));

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
   const err = new Error('Not Found');
   err.status = 404;
   next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (!isProduction) {
   app.use(function (err, req, res, next) {
      console.log(err.stack);

      res.status(err.status || 500);

      res.json({
         'errors': {
            message: err.message,
            error: err
         }
      });
   });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
   res.status(err.status || 500);
   res.json({
      'errors': {
         message: err.message,
         error: {}
      }
   });
});

// finally, let's start our server...
const server = app.listen(process.env.PORT || 5000, function () {
   console.log(chalk.red('Listening on port ') + server.address().port);
});
