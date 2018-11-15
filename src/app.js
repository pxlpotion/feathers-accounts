const path = require('path');
const favicon = require('serve-favicon');
const compress = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./logger');

const feathers = require('@feathersjs/feathers');
const configuration = require('@feathersjs/configuration');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');


const middleware = require('./middleware');
const services = require('./services');
const appHooks = require('./app.hooks');
const channels = require('./channels');

const authentication = require('./authentication');

const mongoose = require('./mongoose');

const app = express(feathers());

// Load app configuration
app.configure(configuration());
// Enable security, CORS, compression, favicon and body parsing
app.use(helmet());
app.use(cors());
app.use(compress());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(favicon(path.join(app.get('public'), 'favicon.ico')));
// Host the public folder
app.use('/', express.static(app.get('public')));

// Set up Plugins and providers
app.configure(express.rest());
app.configure(socketio());

app.configure(mongoose);
app.configure(app => {
  app.mixins.push(function (service) {
    service.findOne = function (params) {
      params = params || {};
      params.query = params.query || {};
      params.query.$limit = 1;
      return service.find(params).then(function (result) {
        const data = result.data || result;
        return Array.isArray(data) ? data[0] : data;
      });
    };
  });
});

// Configure other middleware (see `middleware/index.js`)
app.configure(middleware);
app.configure(authentication);
// Set up our services (see `services/index.js`)
app.configure(services);
// Set up event channels (see channels.js)
app.configure(channels);


// Configure a middleware for 404s and the error handler
app.use(express.notFound());
app.use(express.errorHandler({ logger }));

app.hooks(appHooks);

// app.service('users').create({
//   email: "both-accounts@example.com",
//   password: "password"
// })
// .then(console.log)
// .catch(console.log);

// app.service('accounts').create({
//   name: "Second Account"
// })
// .then(console.log)
// .catch(console.log);

// app.service('permissions').create({
//   user_id: "5bede40d918b017c099f3bf9",
//   account_id: "5bede2f10da6d47b4026cfa9"
// })
// .then(console.log)
// .catch(console.log);

module.exports = app;
