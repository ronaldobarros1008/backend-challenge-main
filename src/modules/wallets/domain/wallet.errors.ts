export abstract class WalletError extends Error {
    protected constructor(message: string) {
        super(message);

        this.name = new.target.name;

        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class InvalidWalletIdError extends WalletError {
    constructor(id: unknown) {
        super(`Invalid wallet id: ${String(id)}`);
    }
}

export class InvalidPlayerIdError extends WalletError {
    constructor(playerId: unknown) {
        super(`Invalid player id: ${String(playerId)}`);
    }
}

export class InvalidWalletVersionError extends WalletError {
    constructor(version: unknown) {
        super(`Invalid wallet version: ${String(version)}`);
    }
}

export class InvalidWalletDateError extends WalletError {
    constructor(field: string, value: unknown) {
        super(`Invalid wallet ${field}: ${String(value)}`);
    }
}

export class WalletCurrencyMismatchError extends WalletError {
    constructor(
        public readonly walletCurrency: string,
        public readonly moneyCurrency: string,
    ) {
        super(
            `Wallet currency mismatch: wallet uses ` +
            `${walletCurrency}, but received ${moneyCurrency}`,
        );
    }
}

export class NegativeInitialBalanceError extends WalletError {
    constructor() {
        super('Wallet initial balance cannot be negative');
    }
}

export class NegativeWalletMovementError extends WalletError {
    constructor() {
        super('Wallet movement amount cannot be negative');
    }
}

export class InsufficientFundsError extends WalletError {
    constructor() {
        super('Wallet has insufficient funds');
    }
}

export class InvalidRehydratedWalletStateError extends WalletError {
    constructor(reason: string) {
        super(`Invalid rehydrated wallet state: ${reason}`);
    }
}