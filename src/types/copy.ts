import type { PlatformId } from './platform';

export interface CopyInput {
  rawText: string;
  productName?: string;
  targetAudience?: string;
  keywords?: string;
}

export interface GenerationConfig {
  platformId: PlatformId;
  toneStyle: string;
  maxLength: number;
  temperature: number;
}

export interface CopyResult {
  id: string;
  content: string;
  platformId: PlatformId;
  createdAt: number;
  /** 最后更新时间（毫秒 epoch）；同步冲突时作为最后写入胜出依据 */
  updatedAt?: number;
}
