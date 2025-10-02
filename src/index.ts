
import { initializeDatabase } from './providers/appDataSource.js';
import botCLient from "./providers/client.js";


export const AppDataSource = await initializeDatabase();



export const client = botCLient;
