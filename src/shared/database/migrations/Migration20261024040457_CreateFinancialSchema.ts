import { Migration } from '@mikro-orm/migrations';

export class Migration20261024040457_CreateFinancialSchema extends Migration {
  override async up(): Promise<void> {
    this.createEnumTypes();
    this.createWalletsTable();
    this.createWagerTransactionsTable();
    this.createLedgerTable();
    this.createIndexes();
    this.createLedgerImmutabilityTrigger();
  }

  override async down(): Promise<void> {
    this.dropLedgerImmutabilityTrigger();
    this.dropTables();
    this.dropEnumTypes();
  }

  private createEnumTypes(): void {
    this.addSql(`
      create type "ledger_direction" as enum (
        'DEBIT',
        'CREDIT'
      );
    `);

    this.addSql(`
      create type "wager_transaction_kind" as enum (
        'OPENING',
        'BET',
        'WIN',
        'LOSS',
        'REFUND',
        'ROLLBACK'
      );
    `);

    this.addSql(`
      create type "wager_transaction_status" as enum (
        'PENDING',
        'PENDING_REFERENCE',
        'PROCESSED',
        'REJECTED',
        'FAILED'
      );
    `);

    this.addSql(`
      create type "wager_failure_code" as enum (
        'INSUFFICIENT_FUNDS',
        'ROLLBACK_WOULD_RESULT_IN_NEGATIVE_BALANCE',
        'CURRENCY_MISMATCH',
        'WALLET_NOT_FOUND',
        'PLAYER_WALLET_MISMATCH',
        'REFERENCE_NOT_FOUND',
        'INVALID_REFERENCE_KIND',
        'REFERENCE_AMOUNT_MISMATCH',
        'REFERENCE_CONTEXT_MISMATCH',
        'REFERENCE_ALREADY_REFUNDED',
        'REFERENCE_ALREADY_ROLLED_BACK',
        'IDEMPOTENCY_CONFLICT',
        'INVALID_TRANSACTION_STATE',
        'INVALID_AMOUNT',
        'INVALID_CURRENCY',
        'INFRASTRUCTURE_PERMANENT_FAILURE'
      );
    `);
  }

  private createWalletsTable(): void {
    this.addSql(`
      create table "wallets" (
        "id" uuid not null,
        "player_id" uuid not null,
        "currency" char(3) not null,
        "balance_amount" numeric(19, 2) not null,
        "version" integer not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
 
        constraint "pk_wallets"
          primary key ("id"),
 
        constraint "uq_wallets_player_currency"
          unique ("player_id", "currency"),
 
        constraint "ck_wallets_currency"
          check ("currency" ~ '^[A-Z]{3}$'),
 
        constraint "ck_wallets_balance_non_negative"
          check ("balance_amount" >= 0),
 
        constraint "ck_wallets_balance_scale"
          check (
            "balance_amount" =
            round("balance_amount", 2)
          ),
 
        constraint "ck_wallets_version"
          check ("version" >= 1),
 
        constraint "ck_wallets_timestamps"
          check ("updated_at" >= "created_at")
      );
    `);
  }

