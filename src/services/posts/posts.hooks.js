const { auth, withAccount, byAccount, fromAccount } = require('../../hooks');

module.exports = {
  before: {
    all: [...auth],
    find: [byAccount],
    get: [byAccount],
    create: [withAccount],
    update: [withAccount],
    patch: [withAccount],
    remove: [fromAccount]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
