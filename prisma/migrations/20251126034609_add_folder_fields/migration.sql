-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_user_id_fkey";

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "folder_contents" TEXT,
ADD COLUMN     "folder_name" TEXT,
ADD COLUMN     "folder_number" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
