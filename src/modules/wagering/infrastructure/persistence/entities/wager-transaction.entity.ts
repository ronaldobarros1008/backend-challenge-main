import {
    Entity,
    Enum,
    Index,
    PrimaryKey,
    Property,
    Unique,
} from '@mikro-orm/decorators/legacy';

import {
    FailureCode,
    WagerTransactionKind,
    WagerTransactionStatus,
} from '../../../domain/wager-transaction.types.js';

@Entity({
    tableName: 'wager_transactions',
})
@Unique({
    name: 'uq_wager_transactions_idempotency_key',
    properties: ['idempotencyKey'],
})
@Unique({
    name: 'uq_wager_transactions_provider_external',
    properties: [
        'providerId',
        'externalTransactionId',
    ],
})
@Index({
    name: 'idx_wager_transactions_wallet_created',
    properties: ['walletId', 'createdAt'],
})
@Index({
    name: 'idx_wager_transactions_reference_lookup',
    properties: [
        'providerId',
        'referenceExternalTransactionId',
    ],
})
@Index({
    name: 'idx_wager_transactions_pending_reference',
    properties: [
        'status',
        'nextReferenceAttemptAt',
    ],
})
export class WagerTransactionEntity {
    @PrimaryKey({
        type: 'uuid',
    })
    id!: string;

    @Property({
        fieldName: 'provider_id',
        columnType: 'varchar(100)',
        length: 100,
    })
    providerId!: string;

    @Property({
        fieldName: 'external_transaction_id',
        columnType: 'varchar(255)',
        length: 255,
    })
    externalTransactionId!: string;

    @Property({
        fieldName: 'idempotency_key',
        columnType: 'varchar(255)',
        length: 255,
    })
    idempotencyKey!: string;

    @Property({
        fieldName: 'payload_hash',
        columnType: 'char(64)',
        length: 64,
    })
    payloadHash!: string;

    @Property({
        fieldName: 'wallet_id',
        type: 'uuid',
    })
    walletId!: string;

    @Property({
        fieldName: 'player_id',
        type: 'uuid',
    })
    playerId!: string;

    @Property({
        fieldName: 'round_id',
        columnType: 'varchar(255)',
        length: 255,
    })
    roundId!: string;

    @Property({
        fieldName: 'game_id',
        columnType: 'varchar(255)',
        length: 255,
    })
    gameId!: string;

    @Enum({
        fieldName: 'kind',
        items: () => WagerTransactionKind,
        nativeEnumName: 'wager_transaction_kind',
    })
    kind!: WagerTransactionKind;

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
        fieldName: 'reference_external_transaction_id',
        columnType: 'varchar(255)',
        length: 255,
        nullable: true,
    })
    referenceExternalTransactionId?: string;

    @Property({
        fieldName: 'reference_transaction_id',
        type: 'uuid',
        nullable: true,
    })
    referenceTransactionId?: string;

    @Enum({
        fieldName: 'status',
        items: () => WagerTransactionStatus,
        nativeEnumName: 'wager_transaction_status',
    })
    status!: WagerTransactionStatus;

    @Enum({
        fieldName: 'failure_code',
        items: () => FailureCode,
        nativeEnumName: 'wager_failure_code',
        nullable: true,
    })
    failureCode?: FailureCode;

    @Property({
        fieldName: 'balance_after',
        columnType: 'numeric(19, 2)',
        nullable: true,
    })
    balanceAfter?: string;

    @Property({
        fieldName: 'created_at',
        columnType: 'timestamptz',
    })
    createdAt!: Date;

    @Property({
        fieldName: 'processed_at',
        columnType: 'timestamptz',
        nullable: true,
    })
    processedAt?: Date;

    @Property({
        fieldName: 'reference_attempts',
        columnType: 'integer',
        default: 0,
    })
    referenceAttempts: number = 0;

    @Property({
        fieldName: 'next_reference_attempt_at',
        columnType: 'timestamptz',
        nullable: true,
    })
    nextReferenceAttemptAt?: Date;
}