import {
    describe,
    expect,
    it,
} from 'bun:test';

import { Money } from '../../../../shared/domain/money/money.js';
import { Wallet } from '../wallet.js';


import {
    InvalidLedgerAmountError,
    InvalidLedgerDateError,
    InvalidLedgerDirectionError,
    InvalidLedgerEntryIdError,
    InvalidLedgerTransactionIdError,
    InvalidLedgerWalletIdError,
    InvalidRehydratedLedgerEntryError,
    LedgerCurrencyMismatchError,
    NegativeLedgerBalanceError,
    UnbalancedLedgerEntryError,
} from './wallet-ledger-entry.errors.js';

import { WalletLedgerEntry } from './wallet-ledger-entry.js';

import {
    LedgerDirection,
    type CreateLedgerEntryProps,
} from './wallet-ledger-entry.types.js';

describe('WalletLedgerEntry', () => {
    const entryId =
        '0192f298-345e-7e38-af88-e43f851a819d';

    const walletId =
        '0192f291-27dd-7d3f-8071-5f8685deef37';

    const transactionId =
        '0192f299-37d0-77eb-9dcc-c9ecba2e69bb';

    const createdAt =
        new Date('2026-10-23T15:00:00.000Z');

    function makeProps(
        changes: Partial<CreateLedgerEntryProps> = {},
    ): CreateLedgerEntryProps {
        return {
            id: entryId,
            walletId,
            transactionId,
            direction: LedgerDirection.Debit,
            money: Money.from({
                amount: '25.00',
                currency: 'BRL',
            }),
            balanceBefore: Money.from({
                amount: '100.00',
                currency: 'BRL',
            }),
            balanceAfter: Money.from({
                amount: '75.00',
                currency: 'BRL',
            }),
            createdAt,
            ...changes,
        };
    }

    describe('create', () => {
        it('should create a balanced debit entry', () => {
            const entry =
                WalletLedgerEntry.create(makeProps());

            expect(entry.id).toBe(entryId);
            expect(entry.walletId).toBe(walletId);
            expect(entry.transactionId).toBe(
                transactionId,
            );

            expect(entry.direction).toBe(
                LedgerDirection.Debit,
            );

            expect(entry.money.toString()).toBe(
                '25.00 BRL',
            );

            expect(
                entry.balanceBefore.toString(),
            ).toBe('100.00 BRL');

            expect(
                entry.balanceAfter.toString(),
            ).toBe('75.00 BRL');

            expect(entry.createdAt).toEqual(createdAt);
            expect(entry.isBalanced()).toBe(true);
        });

        it('should create a balanced credit entry', () => {
            const entry = WalletLedgerEntry.create(
                makeProps({
                    direction: LedgerDirection.Credit,
                    money: Money.from({
                        amount: '25.00',
                        currency: 'BRL',
                    }),
                    balanceBefore: Money.from({
                        amount: '100.00',
                        currency: 'BRL',
                    }),
                    balanceAfter: Money.from({
                        amount: '125.00',
                        currency: 'BRL',
                    }),
                }),
            );

            expect(entry.isBalanced()).toBe(true);

            expect(
                entry.balanceAfter.toString(),
            ).toBe('125.00 BRL');
        });

        it('should reject an unbalanced debit', () => {
            expect(() =>
                WalletLedgerEntry.create(
                    makeProps({
                        balanceAfter: Money.from({
                            amount: '80.00',
                            currency: 'BRL',
                        }),
                    }),
                ),
            ).toThrow(UnbalancedLedgerEntryError);
        });

        it('should reject an unbalanced credit', () => {
            expect(() =>
                WalletLedgerEntry.create(
                    makeProps({
                        direction:
                            LedgerDirection.Credit,
                        balanceAfter: Money.from({
                            amount: '120.00',
                            currency: 'BRL',
                        }),
                    }),
                ),
            ).toThrow(UnbalancedLedgerEntryError);
        });

        it('should reject zero money', () => {
            expect(() =>
                WalletLedgerEntry.create(
                    makeProps({
                        money: Money.zero('BRL'),
                        balanceAfter: Money.from({
                            amount: '100.00',
                            currency: 'BRL',
                        }),
                    }),
                ),
            ).toThrow(InvalidLedgerAmountError);
        });

        it('should reject negative money', () => {
            const negativeMoney = Money.from({
                amount: '25.00',
                currency: 'BRL',
            }).negate();

            expect(() =>
                WalletLedgerEntry.create(
                    makeProps({
                        money: negativeMoney,
                    }),
                ),
            ).toThrow(InvalidLedgerAmountError);
        });

        it('should reject different currencies', () => {
            expect(() =>
                WalletLedgerEntry.create(
                    makeProps({
                        money: Money.from({
                            amount: '25.00',
                            currency: 'USD',
                        }),
                    }),
                ),
            ).toThrow(LedgerCurrencyMismatchError);
        });

        it('should reject a negative balance', () => {
            const negativeBalance = Money.from({
                amount: '10.00',
                currency: 'BRL',
            }).negate();

            expect(() =>
                WalletLedgerEntry.create(
                    makeProps({
                        balanceAfter: negativeBalance,
                    }),
                ),
            ).toThrow(NegativeLedgerBalanceError);
        });

        it.each([
            ['', InvalidLedgerEntryIdError],
            ['   ', InvalidLedgerEntryIdError],
        ])(
            'should reject invalid entry id "%s"',
            (id, errorType) => {
                expect(() =>
                    WalletLedgerEntry.create(
                        makeProps({ id }),
                    ),
                ).toThrow(errorType);
            },
        );

        it('should reject an invalid wallet id', () => {
            expect(() =>
                WalletLedgerEntry.create(
                    makeProps({
                        walletId: '',
                    }),
                ),
            ).toThrow(InvalidLedgerWalletIdError);
        });

        it('should reject an invalid transaction id', () => {
            expect(() =>
                WalletLedgerEntry.create(
                    makeProps({
                        transactionId: '',
                    }),
                ),
            ).toThrow(
                InvalidLedgerTransactionIdError,
            );
        });

        it('should reject an invalid direction', () => {
            expect(() =>
                WalletLedgerEntry.create(
                    makeProps({
                        direction:
                            'INVALID' as LedgerDirection,
                    }),
                ),
            ).toThrow(InvalidLedgerDirectionError);
        });

        it('should reject an invalid date', () => {
            expect(() =>
                WalletLedgerEntry.create(
                    makeProps({
                        createdAt: new Date('invalid'),
                    }),
                ),
            ).toThrow(InvalidLedgerDateError);
        });

        it('should protect its date from mutation', () => {
            const externalDate =
                new Date('2026-10-23T15:00:00.000Z');

            const entry = WalletLedgerEntry.create(
                makeProps({
                    createdAt: externalDate,
                }),
            );

            externalDate.setFullYear(2030);

            expect(entry.createdAt.toISOString()).toBe(
                '2026-10-23T15:00:00.000Z',
            );

            const returnedDate = entry.createdAt;

            returnedDate.setFullYear(2040);

            expect(entry.createdAt.toISOString()).toBe(
                '2026-10-23T15:00:00.000Z',
            );
        });
    });

    describe('rehydrate', () => {
        it('should reconstruct a persisted entry', () => {
            const entry =
                WalletLedgerEntry.rehydrate({
                    ...makeProps(),
                    createdAt,
                });

            expect(entry.id).toBe(entryId);
            expect(entry.isBalanced()).toBe(true);
            expect(entry.createdAt).toEqual(createdAt);
        });

        it(
            'should reconstruct an unbalanced persisted ' +
            'entry for reconciliation',
            () => {
                const entry =
                    WalletLedgerEntry.rehydrate({
                        ...makeProps(),
                        balanceAfter: Money.from({
                            amount: '80.00',
                            currency: 'BRL',
                        }),
                        createdAt,
                    });

                expect(entry.isBalanced()).toBe(false);
            },
        );

        it(
            'should reject structurally inconsistent ' +
            'persisted currencies',
            () => {
                expect(() =>
                    WalletLedgerEntry.rehydrate({
                        ...makeProps(),
                        balanceAfter: Money.from({
                            amount: '75.00',
                            currency: 'USD',
                        }),
                        createdAt,
                    }),
                ).toThrow(
                    InvalidRehydratedLedgerEntryError,
                );
            },
        );
    });

    describe('Wallet integration', () => {
        const playerId =
            '0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1';

        it(
            'should create a debit entry from a Wallet change',
            () => {
                const wallet = Wallet.open({
                    id: walletId,
                    playerId,
                    initialBalance: Money.from({
                        amount: '100.00',
                        currency: 'BRL',
                    }),
                    createdAt,
                });

                const money = Money.from({
                    amount: '25.00',
                    currency: 'BRL',
                });

                const change = wallet.debit(
                    money,
                    createdAt,
                );

                const entry = WalletLedgerEntry.create({
                    id: entryId,
                    walletId: wallet.id,
                    transactionId,
                    direction: LedgerDirection.Debit,
                    money,
                    balanceBefore:
                        change.balanceBefore,
                    balanceAfter:
                        change.balanceAfter,
                    createdAt,
                });

                expect(entry.isBalanced()).toBe(true);

                expect(wallet.balance.equals(
                    entry.balanceAfter,
                )).toBe(true);

                expect(change.walletVersion).toBe(2);
            },
        );

        it(
            'should create a credit entry from a Wallet change',
            () => {
                const wallet = Wallet.open({
                    id: walletId,
                    playerId,
                    initialBalance: Money.from({
                        amount: '100.00',
                        currency: 'BRL',
                    }),
                    createdAt,
                });

                const money = Money.from({
                    amount: '25.00',
                    currency: 'BRL',
                });

                const change = wallet.credit(
                    money,
                    createdAt,
                );

                const entry = WalletLedgerEntry.create({
                    id: entryId,
                    walletId: wallet.id,
                    transactionId,
                    direction: LedgerDirection.Credit,
                    money,
                    balanceBefore:
                        change.balanceBefore,
                    balanceAfter:
                        change.balanceAfter,
                    createdAt,
                });

                expect(entry.isBalanced()).toBe(true);

                expect(wallet.balance.equals(
                    entry.balanceAfter,
                )).toBe(true);

                expect(change.walletVersion).toBe(2);
            },
        );
    });
});