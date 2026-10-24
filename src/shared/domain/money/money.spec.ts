import { describe, expect, it } from 'bun:test';

import {
    CurrencyMismatchError,
    InvalidCurrencyError,
    InvalidMoneyAmountError,
} from './money.errors.js';

import { Money } from './money.js';

describe('Money', () => {
    describe('from', () => {
        it('should create money from a valid value', () => {
            const money = Money.from({
                amount: '25.00',
                currency: 'BRL',
            });

            expect(money.toJSON()).toEqual({
                amount: '25.00',
                currency: 'BRL',
            });
        });

        it('should preserve large values exactly', () => {
            const money = Money.from({
                amount: '999999999999999999.99',
                currency: 'BRL',
            });

            expect(money.toJSON()).toEqual({
                amount: '999999999999999999.99',
                currency: 'BRL',
            });
        });

        it.each([
            '',
            '25',
            '25.0',
            '25.000',
            '01.00',
            '-1.00',
            '+1.00',
            '1e3',
            '1E3',
            'NaN',
            'Infinity',
            '.50',
            '1.',
            ' 25.00',
            '25.00 ',
            '25,00',
        ])('should reject invalid amount "%s"', (amount) => {
            expect(() =>
                Money.from({
                    amount,
                    currency: 'BRL',
                }),
            ).toThrow(InvalidMoneyAmountError);
        });

        it('should reject a runtime number value', () => {
            expect(() =>
                Money.from({
                    amount: 25 as unknown as string,
                    currency: 'BRL',
                }),
            ).toThrow(InvalidMoneyAmountError);
        });

        it.each([
            '',
            'BR',
            'BRLL',
            'brl',
            'Brl',
            '123',
            ' BRL',
            'BRL ',
        ])('should reject invalid currency "%s"', (currency) => {
            expect(() =>
                Money.from({
                    amount: '25.00',
                    currency,
                }),
            ).toThrow(InvalidCurrencyError);
        });
    });

    describe('zero', () => {
        it('should create zero money', () => {
            const money = Money.zero('BRL');

            expect(money.toJSON()).toEqual({
                amount: '0.00',
                currency: 'BRL',
            });
            expect(money.isZero()).toBe(true);
            expect(money.isPositive()).toBe(false);
            expect(money.isNegative()).toBe(false);
        });
    });

    describe('add', () => {
        it('should add money with exact precision', () => {
            const first = Money.from({ amount: '0.10', currency: 'BRL' });
            const second = Money.from({ amount: '0.20', currency: 'BRL' });

            const result = first.add(second);

            expect(result.toJSON()).toEqual({
                amount: '0.30',
                currency: 'BRL',
            });
        });

        it('should not mutate the original values', () => {
            const first = Money.from({ amount: '10.00', currency: 'BRL' });
            const second = Money.from({ amount: '5.00', currency: 'BRL' });

            const result = first.add(second);

            expect(first.toString()).toBe('10.00 BRL');
            expect(second.toString()).toBe('5.00 BRL');
            expect(result.toString()).toBe('15.00 BRL');
            expect(result).not.toBe(first);
            expect(result).not.toBe(second);
        });

        it('should reject different currencies', () => {
            const brl = Money.from({ amount: '10.00', currency: 'BRL' });
            const usd = Money.from({ amount: '5.00', currency: 'USD' });

            expect(() => brl.add(usd)).toThrow(CurrencyMismatchError);
        });
    });

    describe('subtract', () => {
        it('should subtract money', () => {
            const balance = Money.from({ amount: '100.00', currency: 'BRL' });
            const debit = Money.from({ amount: '25.00', currency: 'BRL' });

            const result = balance.subtract(debit);

            expect(result.toString()).toBe('75.00 BRL');
        });

        it('should represent a negative internal result', () => {
            const balance = Money.from({ amount: '20.00', currency: 'BRL' });
            const debit = Money.from({ amount: '50.00', currency: 'BRL' });

            const result = balance.subtract(debit);

            expect(result.toString()).toBe('-30.00 BRL');
            expect(result.isNegative()).toBe(true);
        });

        it('should reject different currencies', () => {
            const brl = Money.from({ amount: '10.00', currency: 'BRL' });
            const usd = Money.from({ amount: '5.00', currency: 'USD' });

            expect(() => brl.subtract(usd)).toThrow(CurrencyMismatchError);
        });
    });

    describe('negate', () => {
        it('should negate a positive value', () => {
            const money = Money.from({ amount: '25.00', currency: 'BRL' });

            const result = money.negate();

            expect(result.toString()).toBe('-25.00 BRL');
            expect(result.isNegative()).toBe(true);
            expect(money.toString()).toBe('25.00 BRL');
        });

        it('should preserve zero as zero', () => {
            const result = Money.zero('BRL').negate();

            expect(result.toString()).toBe('0.00 BRL');
            expect(result.isZero()).toBe(true);
        });
    });

    describe('comparisons', () => {
        it('should identify a positive value', () => {
            const money = Money.from({ amount: '0.01', currency: 'BRL' });

            expect(money.isPositive()).toBe(true);
            expect(money.isNegative()).toBe(false);
            expect(money.isZero()).toBe(false);
        });

        it('should compare values', () => {
            const smaller = Money.from({ amount: '10.00', currency: 'BRL' });
            const greater = Money.from({ amount: '20.00', currency: 'BRL' });

            expect(smaller.isLessThan(greater)).toBe(true);
            expect(greater.isLessThan(smaller)).toBe(false);
        });

        it('should reject currency mismatch when comparing', () => {
            const brl = Money.from({ amount: '10.00', currency: 'BRL' });
            const usd = Money.from({ amount: '20.00', currency: 'USD' });

            expect(() => brl.isLessThan(usd)).toThrow(CurrencyMismatchError);
        });

        it('should return true for equal money', () => {
            const first = Money.from({ amount: '25.00', currency: 'BRL' });
            const second = Money.from({ amount: '25.00', currency: 'BRL' });

            expect(first.equals(second)).toBe(true);
        });

        it('should return false for different values', () => {
            const first = Money.from({ amount: '25.00', currency: 'BRL' });
            const second = Money.from({ amount: '26.00', currency: 'BRL' });

            expect(first.equals(second)).toBe(false);
        });

        it('should return false for different currencies', () => {
            const brl = Money.from({ amount: '25.00', currency: 'BRL' });
            const usd = Money.from({ amount: '25.00', currency: 'USD' });

            expect(brl.equals(usd)).toBe(false);
        });
    });

    describe('serialization', () => {
        it('should always serialize with two decimal places', () => {
            const money = Money.zero('BRL').add(
                Money.from({ amount: '5.00', currency: 'BRL' }),
            );

            expect(money.toJSON()).toEqual({
                amount: '5.00',
                currency: 'BRL',
            });
            expect(money.toString()).toBe('5.00 BRL');
        });

        it('should return a frozen JSON representation', () => {
            const money = Money.from({ amount: '25.00', currency: 'BRL' });

            expect(Object.isFrozen(money.toJSON())).toBe(true);
        });
    });
});
