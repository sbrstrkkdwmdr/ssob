import { begin as begin_bot } from './bot';
import { begin as begin_web } from './web';

import { setup } from './setup';

setup();
begin_web();
begin_bot();