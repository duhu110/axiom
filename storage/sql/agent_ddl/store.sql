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

 Date: 31/01/2026 21:39:14
*/


-- ----------------------------
-- Table structure for store
-- ----------------------------
DROP TABLE IF EXISTS "public"."store";
CREATE TABLE "public"."store" (
  "prefix" text COLLATE "pg_catalog"."default" NOT NULL,
  "key" text COLLATE "pg_catalog"."default" NOT NULL,
  "value" jsonb NOT NULL,
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "expires_at" timestamptz(6),
  "ttl_minutes" int4
)
;

-- ----------------------------
-- Indexes structure for table store
-- ----------------------------
CREATE INDEX "idx_store_expires_at" ON "public"."store" USING btree (
  "expires_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
) WHERE expires_at IS NOT NULL;
CREATE INDEX "store_prefix_idx" ON "public"."store" USING btree (
  "prefix" COLLATE "pg_catalog"."default" "pg_catalog"."text_pattern_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table store
-- ----------------------------
ALTER TABLE "public"."store" ADD CONSTRAINT "store_pkey" PRIMARY KEY ("prefix", "key");
