import { env } from 'cloudflare:workers';

import { createD1Db } from './create-db';

export const db = createD1Db(env.DB);
