import type { PlatformMetadata } from '@/types/platform';

export const PLATFORMS: PlatformMetadata[] = [
  {
    id: 'xiaohongshu',
    name: '小红书',
    icon: 'redbook',
    description: '种草笔记 · 口语化 · emoji · 话题标签',
    enabled: true,
  },
  {
    id: 'weibo',
    name: '微博',
    icon: 'weibo',
    description: '短平快 · 话题营销',
    enabled: true,
  },
  {
    id: 'douyin',
    name: '抖音',
    icon: 'douyin',
    description: '短视频文案 · 节奏感',
    enabled: true,
  },
  {
    id: 'gongzhonghao',
    name: '公众号',
    icon: 'gongzhonghao',
    description: '深度长文 · 专业调性',
    enabled: true,
  },
];
