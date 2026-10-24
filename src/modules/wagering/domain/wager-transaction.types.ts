import type { Money } from "../../../shared/domain/money/money.js";

export enum WagerTransactionKind {
    Opening = 'OPENING',
    Bet = 'BET',
    Win = 'WIN',
    Loss = 'LOSS',
    Refund = 'REFUND',
    Rollback = 'ROLLBACK',
}

export enum WagerTransactionStatus {
    Pending = 'PENDING',
    PendingReference = 'PENDING_REFERENCE',
    Processed = 'PROCESSED',
    Rejected = 'REJECTED',
    Failed = 'FAILED',
}

export enum FailureCode {
    InsufficientFunds = 'INSUFFICIENT_FUNDS',

    RollbackWouldResultInNegativeBalance =
    'ROLLBACK_WOULD_RESULT_IN_NEGATIVE_BALANCE',

    CurrencyMismatch = 'CURRENCY_MISMATCH',
    WalletNotFound = 'WALLET_NOT_FOUND',
    PlayerWalletMismatch = 'PLAYER_WALLET_MISMATCH',

    ReferenceNotFound = 'REFERENCE_NOT_FOUND',
    InvalidReferenceKind = 'INVALID_REFERENCE_KIND',
    ReferenceAmountMismatch = 'REFERENCE_AMOUNT_MISMATCH',
    ReferenceContextMismatch = 'REFERENCE_CONTEXT_MISMATCH',
    ReferenceAlreadyRefunded = 'REFERENCE_ALREADY_REFUNDED',
    ReferenceAlreadyRolledBack =
    'REFERENCE_ALREADY_ROLLED_BACK',

    IdempotencyConflict = 'IDEMPOTENCY_CONFLICT',
    InvalidTransactionState =
    'INVALID_TRANSACTION_STATE',

    InvalidAmount = 'INVALID_AMOUNT',
    InvalidCurrency = 'INVALID_CURRENCY',

    InfrastructurePermanentFailure =
    'INFRASTRUCTURE_PERMANENT_FAILURE',
}

export interface CreateWagerTransactionProps {
    id: string;
    providerId: string;
    externalTransactionId: string;
    idempotencyKey: string;
    payloadHash: string;
    walletId: string;
    playerId: string;
    roundId: string;
    gameId: string;
    kind: WagerTransactionKind;
    money: Money;
    referenceExternalTransactionId?: string;
    createdAt?: Date;
}

export interface WagerTransactionState {
    id: string;
    providerId: string;
    externalTransactionId: string;
    idempotencyKey: string;
    payloadHash: string;
    walletId: string;
    playerId: string;
    roundId: string;
    gameId: string;
    kind: WagerTransactionKind;
    money: Money;
    referenceExternalTransactionId?: string;
    createdAt: Date;
    status: WagerTransactionStatus;
    referenceTransactionId?: string;
    failureCode?: FailureCode;
    processedAt?: Date;
}