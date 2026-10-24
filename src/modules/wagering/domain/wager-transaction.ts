import type { Money } from '../../../shared/domain/money/money.js';

import { LedgerDirection } from '../../wallets/domain/ledger/wallet-ledger-entry.types.js';

import {
    InvalidReferenceTransactionError,
    InvalidTransactionStateError,
    InvalidWagerTransactionAmountError,
    InvalidWagerTransactionFieldError,
    InvalidWagerTransactionKindError,
    InvalidWagerTransactionStatusError,
    MissingFailureCodeError,
    MissingProcessedAtError,
    MissingReferenceTransactionError,
    ReferenceRequiredError,
    TransactionDoesNotAffectBalanceError,
    UnexpectedFailureCodeError,
    UnexpectedProcessedAtError,
    UnexpectedReferenceError,
} from './wager-transaction.errors.js';

import {
    FailureCode,
    WagerTransactionKind,
    WagerTransactionStatus,
    type CreateWagerTransactionProps,
    type WagerTransactionState,
} from './wager-transaction.types.js';

export class WagerTransaction {
    private constructor(
        public readonly id: string,
        public readonly providerId: string,
        public readonly externalTransactionId: string,
        public readonly idempotencyKey: string,
        public readonly payloadHash: string,
        public readonly walletId: string,
        public readonly playerId: string,
        public readonly roundId: string,
        public readonly gameId: string,
        public readonly kind: WagerTransactionKind,
        public readonly money: Money,
        public readonly referenceExternalTransactionId:
            | string
            | undefined,
        private readonly _createdAt: Date,
        private _status: WagerTransactionStatus,
        private _referenceTransactionId?: string,
        private _failureCode?: FailureCode,
        private _processedAt?: Date,
    ) { }

    static create(
        props: CreateWagerTransactionProps,
    ): WagerTransaction {
        WagerTransaction.assertRequiredFields(props);
        WagerTransaction.assertValidKind(props.kind);
        WagerTransaction.assertPositiveMoney(props.money);

        const referenceExternalTransactionId =
            WagerTransaction.normalizeOptionalReference(
                props.referenceExternalTransactionId,
            );

        WagerTransaction.assertReferenceContract(
            props.kind,
            referenceExternalTransactionId,
        );

        const createdAt =
            WagerTransaction.copyValidDate(
                'createdAt',
                props.createdAt ?? new Date(),
            );

        return new WagerTransaction(
            props.id,
            props.providerId,
            props.externalTransactionId,
            props.idempotencyKey,
            props.payloadHash,
            props.walletId,
            props.playerId,
            props.roundId,
            props.gameId,
            props.kind,
            props.money,
            referenceExternalTransactionId,
            createdAt,
            WagerTransactionStatus.Pending,
        );
    }

    /**
     * Reconstrói uma transação já persistida.
     *
     * Não executa novamente transições de estado.
     * Verifica apenas coerência estrutural necessária
     * para que a entidade possa ser utilizada.
     */
    static rehydrate(
        state: WagerTransactionState,
    ): WagerTransaction {
        WagerTransaction.assertRequiredFields(state);
        WagerTransaction.assertValidKind(state.kind);
        WagerTransaction.assertValidStatus(state.status);
        WagerTransaction.assertPositiveMoney(state.money);

        const referenceExternalTransactionId =
            WagerTransaction.normalizeOptionalReference(
                state.referenceExternalTransactionId,
            );

        WagerTransaction.assertReferenceContract(
            state.kind,
            referenceExternalTransactionId,
        );

        const createdAt =
            WagerTransaction.copyValidDate(
                'createdAt',
                state.createdAt,
            );

        const processedAt = state.processedAt
            ? WagerTransaction.copyValidDate(
                'processedAt',
                state.processedAt,
            )
            : undefined;

        if (
            processedAt &&
            processedAt.getTime() < createdAt.getTime()
        ) {
            throw new InvalidWagerTransactionFieldError(
                'processedAt',
                state.processedAt,
            );
        }

        WagerTransaction.assertPersistedStateConsistency(
            state.status,
            state.failureCode,
            processedAt,
        );

        if (
            state.referenceTransactionId !== undefined
        ) {
            WagerTransaction.assertNonBlankString(
                'referenceTransactionId',
                state.referenceTransactionId,
            );
        }

        return new WagerTransaction(
            state.id,
            state.providerId,
            state.externalTransactionId,
            state.idempotencyKey,
            state.payloadHash,
            state.walletId,
            state.playerId,
            state.roundId,
            state.gameId,
            state.kind,
            state.money,
            referenceExternalTransactionId,
            createdAt,
            state.status,
            state.referenceTransactionId,
            state.failureCode,
            processedAt,
        );
    }

