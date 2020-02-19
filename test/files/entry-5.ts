/*
* Fake intermediary dependency that fails
*/

import dep6 from './components/dep-1-6';

console.log(`entry-5 -> ${dep6()}`);
