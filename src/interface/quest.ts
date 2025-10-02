
export interface UserStatus {
  user_id: string;
  quest_id: string;
  enrolled_at: string;
  completed_at: string | null;
  claimed_at: string | null;
  claimed_tier: string | null;
  last_stream_heartbeat_at: string | null;
  stream_progress_seconds: number;
  dismissed_quest_content: number;
  progress: {
    [taskType: string]: ProgressEntry;
  };
}
export interface ProgressEntry {
  value: number;
  event_name: string;
  updated_at: string;
  completed_at: string | null;
  heartbeat: {
    last_beat_at: string;
    expires_at: string | null;
  };
}
export interface QuestApi {
    id: string;
    config: QuestConfig;
    user_status: UserStatus,
    targeted_content: any[];
    preview: boolean;
  }
  
  export interface QuestConfig {
    id: string;
    config_version: number;
    starts_at: string; // ISO date string
    expires_at: string; // ISO date string
    features: number[];
    application: QuestApplication;
    assets: QuestAssets;
    colors: QuestColors;
    messages: QuestMessages;
    task_config: TaskConfig;
    task_config_v2: TaskConfigV2;
    rewards_config: RewardsConfig;
    share_policy: string;
  }
  
  export interface QuestApplication {
    link: string;
    id: string;
    name: string;
  }
  
  export interface QuestAssets {
    hero: string;
    hero_video: string;
    quest_bar_hero: string;
    quest_bar_hero_video: string;
    game_tile: string;
    logotype: string;
    game_tile_light: string;
    game_tile_dark: string;
    logotype_light: string;
    logotype_dark: string;
  }
  
  export interface QuestColors {
    primary: string;
    secondary: string;
  }
  
  export interface QuestMessages {
    quest_name: string;
    game_title: string;
    game_publisher: string;
  }
  
  export interface TaskConfig {
    type: number;
    join_operator: "or" | "and";
    tasks: {
      [key: string]: {
        event_name: string;
        target: number;
        external_ids: string[];
      };
    };
  }
  
  export interface TaskConfigV2 {
    tasks: {
      [key: string]: {
        type: string;
        target: number;
        applications: { id: string }[];
      };
    };
    join_operator: "or" | "and";
  }
  
  export interface RewardsConfig {
    assignment_method: number;
    rewards: Reward[];
    rewards_expire_at: string;
    platforms: number[];
  }
  
  export interface Reward {
    type: number;
    sku_id: string;
    asset: string;
    asset_video: string | null;
    messages: RewardMessages;
    expires_at: string;
    expires_at_premium: string | null;
    expiration_mode: number;
  }
  
  export interface RewardMessages {
    name: string;
    name_with_article: string;
    redemption_instructions_by_platform: {
      [platformId: string]: string;
    };
  }
  