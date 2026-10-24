import { Money } from '../../../shared/domain/money/money.js';

import {
    InsufficientFundsError,
    InvalidPlayerIdError,
    InvalidRehydratedWalletStateError,
    InvalidWalletDateError,
    InvalidWalletIdError,
    InvalidWalletVersionError,
    NegativeInitialBalanceError,
    NegativeWalletMovementError,
    WalletCurrencyMismatchError,
} from './wallet.errors.js';

import type {
    OpenWalletProps,
    WalletBalanceChange,
    WalletState,
} from './wallet.types.js';

export class Wallet {
    private constructor(
        public readonly id: string,
        public readonly playerId: string,
        public readonly currency: string,
        private _balance: Money,
        private _version: number,
        private readonly _createdAt: Date,
        private _updatedAt: Date,
    ) { }

    static open(props: OpenWalletProps): Wallet {
        Wallet.assertValidId(props.id);
        Wallet.assertValidPlayerId(props.playerId);

        if (props.initialBalance.isNegative()) {
            throw new NegativeInitialBalanceError();
        }

        const createdAt = props.createdAt
            ? Wallet.copyValidDate('createdAt', props.createdAt)
            : new Date();

        return new Wallet(
            props.id,
            props.playerId,
            props.initialBalance.currency,
            props.initialBalance,
            1,
            createdAt,
            new Date(createdAt.getTime()),
        );
    }

    /**
     * Reconstrói um estado já persistido.
     *
     * Não executa regras de transição e não incrementa a versão.
     * São verificadas somente condições estruturais necessárias para
     * impedir a criação de uma Wallet internamente incoerente.
     */
    static rehydrate(state: WalletState): Wallet {
        Wallet.assertValidId(state.id);
        Wallet.assertValidPlayerId(state.playerId);
        Wallet.assertValidVersion(state.version);

        const createdAt = Wallet.copyValidDate(
            'createdAt',
            state.createdAt,
        );

        const updatedAt = Wallet.copyValidDate(
            'updatedAt',
            state.updatedAt,
        );

        if (state.balance.currency !== state.currency) {
            throw new InvalidRehydratedWalletStateError(
                'balance currency differs from wallet currency',
            );
        }

        if (state.balance.isNegative()) {
            throw new InvalidRehydratedWalletStateError(
                'persisted balance cannot be negative',
            );
        }

        if (updatedAt.getTime() < createdAt.getTime()) {
            throw new InvalidRehydratedWalletStateError(
                'updatedAt cannot be before createdAt',
            );
        }

        return new Wallet(
            state.id,
            state.playerId,
            state.currency,
            state.balance,
            state.version,
            createdAt,
            updatedAt,
        );
    }

    get balance(): Money {
        return this._balance;
    }

    get version(): number {
        return this._version;
    }

    get createdAt(): Date {
        return new Date(this._createdAt.getTime());
    }

    get updatedAt(): Date {
        return new Date(this._updatedAt.getTime());
    }

    debit(
        money: Money,
        at: Date = new Date(),
    ): WalletBalanceChange {
        this.assertSameCurrency(money);
        this.assertValidMovement(money);

        if (money.isZero()) {
            return this.unchangedBalance();
        }

        if (this._balance.isLessThan(money)) {
            throw new InsufficientFundsError();
        }

        const balanceBefore = this._balance;
        const balanceAfter = balanceBefore.subtract(money);

        this.applyBalance(balanceAfter, at);

        return Object.freeze({
            balanceBefore,
            balanceAfter,
            changed: true,
            walletVersion: this._version,
        });
    }

    credit(
        money: Money,
        at: Date = new Date(),
    ): WalletBalanceChange {
        this.assertSameCurrency(money);
        this.assertValidMovement(money);

        if (money.isZero()) {
            return this.unchangedBalance();
        }

        const balanceBefore = this._balance;
        const balanceAfter = balanceBefore.add(money);

        this.applyBalance(balanceAfter, at);

        return Object.freeze({
            balanceBefore,
            balanceAfter,
            changed: true,
            walletVersion: this._version,
        });
    }

    private applyBalance(
        balanceAfter: Money,
        at: Date,
    ): void {
        if (balanceAfter.isNegative()) {
            throw new InsufficientFundsError();
        }

        const movementDate = Wallet.copyValidDate(
            'movement date',
            at,
        );

        this._balance = balanceAfter;
        this._version += 1;
        this._updatedAt = movementDate;
    }

    private unchangedBalance(): WalletBalanceChange {
        return Object.freeze({
            balanceBefore: this._balance,
            balanceAfter: this._balance,
            changed: false,
            walletVersion: this._version,
        });
    }

    private assertSameCurrency(money: Money): void {
        if (this.currency !== money.currency) {
            throw new WalletCurrencyMismatchError(
                this.currency,
                money.currency,
            );
        }
    }

    private assertValidMovement(money: Money): void {
        if (money.isNegative()) {
            throw new NegativeWalletMovementError();
        }
    }

    private static assertValidId(
        id: unknown,
    ): asserts id is string {
        if (
            typeof id !== 'string' ||
            id.trim().length === 0
        ) {
            throw new InvalidWalletIdError(id);
        }
    }

    private static assertValidPlayerId(
        playerId: unknown,
    ): asserts playerId is string {
        if (
            typeof playerId !== 'string' ||
            playerId.trim().length === 0
        ) {
            throw new InvalidPlayerIdError(playerId);
        }
    }

    private static assertValidVersion(
        version: unknown,
    ): asserts version is number {
        if (
            typeof version !== 'number' ||
            !Number.isSafeInteger(version) ||
            version < 1
        ) {
            throw new InvalidWalletVersionError(version);
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
            throw new InvalidWalletDateError(
                field,
                value,
            );
        }

        return new Date(value.getTime());
    }
}