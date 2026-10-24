import {
    describe,
    expect,
    it,
} from 'bun:test';

import { Money } from '../../../shared/domain/money/money.js';

import { LedgerDirection } from '../../wallets/domain/ledger/wallet-ledger-entry.types.js';

import {
    InvalidReferenceTransactionError,
    InvalidTransactionStateError,
    InvalidWagerTransactionAmountError,
    MissingReferenceTransactionError,
    ReferenceRequiredError,
    TransactionDoesNotAffectBalanceError,
    UnexpectedReferenceError,
} from './wager-transaction.errors.js';

import { WagerTransaction } from './wager-transaction.js';

import {
    FailureCode,
    WagerTransactionKind,
    WagerTransactionStatus,
    type CreateWagerTransactionProps,
} from './wager-transaction.types';

describe('WagerTransaction', () => {
    const createdAt =
        new Date('2026-10-23T15:00:00.000Z');

    function makeProps(
        changes:
            Partial<CreateWagerTransactionProps> = {},
    ): CreateWagerTransactionProps {
        return {
            id: '0192f298-345e-7e38-af88-e43f851a819d',
            providerId: 'provider-a',
            externalTransactionId:
                'transaction-123',
            idempotencyKey:
                'provider-a:transaction-123',
            payloadHash: 'hash-123',
            walletId:
                '0192f291-27dd-7d3f-8071-5f8685deef37',
            playerId:
                '0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1',
            roundId: 'round-987',
            gameId: 'fortune-chimp',
            kind: WagerTransactionKind.Bet,
            money: Money.from({
                amount: '25.00',
                currency: 'BRL',
            }),
            createdAt,
            ...changes,
        };
    }

    function createProcessedReference(
        kind: WagerTransactionKind,
        externalTransactionId = 'reference-123',
    ): WagerTransaction {
        const reference =
            WagerTransaction.create(
                makeProps({
                    id: `reference-${kind}`,
                    externalTransactionId,
                    idempotencyKey:
                        `provider-a:${externalTransactionId}`,
                    payloadHash:
                        `hash-${externalTransactionId}`,
                    kind,
                    referenceExternalTransactionId:
                        kind === WagerTransactionKind.Refund
                            ? 'original-bet'
                            : undefined,
                }),
            );

        reference.markProcessed(
            kind === WagerTransactionKind.Refund
                ? 'original-bet-id'
                : undefined,
            new Date('2026-10-23T15:01:00.000Z'),
        );

        return reference;
    }

    describe('create', () => {
        it('should create a pending BET', () => {
            const transaction =
                WagerTransaction.create(makeProps());

            expect(transaction.status).toBe(
                WagerTransactionStatus.Pending,
            );

            expect(transaction.isTerminal()).toBe(false);
            expect(transaction.affectsBalance()).toBe(true);
            expect(transaction.requiresReference()).toBe(
                false,
            );

            expect(transaction.createdAt).toEqual(
                createdAt,
            );
        });

        it('should require reference for REFUND', () => {
            expect(() =>
                WagerTransaction.create(
                    makeProps({
                        kind: WagerTransactionKind.Refund,
                    }),
                ),
            ).toThrow(ReferenceRequiredError);
        });

        it('should require reference for ROLLBACK', () => {
            expect(() =>
                WagerTransaction.create(
                    makeProps({
                        kind:
                            WagerTransactionKind.Rollback,
                    }),
                ),
            ).toThrow(ReferenceRequiredError);
        });

        it('should allow reference for REFUND', () => {
            const transaction =
                WagerTransaction.create(
                    makeProps({
                        kind: WagerTransactionKind.Refund,
                        referenceExternalTransactionId:
                            'bet-123',
                    }),
                );

            expect(
                transaction
                    .referenceExternalTransactionId,
            ).toBe('bet-123');
        });

        it('should allow optional reference for WIN', () => {
            const transaction =
                WagerTransaction.create(
                    makeProps({
                        kind: WagerTransactionKind.Win,
                        referenceExternalTransactionId:
                            'bet-123',
                    }),
                );

            expect(
                transaction
                    .referenceExternalTransactionId,
            ).toBe('bet-123');
        });

        it('should reject reference for BET', () => {
            expect(() =>
                WagerTransaction.create(
                    makeProps({
                        kind: WagerTransactionKind.Bet,
                        referenceExternalTransactionId:
                            'another-transaction',
                    }),
                ),
            ).toThrow(UnexpectedReferenceError);
        });

        it('should reject zero money', () => {
            expect(() =>
                WagerTransaction.create(
                    makeProps({
                        money: Money.zero('BRL'),
                    }),
                ),
            ).toThrow(
                InvalidWagerTransactionAmountError,
            );
        });

        it('should reject negative money', () => {
            const negativeMoney = Money.from({
                amount: '25.00',
                currency: 'BRL',
            }).negate();

            expect(() =>
                WagerTransaction.create(
                    makeProps({
                        money: negativeMoney,
                    }),
                ),
            ).toThrow(
                InvalidWagerTransactionAmountError,
            );
        });
    });

    describe('status transitions', () => {
        it('should mark a BET as processed', () => {
            const transaction =
                WagerTransaction.create(makeProps());

            const processedAt =
                new Date('2026-10-23T15:01:00.000Z');

            transaction.markProcessed(
                undefined,
                processedAt,
            );

            expect(transaction.status).toBe(
                WagerTransactionStatus.Processed,
            );

            expect(transaction.isTerminal()).toBe(true);

            expect(transaction.processedAt).toEqual(
                processedAt,
            );

            expect(transaction.failureCode).toBeUndefined();
        });

        it('should mark a REFUND as pending reference', () => {
            const transaction =
                WagerTransaction.create(
                    makeProps({
                        kind: WagerTransactionKind.Refund,
                        referenceExternalTransactionId:
                            'missing-bet',
                    }),
                );

            transaction.markPendingReference();

            expect(transaction.status).toBe(
                WagerTransactionStatus.PendingReference,
            );

            expect(transaction.isTerminal()).toBe(false);
        });

        it(
            'should reject pending reference for BET',
            () => {
                const transaction =
                    WagerTransaction.create(makeProps());

                expect(() =>
                    transaction.markPendingReference(),
                ).toThrow(InvalidTransactionStateError);
            },
        );

        it('should reject a transaction', () => {
            const transaction =
                WagerTransaction.create(makeProps());

            transaction.reject(
                FailureCode.InsufficientFunds,
            );

            expect(transaction.status).toBe(
                WagerTransactionStatus.Rejected,
            );

            expect(transaction.failureCode).toBe(
                FailureCode.InsufficientFunds,
            );

            expect(transaction.isTerminal()).toBe(true);
        });

        it('should fail a transaction', () => {
            const transaction =
                WagerTransaction.create(makeProps());

            transaction.fail(
                FailureCode.InfrastructurePermanentFailure,
            );

            expect(transaction.status).toBe(
                WagerTransactionStatus.Failed,
            );

            expect(transaction.failureCode).toBe(
                FailureCode
                    .InfrastructurePermanentFailure,
            );

            expect(transaction.isTerminal()).toBe(true);
        });

        it(
            'should prevent transition after processed',
            () => {
                const transaction =
                    WagerTransaction.create(makeProps());

                transaction.markProcessed(
                    undefined,
                    new Date(
                        '2026-10-23T15:01:00.000Z',
                    ),
                );

                expect(() =>
                    transaction.reject(
                        FailureCode.InsufficientFunds,
                    ),
                ).toThrow(
                    InvalidTransactionStateError,
                );
            },
        );

        it(
            'should prevent transition after rejected',
            () => {
                const transaction =
                    WagerTransaction.create(makeProps());

                transaction.reject(
                    FailureCode.InsufficientFunds,
                );

                expect(() =>
                    transaction.markProcessed(
                        undefined,
                        new Date(
                            '2026-10-23T15:01:00.000Z',
                        ),
                    ),
                ).toThrow(
                    InvalidTransactionStateError,
                );
            },
        );
    });

    describe('payload matching', () => {
        it('should match the original payload hash', () => {
            const transaction =
                WagerTransaction.create(makeProps());

            expect(
                transaction.matchesPayload('hash-123'),
            ).toBe(true);

            expect(
                transaction.matchesPayload(
                    'different-hash',
                ),
            ).toBe(false);
        });
    });

    describe('balance effect', () => {
        it('should report LOSS as no balance effect', () => {
            const transaction =
                WagerTransaction.create(
                    makeProps({
                        kind: WagerTransactionKind.Loss,
                    }),
                );

            expect(
                transaction.affectsBalance(),
            ).toBe(false);
        });

        it.each([
            WagerTransactionKind.Opening,
            WagerTransactionKind.Bet,
            WagerTransactionKind.Win,
            WagerTransactionKind.Refund,
            WagerTransactionKind.Rollback,
        ])(
            'should report %s as affecting balance',
            (kind) => {
                const referenceExternalTransactionId =
                    kind === WagerTransactionKind.Refund ||
                        kind === WagerTransactionKind.Rollback
                        ? 'reference-123'
                        : undefined;

                const transaction =
                    WagerTransaction.create(
                        makeProps({
                            kind,
                            referenceExternalTransactionId,
                        }),
                    );

                expect(
                    transaction.affectsBalance(),
                ).toBe(true);
            },
        );
    });

    describe('ledger direction', () => {
        it('should use DEBIT for BET', () => {
            const transaction =
                WagerTransaction.create(
                    makeProps({
                        kind: WagerTransactionKind.Bet,
                    }),
                );

            expect(
                transaction.ledgerDirectionFor(),
            ).toBe(LedgerDirection.Debit);
        });

        it('should use CREDIT for WIN', () => {
            const transaction =
                WagerTransaction.create(
                    makeProps({
                        kind: WagerTransactionKind.Win,
                    }),
                );

            expect(
                transaction.ledgerDirectionFor(),
            ).toBe(LedgerDirection.Credit);
        });

        it('should use CREDIT for REFUND', () => {
            const transaction =
                WagerTransaction.create(
                    makeProps({
                        kind: WagerTransactionKind.Refund,
                        referenceExternalTransactionId:
                            'reference-123',
                    }),
                );

            expect(
                transaction.ledgerDirectionFor(),
            ).toBe(LedgerDirection.Credit);
        });

        it('should reject ledger direction for LOSS', () => {
            const transaction =
                WagerTransaction.create(
                    makeProps({
                        kind: WagerTransactionKind.Loss,
                    }),
                );

            expect(() =>
                transaction.ledgerDirectionFor(),
            ).toThrow(
                TransactionDoesNotAffectBalanceError,
            );
        });

        it(
            'should require a reference for ROLLBACK direction',
            () => {
                const transaction =
                    WagerTransaction.create(
                        makeProps({
                            kind:
                                WagerTransactionKind.Rollback,
                            referenceExternalTransactionId:
                                'reference-123',
                        }),
                    );

                expect(() =>
                    transaction.ledgerDirectionFor(),
                ).toThrow(
                    MissingReferenceTransactionError,
                );
            },
        );

        it(
            'should invert BET DEBIT to ROLLBACK CREDIT',
            () => {
                const reference =
                    createProcessedReference(
                        WagerTransactionKind.Bet,
                    );

                const rollback =
                    WagerTransaction.create(
                        makeProps({
                            kind:
                                WagerTransactionKind.Rollback,
                            referenceExternalTransactionId:
                                reference
                                    .externalTransactionId,
                        }),
                    );

                expect(
                    rollback.ledgerDirectionFor(reference),
                ).toBe(LedgerDirection.Credit);
            },
        );

        it(
            'should invert WIN CREDIT to ROLLBACK DEBIT',
            () => {
                const reference =
                    createProcessedReference(
                        WagerTransactionKind.Win,
                    );

                const rollback =
                    WagerTransaction.create(
                        makeProps({
                            kind:
                                WagerTransactionKind.Rollback,
                            referenceExternalTransactionId:
                                reference
                                    .externalTransactionId,
                        }),
                    );

                expect(
                    rollback.ledgerDirectionFor(reference),
                ).toBe(LedgerDirection.Debit);
            },
        );
    });

    describe('reference validation', () => {
        it(
            'should validate REFUND referencing a BET',
            () => {
                const reference =
                    createProcessedReference(
                        WagerTransactionKind.Bet,
                    );

                const refund =
                    WagerTransaction.create(
                        makeProps({
                            kind:
                                WagerTransactionKind.Refund,
                            referenceExternalTransactionId:
                                reference
                                    .externalTransactionId,
                        }),
                    );

                expect(() =>
                    refund.validateReference(reference),
                ).not.toThrow();
            },
        );

        it(
            'should reject REFUND referencing WIN',
            () => {
                const reference =
                    createProcessedReference(
                        WagerTransactionKind.Win,
                    );

                const refund =
                    WagerTransaction.create(
                        makeProps({
                            kind:
                                WagerTransactionKind.Refund,
                            referenceExternalTransactionId:
                                reference
                                    .externalTransactionId,
                        }),
                    );

                expect(() =>
                    refund.validateReference(reference),
                ).toThrow(
                    InvalidReferenceTransactionError,
                );
            },
        );

        it(
            'should reject reference from another wallet',
            () => {
                const reference =
                    WagerTransaction.create(
                        makeProps({
                            id: 'reference-id',
                            walletId: 'another-wallet',
                            externalTransactionId:
                                'reference-123',
                            idempotencyKey:
                                'provider-a:reference-123',
                            payloadHash: 'reference-hash',
                        }),
                    );

                reference.markProcessed(
                    undefined,
                    new Date(
                        '2026-10-23T15:01:00.000Z',
                    ),
                );

                const rollback =
                    WagerTransaction.create(
                        makeProps({
                            kind:
                                WagerTransactionKind.Rollback,
                            referenceExternalTransactionId:
                                'reference-123',
                        }),
                    );

                expect(() =>
                    rollback.validateReference(reference),
                ).toThrow(
                    InvalidReferenceTransactionError,
                );
            },
        );
    });

    describe('rehydrate', () => {
        it(
            'should reconstruct a processed transaction',
            () => {
                const processedAt =
                    new Date(
                        '2026-10-23T15:01:00.000Z',
                    );

                const transaction =
                    WagerTransaction.rehydrate({
                        ...makeProps(),
                        status:
                            WagerTransactionStatus.Processed,
                        processedAt,
                    });

                expect(transaction.status).toBe(
                    WagerTransactionStatus.Processed,
                );

                expect(transaction.processedAt).toEqual(
                    processedAt,
                );

                expect(transaction.isTerminal()).toBe(
                    true,
                );
            },
        );

        it(
            'should reconstruct a rejected transaction',
            () => {
                const transaction =
                    WagerTransaction.rehydrate({
                        ...makeProps(),
                        status:
                            WagerTransactionStatus.Rejected,
                        failureCode:
                            FailureCode.InsufficientFunds,
                    });

                expect(transaction.status).toBe(
                    WagerTransactionStatus.Rejected,
                );

                expect(transaction.failureCode).toBe(
                    FailureCode.InsufficientFunds,
                );
            },
        );
    });
});