  private createWagerTransactionsTable(): void {
    this.addSql(`
      create table "wager_transactions" (
        "id" uuid not null,
        "provider_id" varchar(100) not null,
        "external_transaction_id"
          varchar(255) not null,
        "idempotency_key" varchar(255) not null,
        "payload_hash" char(64) not null,
        "wallet_id" uuid not null,
        "player_id" uuid not null,
        "round_id" varchar(255) not null,
        "game_id" varchar(255) not null,
        "kind" wager_transaction_kind not null,
        "amount" numeric(19, 2) not null,
        "currency" char(3) not null,
 
        "reference_external_transaction_id"
          varchar(255) null,
 
        "reference_transaction_id" uuid null,
 
        "status"
          wager_transaction_status not null,
 
        "failure_code"
          wager_failure_code null,
 
        "balance_after" numeric(19, 2) null,
 
        "created_at" timestamptz not null,
        "processed_at" timestamptz null,
 
        "reference_attempts"
          integer not null default 0,
 
        "next_reference_attempt_at"
          timestamptz null,
 
        constraint "pk_wager_transactions"
          primary key ("id"),
 
        constraint
          "uq_wager_transactions_idempotency_key"
          unique ("idempotency_key"),
 
        constraint
          "uq_wager_transactions_provider_external"
          unique (
            "provider_id",
            "external_transaction_id"
          ),
 
        constraint
          "fk_wager_transactions_wallet"
          foreign key ("wallet_id")
          references "wallets" ("id")
          on update restrict
          on delete restrict,
 
        constraint
          "fk_wager_transactions_reference"
          foreign key ("reference_transaction_id")
          references "wager_transactions" ("id")
          on update restrict
          on delete restrict,
 
        constraint
          "ck_wager_provider_not_blank"
          check (
            length(trim("provider_id")) > 0
          ),
 
        constraint
          "ck_wager_external_id_not_blank"
          check (
            length(
              trim("external_transaction_id")
            ) > 0
          ),
 
        constraint
          "ck_wager_idempotency_key_not_blank"
          check (
            length(trim("idempotency_key")) > 0
          ),
 
        constraint
          "ck_wager_round_id_not_blank"
          check (
            length(trim("round_id")) > 0
          ),
 
        constraint
          "ck_wager_game_id_not_blank"
          check (
            length(trim("game_id")) > 0
          ),
 
        constraint
          "ck_wager_payload_hash"
          check (
            "payload_hash" ~ '^[0-9a-f]{64}$'
          ),
 
        constraint
          "ck_wager_currency"
          check (
            "currency" ~ '^[A-Z]{3}$'
          ),
 
        constraint
          "ck_wager_amount_positive"
          check ("amount" > 0),
 
        constraint
          "ck_wager_amount_scale"
          check (
            "amount" = round("amount", 2)
          ),
 
        constraint
          "ck_wager_balance_after_non_negative"
          check (
            "balance_after" is null
            or "balance_after" >= 0
          ),
 
        constraint
          "ck_wager_balance_after_scale"
          check (
            "balance_after" is null
            or "balance_after" =
              round("balance_after", 2)
          ),
 
        constraint
          "ck_wager_reference_attempts"
          check ("reference_attempts" >= 0),
 
        constraint
          "ck_wager_reference_external_by_kind"
          check (
            (
              "kind" in ('REFUND', 'ROLLBACK')
              and
              "reference_external_transaction_id"
                is not null
              and
              length(
                trim(
                  "reference_external_transaction_id"
                )
              ) > 0
            )
            or
            (
              "kind" = 'WIN'
            )
            or
            (
              "kind" in (
                'OPENING',
                'BET',
                'LOSS'
              )
              and
              "reference_external_transaction_id"
                is null
            )
          ),
 
        constraint
          "ck_wager_processed_reference"
          check (
            "status" <> 'PROCESSED'
            or
            "kind" not in ('REFUND', 'ROLLBACK')
            or
            "reference_transaction_id" is not null
          ),
 
        constraint
          "ck_wager_status_metadata"
          check (
            (
              "status" = 'PROCESSED'
              and
              "processed_at" is not null
              and
              "failure_code" is null
            )
            or
            (
              "status" in (
                'REJECTED',
                'FAILED'
              )
              and
              "processed_at" is null
              and
              "failure_code" is not null
            )
            or
            (
              "status" in (
                'PENDING',
                'PENDING_REFERENCE'
              )
              and
              "processed_at" is null
              and
              "failure_code" is null
            )
          ),
 
        constraint
          "ck_wager_processed_at"
          check (
            "processed_at" is null
            or
            "processed_at" >= "created_at"
          ),
 
        constraint
          "ck_wager_pending_reference_kind"
          check (
            "status" <> 'PENDING_REFERENCE'
            or
            "kind" in ('REFUND', 'ROLLBACK')
          ),
 
        constraint
          "ck_wager_next_reference_attempt"
          check (
            (
              "status" = 'PENDING_REFERENCE'
            )
            or
            (
              "next_reference_attempt_at" is null
            )
          )
      );
    `);
  }

