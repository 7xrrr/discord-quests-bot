import { Entity, Column } from "typeorm";
import BaseDocument from "../lib/handler/BaseDocument.js";

@Entity("images")
class ImageEntity extends BaseDocument {
    @Column()
    key: string;
    @Column()
    url: string;

    @Column()
    name: string; // اسم الصورة

    @Column({ type: "bigint" })
    expireTimestamp: number; // milliseconds

    @Column()
    messageId: string;

    @Column()
    channelId: string;

    @Column()
    guildId: string;

}

export default ImageEntity;
