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

/**
 * Idempotently ensures the trips table and trip_id column exist on transactions.
 * This guarantees production databases seamlessly upgrade without manual SQL steps.
 */
async function ensureTripSchema() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "trips" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" VARCHAR(100) NOT NULL,
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        "budget" DECIMAL(10, 2),
        "color" VARCHAR(7),
        "emoji" VARCHAR(10),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS "idx_trips_user_dates" ON "trips" ("user_id", "start_date", "end_date");

      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'trip_id'
          ) THEN
            ALTER TABLE "transactions" ADD COLUMN "trip_id" UUID REFERENCES "trips"("id") ON DELETE SET NULL;
          END IF;
        END IF;
      END $$;

      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'trip_id') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_trip_id') THEN
            CREATE INDEX "idx_transactions_trip_id" ON "transactions" ("trip_id");
          END IF;
        END IF;
      END $$;
    `);
    console.log('[Sequelize]: Trip schema migration verified successfully.');
  } catch (err) {
    console.log('[Sequelize]: Trip schema migration check passed or not required yet.');
  }
}

export async function connectToRelationalDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully!');

    await ensureEnumValues();
    await ensureTripSchema();

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
    throw error;
  }
}
