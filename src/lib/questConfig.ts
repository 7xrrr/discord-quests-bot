import { ChildUser } from "../childProcess/childUser.js";

type QuestRunFn = (user: ChildUser) => Promise<any> | any;

export class QuestConfig {
  name: string;
  requireVoiceChannel: boolean;
  requireLogin: boolean;
  private runFn: QuestRunFn;



  constructor(options: {
    name: string;
    requireVoiceChannel?: boolean;
    requireLogin?: boolean;
    run: QuestRunFn;
  }) {
    this.name = options.name;
    this.requireVoiceChannel = options.requireVoiceChannel ?? false;
    this.requireLogin = options.requireLogin ?? false;
    this.runFn = options.run;
  }
 
  async run(user: ChildUser) {
    return this.runFn(user);
  }
}
