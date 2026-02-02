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

 Date: 31/01/2026 21:36:43
*/


-- ----------------------------
-- Table structure for checkpoint_blobs
-- ----------------------------
DROP TABLE IF EXISTS "public"."checkpoint_blobs";
CREATE TABLE "public"."checkpoint_blobs" (
  "thread_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "checkpoint_ns" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "channel" text COLLATE "pg_catalog"."default" NOT NULL,
  "version" text COLLATE "pg_catalog"."default" NOT NULL,
  "type" text COLLATE "pg_catalog"."default" NOT NULL,
  "blob" bytea
)
;

-- ----------------------------
-- Indexes structure for table checkpoint_blobs
-- ----------------------------
CREATE INDEX "checkpoint_blobs_thread_id_idx" ON "public"."checkpoint_blobs" USING btree (
  "thread_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table checkpoint_blobs
-- ----------------------------
ALTER TABLE "public"."checkpoint_blobs" ADD CONSTRAINT "checkpoint_blobs_pkey" PRIMARY KEY ("thread_id", "checkpoint_ns", "channel", "version");
