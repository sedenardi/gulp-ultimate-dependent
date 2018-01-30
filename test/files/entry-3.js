/*
* Fake ultimate dependent that fails
*
* entry-3 -> dep-1-4 -> dep-2-3 (missing)
*/

const dep4 = require('./components/dep-1-4');

console.log(`entry-3 -> ${dep4()}`);
