/*
  Fake ultimate dependent with circular dependencies in child components
*/

import dep from './components/dep-circular-3';

console.log(`entry-circular -> ${dep()}`);
