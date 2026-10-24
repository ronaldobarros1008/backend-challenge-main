import {
  describe,
  expect,
  it,
} from 'bun:test';
 
import { Money } from '../../../shared/domain/money/money.js';
 
import {
  InsufficientFundsError,
  InvalidRehydratedWalletStateError,
  InvalidWalletVersionError,
  NegativeInitialBalanceError,
  NegativeWalletMovementError,
  WalletCurrencyMismatchError,
} from './wallet.errors.js';
 
import { Wallet } from './wallet.js';
 
describe('Wallet', () => {
  const walletId =
    '0192f291-27dd-7d3f-8071-5f8685deef37';
 
  const playerId =
    '0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1';
 
  const createdAt =
    new Date('2026-10-23T12:00:00.000Z');
 
  describe('open', () => {
    it('should open a wallet with version one', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.from({
          amount: '100.00',
          currency: 'BRL',
        }),
        createdAt,
      });
 
      expect(wallet.id).toBe(walletId);
      expect(wallet.playerId).toBe(playerId);
      expect(wallet.currency).toBe('BRL');
 
      expect(wallet.balance.toJSON()).toEqual({
        amount: '100.00',
        currency: 'BRL',
      });
 
      expect(wallet.version).toBe(1);
      expect(wallet.createdAt).toEqual(createdAt);
      expect(wallet.updatedAt).toEqual(createdAt);
    });
 
    it('should allow opening with zero balance', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.zero('BRL'),
        createdAt,
      });
 
      expect(wallet.balance.isZero()).toBe(true);
      expect(wallet.version).toBe(1);
    });
 
    it('should reject a negative initial balance', () => {
      const positive = Money.from({
        amount: '100.00',
        currency: 'BRL',
      });
 
      const negative = positive.negate();
 
      expect(() =>
        Wallet.open({
          id: walletId,
          playerId,
          initialBalance: negative,
          createdAt,
        }),
      ).toThrow(NegativeInitialBalanceError);
    });
 
    it('should protect internal dates from mutation', () => {
      const externalDate =
        new Date('2026-10-23T12:00:00.000Z');
 
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.zero('BRL'),
        createdAt: externalDate,
      });
 
      externalDate.setFullYear(2030);
 
      expect(wallet.createdAt.toISOString()).toBe(
        '2026-10-23T12:00:00.000Z',
      );
 
      const returnedDate = wallet.createdAt;
      returnedDate.setFullYear(2040);
 
      expect(wallet.createdAt.toISOString()).toBe(
        '2026-10-23T12:00:00.000Z',
      );
    });
  });
 
  describe('rehydrate', () => {
    it('should reconstruct a persisted wallet', () => {
      const updatedAt =
        new Date('2026-10-23T14:00:00.000Z');
 
      const wallet = Wallet.rehydrate({
        id: walletId,
        playerId,
        currency: 'BRL',
        balance: Money.from({
          amount: '75.00',
          currency: 'BRL',
        }),
        version: 4,
        createdAt,
        updatedAt,
      });
 
      expect(wallet.balance.toString()).toBe(
        '75.00 BRL',
      );
 
      expect(wallet.version).toBe(4);
      expect(wallet.updatedAt).toEqual(updatedAt);
    });
 
    it('should not increment version when rehydrating', () => {
      const wallet = Wallet.rehydrate({
        id: walletId,
        playerId,
        currency: 'BRL',
        balance: Money.from({
          amount: '75.00',
          currency: 'BRL',
        }),
        version: 8,
        createdAt,
        updatedAt: createdAt,
      });
 
      expect(wallet.version).toBe(8);
    });
 
    it('should reject an invalid persisted version', () => {
      expect(() =>
        Wallet.rehydrate({
          id: walletId,
          playerId,
          currency: 'BRL',
          balance: Money.zero('BRL'),
          version: 0,
          createdAt,
          updatedAt: createdAt,
        }),
      ).toThrow(InvalidWalletVersionError);
    });
 
    it('should reject inconsistent persisted currency', () => {
      expect(() =>
        Wallet.rehydrate({
          id: walletId,
          playerId,
          currency: 'USD',
          balance: Money.zero('BRL'),
          version: 1,
          createdAt,
          updatedAt: createdAt,
        }),
      ).toThrow(
        InvalidRehydratedWalletStateError,
      );
    });
  });
 
  describe('credit', () => {
    it('should credit the wallet', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.from({
          amount: '100.00',
          currency: 'BRL',
        }),
        createdAt,
      });
 
      const movementAt =
        new Date('2026-10-23T13:00:00.000Z');
 
      const change = wallet.credit(
        Money.from({
          amount: '25.00',
          currency: 'BRL',
        }),
        movementAt,
      );
 
      expect(change.balanceBefore.toString()).toBe(
        '100.00 BRL',
      );
 
      expect(change.balanceAfter.toString()).toBe(
        '125.00 BRL',
      );
 
      expect(change.changed).toBe(true);
      expect(change.walletVersion).toBe(2);
 
      expect(wallet.balance.toString()).toBe(
        '125.00 BRL',
      );
 
      expect(wallet.version).toBe(2);
      expect(wallet.updatedAt).toEqual(movementAt);
    });
 
    it('should not change version for zero credit', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.from({
          amount: '100.00',
          currency: 'BRL',
        }),
        createdAt,
      });
 
      const change = wallet.credit(
        Money.zero('BRL'),
        new Date('2026-10-23T15:00:00.000Z'),
      );
 
      expect(change.changed).toBe(false);
      expect(change.walletVersion).toBe(1);
      expect(wallet.version).toBe(1);
 
      expect(wallet.balance.toString()).toBe(
        '100.00 BRL',
      );
 
      expect(wallet.updatedAt).toEqual(createdAt);
    });
 
    it('should reject a negative credit', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.zero('BRL'),
        createdAt,
      });
 
      const negative = Money.from({
        amount: '10.00',
        currency: 'BRL',
      }).negate();
 
      expect(() =>
        wallet.credit(negative),
      ).toThrow(NegativeWalletMovementError);
 
      expect(wallet.version).toBe(1);
      expect(wallet.balance.isZero()).toBe(true);
    });
  });
 
  describe('debit', () => {
    it('should debit the wallet', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.from({
          amount: '100.00',
          currency: 'BRL',
        }),
        createdAt,
      });
 
      const movementAt =
        new Date('2026-10-23T13:00:00.000Z');
 
      const change = wallet.debit(
        Money.from({
          amount: '25.00',
          currency: 'BRL',
        }),
        movementAt,
      );
 
      expect(change.balanceBefore.toString()).toBe(
        '100.00 BRL',
      );
 
      expect(change.balanceAfter.toString()).toBe(
        '75.00 BRL',
      );
 
      expect(change.changed).toBe(true);
      expect(change.walletVersion).toBe(2);
 
      expect(wallet.balance.toString()).toBe(
        '75.00 BRL',
      );
 
      expect(wallet.version).toBe(2);
      expect(wallet.updatedAt).toEqual(movementAt);
    });
 
    it('should allow debiting the entire balance', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.from({
          amount: '100.00',
          currency: 'BRL',
        }),
        createdAt,
      });
 
      wallet.debit(
        Money.from({
          amount: '100.00',
          currency: 'BRL',
        }),
      );
 
      expect(wallet.balance.isZero()).toBe(true);
      expect(wallet.version).toBe(2);
    });
 
    it('should reject debit with insufficient funds', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.from({
          amount: '20.00',
          currency: 'BRL',
        }),
        createdAt,
      });
 
      expect(() =>
        wallet.debit(
          Money.from({
            amount: '80.00',
            currency: 'BRL',
          }),
        ),
      ).toThrow(InsufficientFundsError);
 
      expect(wallet.balance.toString()).toBe(
        '20.00 BRL',
      );
 
      expect(wallet.version).toBe(1);
      expect(wallet.updatedAt).toEqual(createdAt);
    });
 
    it('should not change version for zero debit', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.from({
          amount: '100.00',
          currency: 'BRL',
        }),
        createdAt,
      });
 
      const change = wallet.debit(
        Money.zero('BRL'),
      );
 
      expect(change.changed).toBe(false);
      expect(wallet.version).toBe(1);
 
      expect(wallet.balance.toString()).toBe(
        '100.00 BRL',
      );
    });
 
    it('should reject a negative debit', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.from({
          amount: '100.00',
          currency: 'BRL',
        }),
        createdAt,
      });
 
      const negative = Money.from({
        amount: '10.00',
        currency: 'BRL',
      }).negate();
 
      expect(() =>
        wallet.debit(negative),
      ).toThrow(NegativeWalletMovementError);
 
      expect(wallet.balance.toString()).toBe(
        '100.00 BRL',
      );
 
      expect(wallet.version).toBe(1);
    });
  });
 
  describe('currency validation', () => {
    it('should reject credit in another currency', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.zero('BRL'),
        createdAt,
      });
 
      expect(() =>
        wallet.credit(
          Money.from({
            amount: '10.00',
            currency: 'USD',
          }),
        ),
      ).toThrow(WalletCurrencyMismatchError);
 
      expect(wallet.version).toBe(1);
    });
 
    it('should reject debit in another currency', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.from({
          amount: '100.00',
          currency: 'BRL',
        }),
        createdAt,
      });
 
      expect(() =>
        wallet.debit(
          Money.from({
            amount: '10.00',
            currency: 'USD',
          }),
        ),
      ).toThrow(WalletCurrencyMismatchError);
 
      expect(wallet.version).toBe(1);
 
      expect(wallet.balance.toString()).toBe(
        '100.00 BRL',
      );
    });
  });
 
  describe('version', () => {
    it('should increment only when balance changes', () => {
      const wallet = Wallet.open({
        id: walletId,
        playerId,
        initialBalance: Money.from({
          amount: '100.00',
          currency: 'BRL',
        }),
        createdAt,
      });
 
      expect(wallet.version).toBe(1);
 
      wallet.credit(
        Money.from({
          amount: '50.00',
          currency: 'BRL',
        }),
      );
 
      expect(wallet.version).toBe(2);
 
      wallet.debit(Money.zero('BRL'));
 
      expect(wallet.version).toBe(2);
 
      wallet.debit(
        Money.from({
          amount: '20.00',
          currency: 'BRL',
        }),
      );
 
      expect(wallet.version).toBe(3);
 
      expect(() =>
        wallet.debit(
          Money.from({
            amount: '1000.00',
            currency: 'BRL',
          }),
        ),
      ).toThrow(InsufficientFundsError);
 
      expect(wallet.version).toBe(3);
    });
  });
});