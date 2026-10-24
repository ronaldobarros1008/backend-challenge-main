import { Decimal } from 'decimal.js';

import {
    CurrencyMismatchError,
    InvalidCurrencyError,
    InvalidMoneyAmountError,
} from './money.errors.js';

import type { MoneyProps } from './money.types.js';

const MoneyDecimal = Decimal.clone({
    precision: 40,
    rounding: Decimal.ROUND_HALF_EVEN,
    toExpNeg: -100,
    toExpPos: 100,
});

export class Money {
    private static readonly AMOUNT_PATTERN = /^(0|[1-9]\d*)\.\d{2}$/;

    private static readonly CURRENCY_PATTERN = /^[A-Z]{3}$/;

    private constructor(
        private readonly value: Decimal,
        public readonly currency: string,
    ) {}

    static from(props: MoneyProps): Money {
        Money.assertValidProps(props);
        Money.assertValidExternalAmount(props.amount);
        Money.assertValidCurrency(props.currency);

        return new Money(
            new MoneyDecimal(props.amount),
            props.currency,
        );
    }

    static zero(currency: string): Money {
        Money.assertValidCurrency(currency);

        return new Money(
            new MoneyDecimal('0.00'),
            currency,
        );
    }

    add(other: Money): Money {
        this.assertSameCurrency(other);

        return Money.fromDecimal(
            this.value.plus(other.value),
            this.currency,
        );
    }

    subtract(other: Money): Money {
        this.assertSameCurrency(other);

        return Money.fromDecimal(
            this.value.minus(other.value),
            this.currency,
        );
    }

    negate(): Money {
        return Money.fromDecimal(
            this.value.negated(),
            this.currency,
        );
    }

    isZero(): boolean {
        return this.value.isZero();
    }

    isPositive(): boolean {
        return this.value.isPositive() && !this.value.isZero();
    }

    isNegative(): boolean {
        return this.value.isNegative() && !this.value.isZero();
    }

    isLessThan(other: Money): boolean {
        this.assertSameCurrency(other);

        return this.value.lessThan(other.value);
    }

    equals(other: Money): boolean {
        if (this.currency !== other.currency) {
            return false;
        }

        return this.value.equals(other.value);
    }

    toJSON(): MoneyProps {
        return Object.freeze({
            amount: this.value.toFixed(2),
            currency: this.currency,
        });
    }

    toString(): string {
        return `${this.value.toFixed(2)} ${this.currency}`;
    }

    private static fromDecimal(
        value: Decimal,
        currency: string,
    ): Money {
        Money.assertValidCurrency(currency);
        Money.assertFiniteDecimal(value);
        Money.assertScale(value);

        return new Money(
            new MoneyDecimal(value.toFixed(2)),
            currency,
        );
    }

    private static assertValidProps(props: MoneyProps): void {
        if (
            props === null ||
            typeof props !== 'object' ||
            Array.isArray(props)
        ) {
            throw new InvalidMoneyAmountError(props);
        }
    }

    private static assertValidExternalAmount(
        amount: unknown,
    ): asserts amount is string {
        if (
            typeof amount !== 'string' ||
            amount.trim() !== amount ||
            !Money.AMOUNT_PATTERN.test(amount)
        ) {
            throw new InvalidMoneyAmountError(amount);
        }

        let decimal: Decimal;

        try {
            decimal = new MoneyDecimal(amount);
        } catch {
            throw new InvalidMoneyAmountError(amount);
        }

        Money.assertFiniteDecimal(decimal);

        if (decimal.isNegative()) {
            throw new InvalidMoneyAmountError(amount);
        }
    }

    private static assertValidCurrency(
        currency: unknown,
    ): asserts currency is string {
        if (
            typeof currency !== 'string' ||
            currency.length !== 3 ||
            !Money.CURRENCY_PATTERN.test(currency)
        ) {
            throw new InvalidCurrencyError(currency);
        }
    }

    private static assertFiniteDecimal(value: Decimal): void {
        if (!value.isFinite() || value.isNaN()) {
            throw new InvalidMoneyAmountError(value.toString());
        }
    }

    private static assertScale(value: Decimal): void {
        if (value.decimalPlaces() > 2) {
            throw new InvalidMoneyAmountError(value.toString());
        }
    }

    private assertSameCurrency(other: Money): void {
        if (this.currency !== other.currency) {
            throw new CurrencyMismatchError(
                this.currency,
                other.currency,
            );
        }
    }
}