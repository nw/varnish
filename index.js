
module.exports = process.env.CODE_COVERAGE
  ? require('./lib-cov')
  : require('./lib');