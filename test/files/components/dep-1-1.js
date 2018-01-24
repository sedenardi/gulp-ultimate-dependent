/*
* Fake intermediary dependency
*/

const child1 = require('./dep-2-1');

module.exports = () => { return `dep-1-1 -> ${child1}`; };
