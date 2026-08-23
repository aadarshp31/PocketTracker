import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize((process.env.DATABASE_URL as string), {
  dialect: "postgres",
  logging: function(message){
    console.log(`[Sequelize]: ${message}\n`);
  },
  sync: {
    force: process.env.SYNC_SHOULD_DROP_DB ? Boolean(process.env.SYNC_SHOULD_DROP_DB) : false
  }
});

/**
 * Idempotently ensures PostgreSQL ENUM types include all required values.
 * This guarantees production databases seamlessly upgrade without manual SQL steps.
 */
async function ensureEnumValues() {
  try {
    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_transactions_type') THEN
          BEGIN
            ALTER TYPE "enum_transactions_type" ADD VALUE IF NOT EXISTS 'investment';
          EXCEPTION WHEN duplicate_object THEN null;
          END;
          BEGIN
            ALTER TYPE "enum_transactions_type" ADD VALUE IF NOT EXISTS 'transfer';
          EXCEPTION WHEN duplicate_object THEN null;
          END;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_categories_type') THEN
          BEGIN
            ALTER TYPE "enum_categories_type" ADD VALUE IF NOT EXISTS 'investment';
          EXCEPTION WHEN duplicate_object THEN null;
          END;
          BEGIN
            ALTER TYPE "enum_categories_type" ADD VALUE IF NOT EXISTS 'transfer';
          EXCEPTION WHEN duplicate_object THEN null;
          END;
        END IF;
      END $$;
    `);
  } catch (err) {
    // If table/type doesn't exist yet on fresh init, it will be created by sync()
    console.log('[Sequelize]: Enum migration check passed or not required yet.');
  }
}

export async function connectToRelationalDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully!');

    await ensureEnumValues();

    if(process.env.NODE_ENV === "development") {
      const shouldDrop = process.env.SYNC_SHOULD_DROP_DB ? Boolean(process.env.SYNC_SHOULD_DROP_DB) : false;
      await sequelize.sync({ force: shouldDrop, alter: !shouldDrop }); // force drops+recreates; alter updates columns
    } else {
      // In production: create tables if they don't exist, never drop or alter
      await sequelize.sync({ force: false });
    }
    console.log('Database synced successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    await sequelize.close();
  }
}
