-- =======================================================
-- MAHAMAYA ENTERPRISE - SUPABASE DATABASE SCHEMA MIGRATION
-- Paste this script into your Supabase SQL Editor and click "Run".
-- =======================================================

-- 1. Create Products Table (case-sensitive camelCase columns for seamless app compatibility)
CREATE TABLE IF NOT EXISTS products (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "sku" TEXT,
    "price" NUMERIC NOT NULL,
    "mrp" NUMERIC,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "rating" NUMERIC DEFAULT 0,
    "ratingCount" INTEGER DEFAULT 0,
    "shortDesc" TEXT,
    "longDesc" TEXT,
    "tags" TEXT[],
    "images" TEXT[],
    "featured" BOOLEAN DEFAULT false,
    "bestSeller" BOOLEAN DEFAULT false,
    "soldCount" INTEGER DEFAULT 0,
    "minQty" INTEGER DEFAULT 1,
    "qtyStep" INTEGER DEFAULT 1,
    "variants" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
    "id" TEXT PRIMARY KEY,
    "orderNo" TEXT UNIQUE NOT NULL,
    "customer" JSONB NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" NUMERIC NOT NULL,
    "deliveryFee" NUMERIC NOT NULL,
    "total" NUMERIC NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create Settings Table
CREATE TABLE IF NOT EXISTS settings (
    "key" TEXT PRIMARY KEY,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Create Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    "id" TEXT PRIMARY KEY,
    "code" TEXT UNIQUE NOT NULL,
    "type" TEXT NOT NULL,
    "value" NUMERIC NOT NULL,
    "minOrder" NUMERIC DEFAULT 0,
    "maxUses" INTEGER DEFAULT 0,
    "usedCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Create Quotes Table
CREATE TABLE IF NOT EXISTS quotes (
    "id" TEXT PRIMARY KEY,
    "topic" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "requirement" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
