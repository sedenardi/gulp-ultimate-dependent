/*
* Fake ultimate dependent
*
* entry-1 -> dep-1-1 -> dep-2.1
*/

const dep1 = require('./components/dep-1-1');

console.log(`entry-1 -> ${dep1()}`);
