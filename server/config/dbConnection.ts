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

export async function connectToRelationalDatabase() {
  try {
    if(process.env.NODE_ENV === "development") {
      const shouldDrop = process.env.SYNC_SHOULD_DROP_DB ? Boolean(process.env.SYNC_SHOULD_DROP_DB) : false;
      await sequelize.sync({ force: shouldDrop, alter: !shouldDrop }); // force drops+recreates; alter updates columns
    } else {
      // In production: create tables if they don't exist, never drop or alter
      await sequelize.sync({ force: false });
    }
    console.log('Database synced successfully.');
    
    await sequelize.authenticate();
    console.log('Database connected successfully!');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    await sequelize.close();
  }
}
