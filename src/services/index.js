const users = require('./users/users.service.js');
const accounts = require('./accounts/accounts.service.js');
const permissions = require('./permissions/permissions.service.js');
const posts = require('./posts/posts.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(users);
  app.configure(accounts);
  app.configure(permissions);
  app.configure(posts);
};
