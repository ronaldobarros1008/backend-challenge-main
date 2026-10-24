export abstract class WagerTransactionError
    extends Error {
    protected constructor(message: string) {
        super(message);

        this.name = new.target.name;

        Object.setPrototypeOf(
            this,
            new.target.prototype,
        );
    }
}

export class InvalidWagerTransactionFieldError
    extends WagerTransactionError {
    constructor(
        public readonly field: string,
        value: unknown,
    ) {
        super(
            `Invalid wager transaction field ` +
            `"${field}": ${String(value)}`,
        );
    }
}

export class InvalidWagerTransactionKindError
    extends WagerTransactionError {
    constructor(kind: unknown) {
        super(
            `Invalid wager transaction kind: ` +
            `${String(kind)}`,
        );
    }
}

export class InvalidWagerTransactionStatusError
    extends WagerTransactionError {
    constructor(status: unknown) {
        super(
            `Invalid wager transaction status: ` +
            `${String(status)}`,
        );
    }
}

export class InvalidWagerTransactionAmountError
    extends WagerTransactionError {
    constructor() {
        super(
            'Wager transaction money must be greater than zero',
        );
    }
}

export class ReferenceRequiredError
    extends WagerTransactionError {
    constructor(kind: string) {
        super(
            `${kind} transaction requires ` +
            'referenceExternalTransactionId',
        );
    }
}

export class UnexpectedReferenceError
    extends WagerTransactionError {
    constructor(kind: string) {
        super(
            `${kind} transaction cannot have ` +
            'referenceExternalTransactionId',
        );
    }
}

export class InvalidTransactionStateError
    extends WagerTransactionError {
    constructor(
        public readonly currentStatus: string,
        public readonly attemptedTransition: string,
    ) {
        super(
            `Cannot execute "${attemptedTransition}" ` +
            `when transaction status is ` +
            `"${currentStatus}"`,
        );
    }
}

export class MissingFailureCodeError
    extends WagerTransactionError {
    constructor(status: string) {
        super(
            `Transaction with status ${status} ` +
            'must contain a failure code',
        );
    }
}

export class UnexpectedFailureCodeError
    extends WagerTransactionError {
    constructor(status: string) {
        super(
            `Transaction with status ${status} ` +
            'cannot contain a failure code',
        );
    }
}

export class MissingProcessedAtError
    extends WagerTransactionError {
    constructor() {
        super(
            'Processed transaction must contain processedAt',
        );
    }
}

export class UnexpectedProcessedAtError
    extends WagerTransactionError {
    constructor(status: string) {
        super(
            `Transaction with status ${status} ` +
            'cannot contain processedAt',
        );
    }
}

export class MissingReferenceTransactionError
    extends WagerTransactionError {
    constructor(kind: string) {
        super(
            `${kind} transaction requires a resolved ` +
            'reference transaction',
        );
    }
}

export class InvalidReferenceTransactionError
    extends WagerTransactionError {
    constructor(reason: string) {
        super(
            `Invalid reference transaction: ${reason}`,
        );
    }
}

export class TransactionDoesNotAffectBalanceError
    extends WagerTransactionError {
    constructor(kind: string) {
        super(
            `${kind} transaction does not affect balance ` +
            'and therefore has no ledger direction',
        );
    }
}