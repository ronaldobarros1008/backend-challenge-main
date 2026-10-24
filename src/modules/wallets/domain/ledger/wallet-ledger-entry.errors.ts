export abstract class WalletLedgerEntryError extends Error {
    protected constructor(message: string) {
        super(message);

        this.name = new.target.name;

        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class InvalidLedgerEntryIdError
    extends WalletLedgerEntryError {
    constructor(id: unknown) {
        super(`Invalid ledger entry id: ${String(id)}`);
    }
}

export class InvalidLedgerWalletIdError
    extends WalletLedgerEntryError {
    constructor(walletId: unknown) {
        super(
            `Invalid ledger wallet id: ${String(walletId)}`,
        );
    }
}

export class InvalidLedgerTransactionIdError
    extends WalletLedgerEntryError {
    constructor(transactionId: unknown) {
        super(
            `Invalid ledger transaction id: ${String(transactionId)}`,
        );
    }
}

export class InvalidLedgerDirectionError
    extends WalletLedgerEntryError {
    constructor(direction: unknown) {
        super(
            `Invalid ledger direction: ${String(direction)}`,
        );
    }
}

export class InvalidLedgerDateError
    extends WalletLedgerEntryError {
    constructor(value: unknown) {
        super(
            `Invalid ledger createdAt: ${String(value)}`,
        );
    }
}

export class InvalidLedgerAmountError
    extends WalletLedgerEntryError {
    constructor() {
        super(
            'Ledger money must be greater than zero',
        );
    }
}

export class LedgerCurrencyMismatchError
    extends WalletLedgerEntryError {
    constructor(
        public readonly moneyCurrency: string,
        public readonly balanceBeforeCurrency: string,
        public readonly balanceAfterCurrency: string,
    ) {
        super(
            'Ledger currencies must match: ' +
            `money=${moneyCurrency}, ` +
            `balanceBefore=${balanceBeforeCurrency}, ` +
            `balanceAfter=${balanceAfterCurrency}`,
        );
    }
}

export class UnbalancedLedgerEntryError
    extends WalletLedgerEntryError {
    constructor() {
        super(
            'Ledger entry balanceBefore, money and ' +
            'balanceAfter do not satisfy the financial equation',
        );
    }
}

export class NegativeLedgerBalanceError
    extends WalletLedgerEntryError {
    constructor() {
        super(
            'Ledger balanceBefore and balanceAfter cannot be negative',
        );
    }
}

export class InvalidRehydratedLedgerEntryError
    extends WalletLedgerEntryError {
    constructor(reason: string) {
        super(
            `Invalid rehydrated ledger entry: ${reason}`,
        );
    }
}