    get createdAt(): Date {
        return new Date(this._createdAt.getTime());
    }

    get status(): WagerTransactionStatus {
        return this._status;
    }

    get referenceTransactionId():
        | string
        | undefined {
        return this._referenceTransactionId;
    }

    get failureCode(): FailureCode | undefined {
        return this._failureCode;
    }

    get processedAt(): Date | undefined {
        return this._processedAt
            ? new Date(this._processedAt.getTime())
            : undefined;
    }

    markProcessed(
        referenceTransactionId: string | undefined,
        at: Date,
    ): void {
        this.assertNotTerminal('markProcessed');

        const processedAt =
            WagerTransaction.copyValidDate(
                'processedAt',
                at,
            );

        if (
            processedAt.getTime() <
            this._createdAt.getTime()
        ) {
            throw new InvalidWagerTransactionFieldError(
                'processedAt',
                at,
            );
        }

        if (this.requiresReference()) {
            WagerTransaction.assertNonBlankString(
                'referenceTransactionId',
                referenceTransactionId,
            );
        }

        if (
            referenceTransactionId !== undefined &&
            referenceTransactionId.trim().length === 0
        ) {
            throw new InvalidWagerTransactionFieldError(
                'referenceTransactionId',
                referenceTransactionId,
            );
        }

        this._referenceTransactionId =
            referenceTransactionId;

        this._failureCode = undefined;
        this._processedAt = processedAt;
        this._status =
            WagerTransactionStatus.Processed;
    }

    markPendingReference(): void {
        this.assertNotTerminal(
            'markPendingReference',
        );

        if (!this.requiresReference()) {
            throw new InvalidTransactionStateError(
                this._status,
                'markPendingReference for a transaction ' +
                'that does not require a reference',
            );
        }

        this._referenceTransactionId = undefined;
        this._failureCode = undefined;
        this._processedAt = undefined;
        this._status =
            WagerTransactionStatus.PendingReference;
    }

    reject(code: FailureCode): void {
        this.assertNotTerminal('reject');

        WagerTransaction.assertValidFailureCode(code);

        this._status =
            WagerTransactionStatus.Rejected;

        this._failureCode = code;
        this._processedAt = undefined;
    }

    fail(code: FailureCode): void {
        this.assertNotTerminal('fail');

        WagerTransaction.assertValidFailureCode(code);

        this._status =
            WagerTransactionStatus.Failed;

        this._failureCode = code;
        this._processedAt = undefined;
    }

    isTerminal(): boolean {
        return (
            this._status ===
            WagerTransactionStatus.Processed ||
            this._status ===
            WagerTransactionStatus.Rejected ||
            this._status ===
            WagerTransactionStatus.Failed
        );
    }

    affectsBalance(): boolean {
        return (
            this.kind !== WagerTransactionKind.Loss
        );
    }

    requiresReference(): boolean {
        return (
            this.kind ===
            WagerTransactionKind.Refund ||
            this.kind ===
            WagerTransactionKind.Rollback
        );
    }

    matchesPayload(payloadHash: string): boolean {
        return this.payloadHash === payloadHash;
    }

    /**
     * Determina a direção financeira da transação.
     *
     * BET      -> DEBIT
     * WIN      -> CREDIT
     * REFUND   -> CREDIT
     * OPENING  -> CREDIT
     * LOSS     -> sem ledger
     * ROLLBACK -> direção inversa da referência
     */
    ledgerDirectionFor(
        reference?: WagerTransaction,
    ): LedgerDirection {
        switch (this.kind) {
            case WagerTransactionKind.Opening:
            case WagerTransactionKind.Win:
            case WagerTransactionKind.Refund:
                return LedgerDirection.Credit;

            case WagerTransactionKind.Bet:
                return LedgerDirection.Debit;

            case WagerTransactionKind.Loss:
                throw new TransactionDoesNotAffectBalanceError(
                    this.kind,
                );

            case WagerTransactionKind.Rollback:
                return this.rollbackDirectionFor(reference);

            default:
                throw new InvalidWagerTransactionKindError(
                    this.kind,
                );
        }
    }

