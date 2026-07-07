export type PlatformId = 'xiaohongshu' | 'weibo' | 'douyin' | 'gongzhonghao';

export interface PlatformMetadata {
  id: PlatformId;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
}
