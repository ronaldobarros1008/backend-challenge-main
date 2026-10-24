export abstract class MoneyError extends Error {
    protected constructor(message: string) {
        super(message);

        this.name = new.target.name;

        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class InvalidMoneyAmountError extends MoneyError {
    constructor(amount: unknown) {
        super(`Invalid money amount: ${String(amount)}`);
    }
}

export class InvalidCurrencyError extends MoneyError {
    constructor(currency: unknown) {
        super(`Invalid currency: ${String(currency)}`);
    }
}

export class CurrencyMismatchError extends MoneyError {
    constructor(
        public readonly leftCurrency: string,
        public readonly rightCurrency: string,
    ) {
        super(
            `Cannot operate money with different currencies: ` +
            `${leftCurrency} and ${rightCurrency}`,
        );
    }
} 