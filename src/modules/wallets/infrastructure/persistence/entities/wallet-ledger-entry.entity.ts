import {
    Entity,
    Enum,
    Index,
    PrimaryKey,
    Property,
    Unique,
} from '@mikro-orm/decorators/legacy';

import { LedgerDirection } from '../../../domain/ledger/wallet-ledger-entry.types.js';

@Entity({
    tableName: 'wallet_ledger_entries',
})
@Unique({
    name: 'uq_ledger_wallet_transaction',
    properties: ['walletId', 'transactionId'],
})
@Index({
    name: 'idx_ledger_wallet_created_id',
    properties: ['walletId', 'createdAt', 'id'],
})
@Index({
    name: 'idx_ledger_transaction',
    properties: ['transactionId'],
})
export class WalletLedgerEntryEntity {
    @PrimaryKey({
        type: 'uuid',
    })
    id!: string;

    @Property({
        fieldName: 'wallet_id',
        type: 'uuid',
    })
    walletId!: string;

    @Property({
        fieldName: 'transaction_id',
        type: 'uuid',
    })
    transactionId!: string;

    @Enum({
        fieldName: 'direction',
        items: () => LedgerDirection,
        nativeEnumName: 'ledger_direction',
    })
    direction!: LedgerDirection;

    @Property({
        fieldName: 'amount',
        columnType: 'numeric(19, 2)',
    })
    amount!: string;

    @Property({
        fieldName: 'currency',
        columnType: 'char(3)',
        length: 3,
    })
    currency!: string;

    @Property({
        fieldName: 'balance_before',
        columnType: 'numeric(19, 2)',
    })
    balanceBefore!: string;

    @Property({
        fieldName: 'balance_after',
        columnType: 'numeric(19, 2)',
    })
    balanceAfter!: string;

    @Property({
        fieldName: 'created_at',
        columnType: 'timestamptz',
    })
    createdAt!: Date;
}