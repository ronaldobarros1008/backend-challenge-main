import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';

import {
    WalletEntity,
    WalletLedgerEntryEntity,
} from '../../modules/wallets/infrastructure/persistence/entities/index.js';

import {
    WagerTransactionEntity,
} from '../../modules/wagering/infrastructure/persistence/entities/index.js';

const databasePort = Number.parseInt(
    process.env.DATABASE_PORT ?? '5432',
    10,
);

if (Number.isNaN(databasePort)) {
    throw new Error(
        'DATABASE_PORT must be a valid integer',
    );
}

const config = defineConfig({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: databasePort,
    dbName: process.env.DATABASE_NAME ?? 'wagering',
    user: process.env.DATABASE_USER ?? 'wagering',
    password:
        process.env.DATABASE_PASSWORD ?? 'wagering',

    entities: [
        WalletEntity,
        WagerTransactionEntity,
        WalletLedgerEntryEntity,
    ],

    debug:
        process.env.DATABASE_DEBUG === 'true',

    extensions: [Migrator],

    migrations: {
        path: 'dist/shared/database/migrations',
        pathTs: 'src/shared/database/migrations',
        glob: '!(*.d).{js,ts}',
        transactional: true,
        allOrNothing: true,
        emit: 'ts',
    },
});

export default config;