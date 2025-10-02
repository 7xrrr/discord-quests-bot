import {
    DataSource,
    MongoRepository,
    Repository,
    EntityTarget,
    DataSourceOptions,
    LessThan,
    Like,
} from "typeorm";
import { BaseDocumentMongo, BaseDocumentSql } from "../lib/handler/BaseDocument.js";
import config from "../config/config.js";
import { SupportedDatabaseTypes } from "./databaseConfig.js";
import { Logger } from "./logger.js";
import { ObjectId } from "mongodb";


export class CustomDataSource extends DataSource {
    constructor(options: DataSourceOptions) {
        super(options);
    }
    smartLessThan(value: any): any {
        if (config.database.type === SupportedDatabaseTypes.MongoDB) {
            return { $lte: value };
        }
        else {
            return LessThan(value);
        }

    }

    getRepo<T>(entity: EntityTarget<T>): MongoRepository<T> | Repository<T> {
        if (config.database.type === SupportedDatabaseTypes.MongoDB) {
            return this.getMongoRepository(entity) as MongoRepository<T>;
        }
        return this.getRepository(entity) as Repository<T>;
    }

    getSpecificRepo<T>(
        entities: any[]
    ): MongoRepository<T> | Repository<T> {
        const flatEntities = entities.flat();
        const correctEntity = flatEntities.find((entity) => {
            const proto = entity.prototype;
            if (config.database.type === SupportedDatabaseTypes.MongoDB) {

                return proto instanceof BaseDocumentMongo;
            } else {

                return proto instanceof BaseDocumentSql;
            }
        });
        if (!correctEntity) {
            Logger.error("No matching entity found for the current database type.")
        }

        return this.getRepo(correctEntity);
    }
    smartId(id: ObjectId | string | number): any {
        if (config.database.type === SupportedDatabaseTypes.MongoDB) {
            if (!(id instanceof ObjectId) && typeof id === "string") {
                id = new ObjectId(id);
            }
            return { _id: id };

        }


        return { id: id }
    }
    getSmartWhereClause(
        field: string,
        value: string | number
    ) {
        const isMongo = config?.database?.type === SupportedDatabaseTypes.MongoDB

        if (isMongo) {
            // MongoDB: direct match inside array field
            return { [field]: value };
        } else {
            // SQL: match inside simple-array string
            return [
                { [field]: Like(`${value},%`) },       // starts with
                { [field]: Like(`%,${value},%`) },     // middle
                { [field]: Like(`%,${value}`) },       // end
                { [field]: `${value}` },               // only
            ];
        }
    }
}
