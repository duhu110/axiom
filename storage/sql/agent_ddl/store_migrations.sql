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

 Date: 31/01/2026 21:39:19
*/


-- ----------------------------
-- Table structure for store_migrations
-- ----------------------------
DROP TABLE IF EXISTS "public"."store_migrations";
CREATE TABLE "public"."store_migrations" (
  "v" int4 NOT NULL
)
;

-- ----------------------------
-- Primary Key structure for table store_migrations
-- ----------------------------
ALTER TABLE "public"."store_migrations" ADD CONSTRAINT "store_migrations_pkey" PRIMARY KEY ("v");
