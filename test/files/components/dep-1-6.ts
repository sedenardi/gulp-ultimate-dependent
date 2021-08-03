/*
* Fake intermediary dependency that fails
*/

import child5 from './dep-2-5';

export default function() { return `dep-1-6 -> ${child5}`; }
