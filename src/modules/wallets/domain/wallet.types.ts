import type { Money } from "../../../shared/domain/money/money.js";

export interface OpenWalletProps {
    id: string;
    playerId: string;
    initialBalance: Money;
    createdAt?: Date;
}

export interface WalletState {
    id: string;
    playerId: string;
    currency: string;
    balance: Money;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface WalletBalanceChange {
    readonly balanceBefore: Money;
    readonly balanceAfter: Money;
    readonly changed: boolean;
    readonly walletVersion: number;
}