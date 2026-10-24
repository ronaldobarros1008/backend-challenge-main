import type { Money } from '../../../../shared/domain/money/money.js';

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

import {
    LedgerDirection,
    type CreateLedgerEntryProps,
    type LedgerEntryState,
} from './wallet-ledger-entry.types.js';

export class WalletLedgerEntry {
    private constructor(
        public readonly id: string,
        public readonly walletId: string,
        public readonly transactionId: string,
        public readonly direction: LedgerDirection,
        public readonly money: Money,
        public readonly balanceBefore: Money,
        public readonly balanceAfter: Money,
        private readonly _createdAt: Date,
    ) { }

    static create(
        props: CreateLedgerEntryProps,
    ): WalletLedgerEntry {
        WalletLedgerEntry.assertValidIdentifiers(props);

        WalletLedgerEntry.assertValidDirection(
            props.direction,
        );

        WalletLedgerEntry.assertValidMoney(
            props.money,
            props.balanceBefore,
            props.balanceAfter,
        );

        const createdAt =
            WalletLedgerEntry.copyValidDate(
                props.createdAt ?? new Date(),
            );

        const entry = new WalletLedgerEntry(
            props.id,
            props.walletId,
            props.transactionId,
            props.direction,
            props.money,
            props.balanceBefore,
            props.balanceAfter,
            createdAt,
        );

        if (!entry.isBalanced()) {
            throw new UnbalancedLedgerEntryError();
        }

        return entry;
    }

    /**
     * Reconstrói uma entrada já persistida.
     *
     * Não representa uma nova movimentação e não altera
     * nenhum estado financeiro.
     */
    static rehydrate(
        state: LedgerEntryState,
    ): WalletLedgerEntry {
        WalletLedgerEntry.assertValidIdentifiers(state);

        WalletLedgerEntry.assertValidDirection(
            state.direction,
        );

        const createdAt =
            WalletLedgerEntry.copyValidDate(
                state.createdAt,
            );

        if (
            state.money.currency !==
            state.balanceBefore.currency ||
            state.money.currency !==
            state.balanceAfter.currency
        ) {
            throw new InvalidRehydratedLedgerEntryError(
                'currencies do not match',
            );
        }

        if (
            state.money.isZero() ||
            state.money.isNegative()
        ) {
            throw new InvalidRehydratedLedgerEntryError(
                'money must be greater than zero',
            );
        }

        if (
            state.balanceBefore.isNegative() ||
            state.balanceAfter.isNegative()
        ) {
            throw new InvalidRehydratedLedgerEntryError(
                'balances cannot be negative',
            );
        }

        return new WalletLedgerEntry(
            state.id,
            state.walletId,
            state.transactionId,
            state.direction,
            state.money,
            state.balanceBefore,
            state.balanceAfter,
            createdAt,
        );
    }

    get createdAt(): Date {
        return new Date(this._createdAt.getTime());
    }

    isBalanced(): boolean {
        if (
            this.direction === LedgerDirection.Credit
        ) {
            return this.balanceBefore
                .add(this.money)
                .equals(this.balanceAfter);
        }

        if (
            this.direction === LedgerDirection.Debit
        ) {
            return this.balanceBefore
                .subtract(this.money)
                .equals(this.balanceAfter);
        }

        return false;
    }

    private static assertValidIdentifiers(
        props: Pick<
            LedgerEntryState,
            'id' | 'walletId' | 'transactionId'
        >,
    ): void {
        if (
            typeof props.id !== 'string' ||
            props.id.trim().length === 0
        ) {
            throw new InvalidLedgerEntryIdError(
                props.id,
            );
        }

        if (
            typeof props.walletId !== 'string' ||
            props.walletId.trim().length === 0
        ) {
            throw new InvalidLedgerWalletIdError(
                props.walletId,
            );
        }

        if (
            typeof props.transactionId !== 'string' ||
            props.transactionId.trim().length === 0
        ) {
            throw new InvalidLedgerTransactionIdError(
                props.transactionId,
            );
        }
    }

    private static assertValidDirection(
        direction: unknown,
    ): asserts direction is LedgerDirection {
        if (
            direction !== LedgerDirection.Debit &&
            direction !== LedgerDirection.Credit
        ) {
            throw new InvalidLedgerDirectionError(
                direction,
            );
        }
    }

    private static assertValidMoney(
        money: Money,
        balanceBefore: Money,
        balanceAfter: Money,
    ): void {
        if (
            money.isZero() ||
            money.isNegative()
        ) {
            throw new InvalidLedgerAmountError();
        }

        if (
            balanceBefore.isNegative() ||
            balanceAfter.isNegative()
        ) {
            throw new NegativeLedgerBalanceError();
        }

        if (
            money.currency !== balanceBefore.currency ||
            money.currency !== balanceAfter.currency
        ) {
            throw new LedgerCurrencyMismatchError(
                money.currency,
                balanceBefore.currency,
                balanceAfter.currency,
            );
        }
    }

    private static copyValidDate(
        value: unknown,
    ): Date {
        if (
            !(value instanceof Date) ||
            Number.isNaN(value.getTime())
        ) {
            throw new InvalidLedgerDateError(value);
        }

        return new Date(value.getTime());
    }
}