/*
* Fake ultimate dependent
*
* entry-2 -> dep-1-1 -> dep-2.2
* entry-2 -> dep-1-2 -> dep-2.2
* entry-2 -> dep-1-3 -> dep-2.2
*/

const dep1 = require('./components/dep-1-1');
const dep2 = require('./components/dep-1-2');
const dep3 = require('./components/dep-1-3');

console.log(`entry-1 -> ${dep1()}`);
console.log(`entry-2 -> ${dep2()}`);
console.log(`entry-2 -> ${dep3()}`);