    /**
     * Valida a referência já localizada pelo repositório.
     *
     * A resolução por providerId e externalTransactionId
     * continua sendo responsabilidade do caso de uso.
     */
    validateReference(
        reference: WagerTransaction,
    ): void {
        if (!this.requiresReference()) {
            throw new InvalidReferenceTransactionError(
                `${this.kind} does not require a reference`,
            );
        }

        if (!reference.isTerminal()) {
            throw new InvalidReferenceTransactionError(
                'reference transaction is not terminal',
            );
        }

        if (
            reference.status !==
            WagerTransactionStatus.Processed
        ) {
            throw new InvalidReferenceTransactionError(
                'reference transaction is not processed',
            );
        }

        if (
            reference.providerId !== this.providerId
        ) {
            throw new InvalidReferenceTransactionError(
                'provider differs from reference',
            );
        }

        if (
            reference.playerId !== this.playerId
        ) {
            throw new InvalidReferenceTransactionError(
                'player differs from reference',
            );
        }

        if (
            reference.walletId !== this.walletId
        ) {
            throw new InvalidReferenceTransactionError(
                'wallet differs from reference',
            );
        }

        if (
            reference.roundId !== this.roundId
        ) {
            throw new InvalidReferenceTransactionError(
                'round differs from reference',
            );
        }

        if (
            reference.money.currency !==
            this.money.currency
        ) {
            throw new InvalidReferenceTransactionError(
                'currency differs from reference',
            );
        }

        if (
            !reference.money.equals(this.money)
        ) {
            throw new InvalidReferenceTransactionError(
                'money differs from reference',
            );
        }

        if (
            reference.externalTransactionId !==
            this.referenceExternalTransactionId
        ) {
            throw new InvalidReferenceTransactionError(
                'external transaction id differs from ' +
                'referenceExternalTransactionId',
            );
        }

        if (
            this.kind ===
            WagerTransactionKind.Refund &&
            reference.kind !==
            WagerTransactionKind.Bet
        ) {
            throw new InvalidReferenceTransactionError(
                'REFUND can only reference BET',
            );
        }

        if (
            this.kind ===
            WagerTransactionKind.Rollback &&
            ![
                WagerTransactionKind.Bet,
                WagerTransactionKind.Win,
                WagerTransactionKind.Refund,
            ].includes(reference.kind)
        ) {
            throw new InvalidReferenceTransactionError(
                'ROLLBACK can only reference BET, WIN ' +
                'or REFUND',
            );
        }
    }

    private rollbackDirectionFor(
        reference?: WagerTransaction,
    ): LedgerDirection {
        if (!reference) {
            throw new MissingReferenceTransactionError(
                this.kind,
            );
        }

        this.validateReference(reference);

        const referenceDirection =
            reference.ledgerDirectionFor();

        return referenceDirection ===
            LedgerDirection.Debit
            ? LedgerDirection.Credit
            : LedgerDirection.Debit;
    }

    private assertNotTerminal(
        transition: string,
    ): void {
        if (this.isTerminal()) {
            throw new InvalidTransactionStateError(
                this._status,
                transition,
            );
        }
    }

    private static assertRequiredFields(
        props: Pick<
            WagerTransactionState,
            | 'id'
            | 'providerId'
            | 'externalTransactionId'
            | 'idempotencyKey'
            | 'payloadHash'
            | 'walletId'
            | 'playerId'
            | 'roundId'
            | 'gameId'
        >,
    ): void {
        WagerTransaction.assertNonBlankString(
            'id',
            props.id,
        );

        WagerTransaction.assertNonBlankString(
            'providerId',
            props.providerId,
        );

        WagerTransaction.assertNonBlankString(
            'externalTransactionId',
            props.externalTransactionId,
        );

        WagerTransaction.assertNonBlankString(
            'idempotencyKey',
            props.idempotencyKey,
        );

        WagerTransaction.assertNonBlankString(
            'payloadHash',
            props.payloadHash,
        );

        WagerTransaction.assertNonBlankString(
            'walletId',
            props.walletId,
        );

        WagerTransaction.assertNonBlankString(
            'playerId',
            props.playerId,
        );

        WagerTransaction.assertNonBlankString(
            'roundId',
            props.roundId,
        );

        WagerTransaction.assertNonBlankString(
            'gameId',
            props.gameId,
        );
    }

