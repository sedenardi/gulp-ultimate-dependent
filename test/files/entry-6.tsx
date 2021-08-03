/*
* Fake TSX ultimate dependent
*/

import { Test } from './components/dep-1-7';
import type { DepType } from './components/dep-1-8';

export const TestEntry = function(props: DepType) {
  return (<Test {...props} />);
};