  private createLedgerTable(): void {
    this.addSql(`
      create table "wallet_ledger_entries" (
        "id" uuid not null,
        "wallet_id" uuid not null,
        "transaction_id" uuid not null,
        "direction" ledger_direction not null,
        "amount" numeric(19, 2) not null,
        "currency" char(3) not null,
        "balance_before" numeric(19, 2) not null,
        "balance_after" numeric(19, 2) not null,
        "created_at" timestamptz not null,
 
        constraint "pk_wallet_ledger_entries"
          primary key ("id"),
 
        constraint
          "uq_ledger_wallet_transaction"
          unique (
            "wallet_id",
            "transaction_id"
          ),
 
        constraint
          "fk_ledger_wallet"
          foreign key ("wallet_id")
          references "wallets" ("id")
          on update restrict
          on delete restrict,
 
        constraint
          "fk_ledger_transaction"
          foreign key ("transaction_id")
          references "wager_transactions" ("id")
          on update restrict
          on delete restrict,
 
        constraint
          "ck_ledger_currency"
          check (
            "currency" ~ '^[A-Z]{3}$'
          ),
 
        constraint
          "ck_ledger_amount_positive"
          check ("amount" > 0),
 
        constraint
          "ck_ledger_amount_scale"
          check (
            "amount" = round("amount", 2)
          ),
 
        constraint
          "ck_ledger_balance_before_non_negative"
          check ("balance_before" >= 0),
 
        constraint
          "ck_ledger_balance_after_non_negative"
          check ("balance_after" >= 0),
 
        constraint
          "ck_ledger_balance_before_scale"
          check (
            "balance_before" =
            round("balance_before", 2)
          ),
 
        constraint
          "ck_ledger_balance_after_scale"
          check (
            "balance_after" =
            round("balance_after", 2)
          ),
 
        constraint
          "ck_ledger_balanced"
          check (
            (
              "direction" = 'CREDIT'
              and
              "balance_before" + "amount"
                = "balance_after"
            )
            or
            (
              "direction" = 'DEBIT'
              and
              "balance_before" - "amount"
                = "balance_after"
            )
          )
      );
    `);
  }

  private createIndexes(): void {
    this.addSql(`
      create index
        "idx_wager_transactions_wallet_created"
      on "wager_transactions" (
        "wallet_id",
        "created_at",
        "id"
      );
    `);

    this.addSql(`
      create index
        "idx_wager_transactions_reference_lookup"
      on "wager_transactions" (
        "provider_id",
        "reference_external_transaction_id"
      )
      where
        "reference_external_transaction_id"
          is not null;
    `);

    this.addSql(`
      create index
        "idx_wager_pending_reference_due"
      on "wager_transactions" (
        "next_reference_attempt_at",
        "created_at",
        "id"
      )
      where
        "status" = 'PENDING_REFERENCE';
    `);

    this.addSql(`
      create index
        "idx_wager_reference_transaction"
      on "wager_transactions" (
        "reference_transaction_id"
      )
      where
        "reference_transaction_id" is not null;
    `);

    this.addSql(`
      create unique index
        "uq_wager_reference_refund"
      on "wager_transactions" (
        "reference_transaction_id"
      )
      where
        "kind" = 'REFUND'
        and
        "reference_transaction_id" is not null
        and
        "status" in (
          'PENDING',
          'PENDING_REFERENCE',
          'PROCESSED'
        );
    `);

    this.addSql(`
      create unique index
        "uq_wager_reference_rollback"
      on "wager_transactions" (
        "reference_transaction_id"
      )
      where
        "kind" = 'ROLLBACK'
        and
        "reference_transaction_id" is not null
        and
        "status" in (
          'PENDING',
          'PENDING_REFERENCE',
          'PROCESSED'
        );
    `);

    this.addSql(`
      create index
        "idx_ledger_wallet_cursor"
      on "wallet_ledger_entries" (
        "wallet_id",
        "created_at" desc,
        "id" desc
      );
    `);

    this.addSql(`
      create index
        "idx_ledger_transaction"
      on "wallet_ledger_entries" (
        "transaction_id"
      );
    `);
  }

  private createLedgerImmutabilityTrigger(): void {
    this.addSql(`
      create or replace function
        prevent_wallet_ledger_mutation()
      returns trigger
      language plpgsql
      as $function$
      begin
        raise exception
          'wallet ledger entries are immutable'
          using errcode = '55000';
      end;
      $function$;
    `);

    this.addSql(`
      create trigger
        "trg_wallet_ledger_entries_immutable"
      before update or delete
      on "wallet_ledger_entries"
      for each row
      execute function
        prevent_wallet_ledger_mutation();
    `);
  }

  private dropLedgerImmutabilityTrigger(): void {
    this.addSql(`
      drop trigger if exists
        "trg_wallet_ledger_entries_immutable"
      on "wallet_ledger_entries";
    `);

    this.addSql(`
      drop function if exists
        prevent_wallet_ledger_mutation();
    `);
  }

  private dropTables(): void {
    this.addSql(`
      drop table if exists
        "wallet_ledger_entries";
    `);

    this.addSql(`
      drop table if exists
        "wager_transactions";
    `);

    this.addSql(`
      drop table if exists
        "wallets";
    `);
  }

  private dropEnumTypes(): void {
    this.addSql(`
      drop type if exists
        "wager_failure_code";
    `);

    this.addSql(`
      drop type if exists
        "wager_transaction_status";
    `);

    this.addSql(`
      drop type if exists
        "wager_transaction_kind";
    `);

    this.addSql(`
      drop type if exists
        "ledger_direction";
    `);
  }
}
