ALTER TABLE "ListItem" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "ListItem" ADD COLUMN IF NOT EXISTS "subCategory" text;
ALTER TABLE "ListItem" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS "ListItem_category_idx" ON "ListItem" ("category");
CREATE INDEX IF NOT EXISTS "ListItem_subCategory_idx" ON "ListItem" ("subCategory");