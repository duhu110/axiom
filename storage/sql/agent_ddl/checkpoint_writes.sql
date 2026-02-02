/*
 Navicat Premium Data Transfer

 Source Server         : axiom_db
 Source Server Type    : PostgreSQL
 Source Server Version : 160011 (160011)
 Source Host           : localhost:5432
 Source Catalog        : axiom_agent
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 160011 (160011)
 File Encoding         : 65001

 Date: 31/01/2026 21:39:00
*/


-- ----------------------------
-- Table structure for checkpoint_writes
-- ----------------------------
DROP TABLE IF EXISTS "public"."checkpoint_writes";
CREATE TABLE "public"."checkpoint_writes" (
  "thread_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "checkpoint_ns" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "checkpoint_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "task_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "idx" int4 NOT NULL,
  "channel" text COLLATE "pg_catalog"."default" NOT NULL,
  "type" text COLLATE "pg_catalog"."default",
  "blob" bytea NOT NULL,
  "task_path" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text
)
;

-- ----------------------------
-- Indexes structure for table checkpoint_writes
-- ----------------------------
CREATE INDEX "checkpoint_writes_thread_id_idx" ON "public"."checkpoint_writes" USING btree (
  "thread_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table checkpoint_writes
-- ----------------------------
ALTER TABLE "public"."checkpoint_writes" ADD CONSTRAINT "checkpoint_writes_pkey" PRIMARY KEY ("thread_id", "checkpoint_ns", "checkpoint_id", "task_id", "idx");
