import { Entity, Column } from "typeorm";
import BaseDocument from "../lib/handler/BaseDocument.js";

@Entity("quests")
class QuestEntity extends BaseDocument {
    @Column()
    questId: string;

    @Column({ default: false })
    messageSent: boolean;

    @Column({ type: "bigint", default: 0 })
    timeSolved: number; // milliseconds, starts at 0
}

export default QuestEntity;
