/*
* Fake intermediary dependency
*/

import child4 from './dep-2-4';

export default function() { return `dep-1-5-> ${child4}`; };
