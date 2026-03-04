
export interface ConfigMeta {
  default_value: any;
  description: string;
  requires_restart: boolean;
}

export interface ConfigItem<T> {
  _meta: Record<keyof T, ConfigMeta>;
}

export interface DatabaseConfig {
  path: string;
  pool_size: number;
}

export interface MaintenanceConfig {
  enable_vacuum: boolean;
  enabled: boolean;
  history_retention_days: number;
  interval_hours: number;
  recommendation_retention_days: number;
  vacuum_threshold: number;
}

export interface RecommendConfig {
  job_interval_hours: number;
  max_results: number;
  play_threshold: number;
}

export interface ScanConfig {
  interval_hours: number;
  min_file_size: number;
  mode: string;
  roots: string[];
  skip_small_files: boolean;
}

export interface ServerConfig {
  host: string;
  port: number;
}

export interface TranscodeConfig {
  cache_path: string;
  cache_strategy: string;
  cache_threshold: number;
  enabled: boolean;
  max_concurrent_transcodes: number;
}

export interface SystemConfig {
  database: DatabaseConfig & ConfigItem<DatabaseConfig>;
  maintenance: MaintenanceConfig & ConfigItem<MaintenanceConfig>;
  recommend: RecommendConfig & ConfigItem<RecommendConfig>;
  scan: ScanConfig & ConfigItem<ScanConfig>;
  server: ServerConfig & ConfigItem<ServerConfig>;
  transcode: TranscodeConfig & ConfigItem<TranscodeConfig>;
}

export interface UpdateConfigParams {
  maintenance?: Partial<MaintenanceConfig>;
  recommend?: Partial<RecommendConfig>;
  scan?: Partial<ScanConfig>;
  transcode?: Partial<TranscodeConfig>;
}
