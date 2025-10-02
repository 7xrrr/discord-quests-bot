import path from "path";
import config from "../config/config.js";
import { DatabaseConfig } from "../core/databaseConfig.js";
import { CustomDataSource } from "../core/DataSource.js";
import { Logger } from "../core/logger.js";
import { loadFolder } from "../handler/folderLoader.js";
import { findClosestIndexFolder } from "../utils/tools.js";

let AppDataSource: CustomDataSource | undefined;

export async function initializeDatabase(): Promise<CustomDataSource> {
  if (AppDataSource && AppDataSource.isInitialized) return AppDataSource;

  try {
    const entitiesPath = path.join(findClosestIndexFolder(), "entities");
    Logger.info("Loading entities from folder: " + entitiesPath);

    const entities = await loadFolder(entitiesPath, {
      logger: true,
      shouldReturn: true
    }) as any[];

    Logger.info("Entities loaded: " + entities.length);

    if (!entities || entities.length === 0) {
      Logger.error("No entities found in the specified folder.");
      process.exit(1);
    }

    const databaseConfig = new DatabaseConfig(config.database);
    AppDataSource = new CustomDataSource({
      ...databaseConfig.getDataSourceOptions(),
      entities
    });

    await AppDataSource.initialize();
    Logger.info("Database initialized successfully.");
    return AppDataSource;
  } catch (error) {
    Logger.error("Error initializing database: " + error);
    throw error;
  }
}

export { AppDataSource };
