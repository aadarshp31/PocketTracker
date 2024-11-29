import { Sequelize, DataType } from 'sequelize';

export const sequelize = new Sequelize((process.env.DATABASE_URL as string), {
  dialect: "postgres",
  sync: {
    force: false
  }
});


export async function connectToRelationalDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully!');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    await sequelize.close();
  }
}

sequelize.sync({ force: false }) // Ensures tables are created
  .then(() => console.log('Database synced successfully.'))
  .catch(error => console.error('Error syncing database:', error));
