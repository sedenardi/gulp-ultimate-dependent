/*
* Fake intermediary dependency that fails
*/

const child3 = require('./dep-2-3');

module.exports = () => { return `dep-1-4 -> ${child3}`; };
