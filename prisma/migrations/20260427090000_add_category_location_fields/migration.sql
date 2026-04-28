ALTER TABLE "categories"
ADD COLUMN "folder_number" TEXT,
ADD COLUMN "row_position" INTEGER,
ADD COLUMN "column_position" INTEGER;

UPDATE "categories" AS c
SET
  "folder_number" = file_data."folder_number",
  "row_position" = file_data."row_position",
  "column_position" = file_data."column_position"
FROM (
  SELECT DISTINCT ON ("category_id")
    "category_id",
    "folder_number",
    "row_position",
    "column_position"
  FROM "files"
  WHERE "category_id" IS NOT NULL
  ORDER BY "category_id", "created_at" ASC
) AS file_data
WHERE c."id" = file_data."category_id"
  AND (
    c."folder_number" IS NULL
    OR c."row_position" IS NULL
    OR c."column_position" IS NULL
  );
