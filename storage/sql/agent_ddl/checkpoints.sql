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

 Date: 31/01/2026 21:39:06
*/


-- ----------------------------
-- Table structure for checkpoints
-- ----------------------------
DROP TABLE IF EXISTS "public"."checkpoints";
CREATE TABLE "public"."checkpoints" (
  "thread_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "checkpoint_ns" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "checkpoint_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "parent_checkpoint_id" text COLLATE "pg_catalog"."default",
  "type" text COLLATE "pg_catalog"."default",
  "checkpoint" jsonb NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb
)
;

-- ----------------------------
-- Indexes structure for table checkpoints
-- ----------------------------
CREATE INDEX "checkpoints_thread_id_idx" ON "public"."checkpoints" USING btree (
  "thread_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table checkpoints
-- ----------------------------
ALTER TABLE "public"."checkpoints" ADD CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("thread_id", "checkpoint_ns", "checkpoint_id");
