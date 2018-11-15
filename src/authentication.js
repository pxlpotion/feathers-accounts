const authentication = require('@feathersjs/authentication');
const jwt = require('@feathersjs/authentication-jwt');
const local = require('@feathersjs/authentication-local');


module.exports = function (app) {
  const config = app.get('authentication');

  // Set up authentication with the secret
  app.configure(authentication(config));
  app.configure(jwt());
  app.configure(local());

  // The `authentication` service is used to create a JWT.
  // The before `create` hook registers strategies that can be used
  // to create a new valid JWT (e.g. local or oauth2)
  app.service('authentication').hooks({
    before: {
      create: [
        authentication.hooks.authenticate(config.strategies),
        addAccountId
      ],
      remove: [
        authentication.hooks.authenticate('jwt')
      ]
    }
  });
};

// Add an accountId into the token. It doesn't really matter which token
// After authentication, the user can call the api/sessions service, which
// requires auth to any account, to retrieve their other account tokens
const addAccountId = async context => {
  const { payload } = context.params;
  const permissionsSerivce = context.app.service('permissions');
  if (context.data.strategy === 'local') {
    // If logging in with email/PW we don't really know what account
    // they are logging in as, so just pick the first one.
    const permission = await permissionsSerivce.findOne({
      query: { user_id: payload.userId }
    });
    if (!permission) {
      throw new Error(
        'This user is inactive. Please contact your administrator and inform them to invite you to their organization.'
      );
    }
    context.params.payload = { ...payload, accountId: permission.account_id };
  } else if (context.data.strategy === 'jwt') {
    // If logging in with JWT, we need to pass the accountId of the JWT
    // being used to login in along to the new JWT being created.
    const { passport } = context.app;
    const { secret } = context.app.get('authentication');
    const token = context.data.accessToken;
    const { accountId } = await passport.verifyJWT(token, { secret });
    const permission = await permissionsSerivce.findOne({
      query: { user_id: payload.userId, account_id: accountId }
    });
    if (!permission) {
      throw new Error(
        'This user is no longer active in this account. Please contact your administrator and inform them to invite you to their organization.'
      );
    }
    context.params.payload = { ...payload, accountId };
  }
  return context;
};
