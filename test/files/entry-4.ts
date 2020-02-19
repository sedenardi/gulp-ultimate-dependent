/*
* Fake ultimate dependent
*
* entry-4 -> dep-1-3 -> dep-2.2
* entry-4 -> dep-1-5 -> dep-2.4
*/

import dep3 from './components/dep-1-3';
import dep5 from './components/dep-1-5';

console.log(`entry-5 -> ${dep3()}`);
console.log(`entry-5 -> ${dep5()}`);
