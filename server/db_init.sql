-- =====================================================================
-- CopyCraft MySQL 初始化脚本
--
-- 直接 CopyCraft 后端用  mysql2 连接、utf8mb4 字符集、InnoDB 引擎。
-- 执行方式：
--   方式 A（推荐）：  node server/db_init.js      (# npm run db:init)
--   方式 B（手动）：  mysql -h 127.0.0.1 -P 3307 -u root -p < server/db_init.sql
--   方式 C：Navicat 连接 3307 → 新建查询 → 粘贴本文件 F5 执行
--
-- 所有表名 / 列名统一使用小写 + 下划线；uuid 用 CHAR(36) 存可读字符串。
-- 注：保留字段 password / desc 已用反引号包裹。
-- =====================================================================

-- ---------- 1. 库 ----------
CREATE DATABASE IF NOT EXISTS copycraft
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE copycraft;

-- ---------- 2. 用户 ----------
CREATE TABLE IF NOT EXISTS users (
  id                CHAR(36) NOT NULL,                  -- UUID v4
  email             VARCHAR(255) NOT NULL,
  `password`        VARCHAR(255) NOT NULL,               -- scrypt salt:hash
  api_key_enc       TEXT,                                -- AES-256-GCM iv:tag:base64
  tone_style        VARCHAR(32) NOT NULL DEFAULT '亲切闺蜜',
  max_length        INT NOT NULL DEFAULT 500,
  temperature       DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  created_at        BIGINT NOT NULL,                     -- epoch ms
  updated_at        BIGINT NOT NULL,                     -- epoch ms（用于设置同步最后写入胜出）
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 3. 验证码 ----------
CREATE TABLE IF NOT EXISTS verify_codes (
  email             VARCHAR(255) NOT NULL,
  code              CHAR(6) NOT NULL,
  expires_at        BIGINT NOT NULL,                     -- epoch ms
  failures          INT NOT NULL DEFAULT 0,              -- 累计错误次数（>=5 则清 code）
  created_at        BIGINT NOT NULL,
  PRIMARY KEY (email),
  KEY idx_verify_codes_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 4. session ----------
CREATE TABLE IF NOT EXISTS sessions (
  token             VARCHAR(255) NOT NULL,               -- HMAC-SHA256 自签 token
  user_id           CHAR(36) NOT NULL,
  device_name       VARCHAR(120),
  created_at        BIGINT NOT NULL,
  expires_at        BIGINT NOT NULL,
  PRIMARY KEY (token),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 5. 历史记录 ----------
-- 联合主键 (history_id, user_id)：同一条 history_id 只属于一个用户；
-- 跨设备"最后写入胜出"由 updated_at 决定。deleted=1 为软删（换设备后同步删除状态）。
CREATE TABLE IF NOT EXISTS history (
  seq               BIGINT NOT NULL AUTO_INCREMENT,       -- 自增主键，让每行唯一
  history_id        VARCHAR(64) NOT NULL,                -- 客户端 CopyResult.id
  user_id           CHAR(36) NOT NULL,
  content           TEXT NOT NULL,
  platform          VARCHAR(32) NOT NULL,                -- xiaohongshu/weibo/douyin/gongzhonghao
  created_at        BIGINT NOT NULL,
  updated_at        BIGINT NOT NULL,                     -- epoch ms（同步冲突胜出依据）
  deleted           TINYINT(1) NOT NULL DEFAULT 0,       -- 软删：0 可见 / 1 已删
  PRIMARY KEY (seq),
  UNIQUE KEY uq_history_user_hid (user_id, history_id),
  KEY idx_history_user_updated (user_id, updated_at),
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 6. 看一眼（可选） ----------
-- SHOW TABLES;
