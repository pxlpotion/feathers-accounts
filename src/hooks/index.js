const { NotAuthenticated, BadRequest } = require('@feathersjs/errors');
const auth = require('@feathersjs/authentication');

// Add relevant data to the req.params.session. This must be called
// after auth.hooks.authenticate(['jwt', 'local']) hook to ensure
// params.accessToken exists. Internal calls don't pass provider param,
// but can pass the token explicitly to mimic and external call and
// get the session obj attached.
const createSession = async context => {
  const { params, app } = context;
  if (params.provider || (!params.provider && params.accessToken)) {
    const { secret } = app.get('authentication');
    const token = params.accessToken;
    if (!token) {
      throw new NotAuthenticated('No authorization token provided.');
    }
    const {
      userId: user_id,
      accountId: account_id
    } = await app.passport.verifyJWT(token, { secret });

    const [user, account, permission] = await Promise.all([
      app.service('users').get(user_id),
      app.service('accounts').get(account_id),
      app.service('permissions').findOne({
        query: { account_id, user_id }
      })
    ]);
    params.session = {
      plan_id: account.plan_id, // not used for this demo
      account_id,
      permission,
      user
    };
    console.log('Current Session: ', JSON.stringify(params.session, null, 2))
    return context;
  }
};

// NOTE: This returns an array and should be spread into the
// hooks position, ...auth. This ensures that the auth hook runs
// first so that createSession has what it needs
module.exports.auth = [auth.hooks.authenticate(['jwt', 'local']), createSession];

// A client can only work with the account in their session
module.exports.restrictToSession = async context => {
  if (context.params && context.params.session) {
    const { params } = context;
    if (context.id !== params.session.account_id) {
      throw new BadRequest('You cannot access this account.');
    }
  }
};

/*
  Enfore data can only be queried/created according the
  account_id in the session. Note this is not enabled by default
  for internal calls, but if you pass the token as a param
  the hooks will work as expected. This is helpful for
  allowing internal calls to have full control, but also
  allow them to act as a normal client. I could potentially
  improve this by just passing the session, if I have the token
  then I also already have the session...this would bypass the
  auth hook (and having to verify the token and then look up the
  session) and directly attach the session...passing the token seems
  a bit easier and more intuitive, but passing the session directly
  would have better performance, if only marginally.
*/

// Enforce .find() and .get() only return results within
// the account associated with the requesting token
module.exports.byAccount = async context => {
  if (context.params && context.params.session) {
    const { params } = context;
    if (context.method === 'find') {
      // Coerce the account_id into the query so that only resources
      // within the proper account are returned.
      const { account_id } = params.session;
      context.params.query = { ...params.query, account_id };
      return context;
    } else if (context.method === 'get') {
      // .get() does not have a query. Coerce this into a .find() with
      // the account_id, similar to the code block above. Then,
      // set the context.result manually which will skip the
      // actual .get(), but will still execute all other hooks.
      const resourceDoc = await context.service.Model.findOne({
        _id: context.id,
        account_id: params.session.account_id
      });
      if (!resourceDoc) {
        throw new Error('You cannot access this record');
      }
      context.result = resourceDoc.toObject();
      return context;
    }
  }
};

// Ensure resources .create(), .patch(), and .update() have the
// account_id from session and cannot be spoofed into another account
module.exports.withAccount = context => {
  if (context.params && context.params.session) {
    const { params } = context;
    const { account_id } = params.session;
    context.data = { ...context.data, account_id };
    return context;
  }
};

// Ensure resources .delete() has the same
// account_id from session and cannot deleted
// by a user not in this account
module.exports.fromAccount = async context => {
  if (context.params && context.params.session) {
    const { account_id } = context.params.session;
    const resourceDoc = await context.service.Model.findById(context.id);
    if (!resourceDoc) {
      throw new BadRequest(
        `Could not find a document with _id: ${context.id} at path: ${
        context.path
        }`
      );
    } else if (resourceDoc.account_id.toString() !== account_id.toString()) {
      throw new BadRequest('You cannot access this resource.');
    }
    // TODO: There is a potential performance win here if we go ahead
    // and delete the resource and set context.result = resourceDoc
    // Setting context.result will allow all other hooks to run,
    // but will skip the actual service's attempt to remove it
    // which is standard feathers, if you set context.result, it
    // doesn't do create/update/get/find/delete on the model for
    // this method, because you have already set the result.
    // We could do this...but meh, potential for problems with
    // little benefit.
    return context;
  }
};
