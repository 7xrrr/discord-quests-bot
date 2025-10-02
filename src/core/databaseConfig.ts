import { DataSourceOptions, DatabaseType } from "typeorm";
import { MongoConnectionOptions } from "typeorm/driver/mongodb/MongoConnectionOptions.js";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions.js";
import { SqliteConnectionOptions } from "typeorm/driver/sqlite/SqliteConnectionOptions.js";

export enum SupportedDatabaseTypes {
  Sqlite = "sqlLite",
  Mysql = "mysql",
  MongoDB = "mongoDB",
}

interface SqliteConfig {
  type: SupportedDatabaseTypes.Sqlite;
  path: string;
}

interface MysqlConfig {
  type: SupportedDatabaseTypes.Mysql;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface MongoConfig {
  type: SupportedDatabaseTypes.MongoDB;
  url: string;
}

export type DatabaseConfigOptions = SqliteConfig | MysqlConfig | MongoConfig;

export class DatabaseConfig {
  public readonly config: DatabaseConfigOptions;
  public readonly type: SupportedDatabaseTypes;

  public readonly url?: string;
  public readonly path?: string;
  public readonly host?: string;
  public readonly port?: number;
  public readonly user?: string;
  public readonly password?: string;
  public readonly database?: string;

  constructor(config: DatabaseConfigOptions) {
    this.config = config;
    this.type = config.type;

    if (config.type === SupportedDatabaseTypes.Sqlite) {
      this.path = config.path;
    } else if (config.type === SupportedDatabaseTypes.Mysql) {
      this.host = config.host;
      this.port = config.port;
      this.user = config.user;
      this.password = config.password;
      this.database = config.database;
    } else if (config.type === SupportedDatabaseTypes.MongoDB) {
      this.url = config.url;
    }

  }

  getDatabaseType(): DatabaseType {
    switch (this.type) {
      case SupportedDatabaseTypes.Sqlite:
        return "sqlite";
      case SupportedDatabaseTypes.Mysql:
        return "mysql";
      case SupportedDatabaseTypes.MongoDB:
        return "mongodb";
    }
  }

  getDataSourceOptions(): DataSourceOptions {
    if (this.type === SupportedDatabaseTypes.MongoDB) {
      const options: MongoConnectionOptions = {
        type: "mongodb",
        url: this.url!,
        synchronize: true,
        migrationsRun: true,
      };
      return options;
    }

    if (this.type === SupportedDatabaseTypes.Sqlite) {
      const options: SqliteConnectionOptions = {
        type: "sqlite",
        database: this.path!,
        synchronize: true,
        migrationsRun: true,
      };
      return options;
    }


    const options: MysqlConnectionOptions = {
      type: "mysql",
      host: this.host!,
      port: this.port!,
      username: this.user!,
      password: this.password!,
      database: this.database!,
      synchronize: false,
      migrationsRun: true,
    };
    return options;
  }

}