    private static assertNonBlankString(
        field: string,
        value: unknown,
    ): asserts value is string {
        if (
            typeof value !== 'string' ||
            value.trim().length === 0
        ) {
            throw new InvalidWagerTransactionFieldError(
                field,
                value,
            );
        }
    }

    private static assertPositiveMoney(
        money: Money,
    ): void {
        if (
            money.isZero() ||
            money.isNegative()
        ) {
            throw new InvalidWagerTransactionAmountError();
        }
    }

    private static assertValidKind(
        kind: unknown,
    ): asserts kind is WagerTransactionKind {
        if (
            !Object.values(
                WagerTransactionKind,
            ).includes(
                kind as WagerTransactionKind,
            )
        ) {
            throw new InvalidWagerTransactionKindError(
                kind,
            );
        }
    }

    private static assertValidStatus(
        status: unknown,
    ): asserts status is WagerTransactionStatus {
        if (
            !Object.values(
                WagerTransactionStatus,
            ).includes(
                status as WagerTransactionStatus,
            )
        ) {
            throw new InvalidWagerTransactionStatusError(
                status,
            );
        }
    }

    private static assertValidFailureCode(
        code: unknown,
    ): asserts code is FailureCode {
        if (
            !Object.values(FailureCode).includes(
                code as FailureCode,
            )
        ) {
            throw new InvalidWagerTransactionFieldError(
                'failureCode',
                code,
            );
        }
    }

    private static assertReferenceContract(
        kind: WagerTransactionKind,
        referenceExternalTransactionId:
            | string
            | undefined,
    ): void {
        const requiresReference =
            kind === WagerTransactionKind.Refund ||
            kind === WagerTransactionKind.Rollback;

        if (
            requiresReference &&
            !referenceExternalTransactionId
        ) {
            throw new ReferenceRequiredError(kind);
        }

        const forbidsReference =
            kind === WagerTransactionKind.Opening ||
            kind === WagerTransactionKind.Bet ||
            kind === WagerTransactionKind.Loss;

        if (
            forbidsReference &&
            referenceExternalTransactionId
        ) {
            throw new UnexpectedReferenceError(kind);
        }

        /*
         * WIN pode possuir uma referência opcional à
         * BET da mesma rodada.
         */
    }

    private static normalizeOptionalReference(
        value: string | undefined,
    ): string | undefined {
        if (value === undefined) {
            return undefined;
        }

        WagerTransaction.assertNonBlankString(
            'referenceExternalTransactionId',
            value,
        );

        return value;
    }

    private static assertPersistedStateConsistency(
        status: WagerTransactionStatus,
        failureCode: FailureCode | undefined,
        processedAt: Date | undefined,
    ): void {
        const requiresFailureCode =
            status ===
            WagerTransactionStatus.Rejected ||
            status ===
            WagerTransactionStatus.Failed;

        if (
            requiresFailureCode &&
            failureCode === undefined
        ) {
            throw new MissingFailureCodeError(status);
        }

        if (
            !requiresFailureCode &&
            failureCode !== undefined
        ) {
            throw new UnexpectedFailureCodeError(
                status,
            );
        }

        if (
            status ===
            WagerTransactionStatus.Processed &&
            processedAt === undefined
        ) {
            throw new MissingProcessedAtError();
        }

        if (
            status !==
            WagerTransactionStatus.Processed &&
            processedAt !== undefined
        ) {
            throw new UnexpectedProcessedAtError(
                status,
            );
        }
    }

    private static copyValidDate(
        field: string,
        value: unknown,
    ): Date {
        if (
            !(value instanceof Date) ||
            Number.isNaN(value.getTime())
        ) {
            throw new InvalidWagerTransactionFieldError(
                field,
                value,
            );
        }

        return new Date(value.getTime());
    }
}