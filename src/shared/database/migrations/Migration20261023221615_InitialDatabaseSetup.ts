import { Migration } from '@mikro-orm/migrations';

export class Migration20261023221615_InitialDatabaseSetup extends Migration {
  
override async up(): Promise<void> {
    this.addSql(
      'create extension if not exists "pgcrypto";',
    );
  }
 
  override async down(): Promise<void> {
    this.addSql(
      'drop extension if exists "pgcrypto";',
    );
  }
}
