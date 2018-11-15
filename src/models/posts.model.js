// posts-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const posts = new Schema({
    title: { type: String, required: true },
    account_id: {
      type: Schema.ObjectId,
      ref: 'accounts',
      required: [true, 'Account ID is required']
    },
  }, {
    timestamps: true
  });

  return mongooseClient.model('posts', posts);
};
