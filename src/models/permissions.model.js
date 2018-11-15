// permissions-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const permissions = new Schema({
    user_id: {
      type: Schema.ObjectId,
      ref: 'users',
      required: [true, 'User ID is required']
    },
    account_id: {
      type: Schema.ObjectId,
      ref: 'accounts',
      required: [true, 'Account ID is required']
    },
    rights: {
      canDoThis: Boolean,
      canDoThat: Boolean
    }
  }, {
    timestamps: true
  });

  return mongooseClient.model('permissions', permissions);
};
