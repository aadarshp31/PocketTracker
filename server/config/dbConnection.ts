import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize((process.env.DATABASE_URL as string), {
  dialect: "postgres",
  sync: {
    force: false
  }
});

export async function connectToRelationalDatabase() {
  try {
    await sequelize.sync({ force: false }); // Ensures tables are created
    console.log('Database synced successfully.');
    await sequelize.authenticate();
    console.log('Database connected successfully!');
  } catch (error) {
    console.error('Error syncing database');
    console.error('Unable to connect to the database:', error);
    await sequelize.close();
  }
}
