import {
    Entity,
    PrimaryKey,
    Property,
    Unique,
} from '@mikro-orm/decorators/legacy';

@Entity({
    tableName: 'wallets',
})
@Unique({
    name: 'uq_wallets_player_currency',
    properties: ['playerId', 'currency'],
})
export class WalletEntity {
    @PrimaryKey({
        type: 'uuid',
    })
    id!: string;

    @Property({
        fieldName: 'player_id',
        type: 'uuid',
    })
    playerId!: string;

    @Property({
        fieldName: 'currency',
        columnType: 'char(3)',
        length: 3,
    })
    currency!: string;

    @Property({
        fieldName: 'balance_amount',
        columnType: 'numeric(19, 2)',
    })
    balanceAmount!: string;

    @Property({
        fieldName: 'version',
        columnType: 'integer',
    })
    version!: number;

    @Property({
        fieldName: 'created_at',
        columnType: 'timestamptz',
    })
    createdAt!: Date;

    @Property({
        fieldName: 'updated_at',
        columnType: 'timestamptz',
    })
    updatedAt!: Date;
}