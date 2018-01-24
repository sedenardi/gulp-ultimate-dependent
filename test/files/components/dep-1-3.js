/*
* Fake intermediary dependency
*/

const child2 = require('./dep-2-2');

module.exports = () => { return `dep-1-3 -> ${child2}`; };
