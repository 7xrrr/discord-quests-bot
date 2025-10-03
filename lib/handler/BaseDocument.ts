import {
    CreateDateColumn,
    UpdateDateColumn, BaseEntity, ObjectIdColumn, PrimaryGeneratedColumn,
    ObjectId
} from "typeorm";
import { SupportedDatabaseTypes } from "../../core/databaseConfig.js";
import config from "../../config/config.js";


export class BaseDocumentSql extends BaseEntity {

    @PrimaryGeneratedColumn("increment", { type: "int", name: "id" })
    id: number;


    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

}
export class BaseDocumentMongo {
    @ObjectIdColumn()
    id: ObjectId;
    /*
        @ObjectIdColumn()
        _id: ObjectId;*/

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
const BaseDocument = config.database.type == SupportedDatabaseTypes.MongoDB ? BaseDocumentMongo : BaseDocumentSql;
export default BaseDocument;
