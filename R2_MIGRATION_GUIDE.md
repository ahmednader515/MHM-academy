# Cloudflare R2 Migration Guide

This guide will help you migrate from UploadThing to Cloudflare R2.

## Prerequisites

1. **Cloudflare R2 Account**: Create an R2 bucket in your Cloudflare dashboard
2. **R2 API Tokens**: Generate API tokens with read/write permissions
3. **Public URL**: Set up a public URL for your R2 bucket (either R2.dev domain or custom domain)

## Step 1: Configure Environment Variables

Add these environment variables to your `.env` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev
# OR use custom domain:
# R2_PUBLIC_URL=https://cdn.yourdomain.com

# Optional: Custom endpoint (usually not needed)
# R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
```

### Getting R2 Credentials:

1. Go to Cloudflare Dashboard → R2
2. Create a bucket (if you haven't already)
3. Go to "Manage R2 API Tokens"
4. Create API token with:
   - Permissions: Object Read & Write
   - Bucket: Your bucket name
5. Copy the Access Key ID and Secret Access Key
6. Your Account ID is shown in the R2 dashboard URL or in your Cloudflare dashboard

### Setting up Public Access:

1. In your R2 bucket settings, enable "Public Access"
2. You can use the default R2.dev domain or set up a custom domain
3. Copy the public URL to `R2_PUBLIC_URL`

## Step 2: Upload Files to R2

Run the upload script to upload all files from your local directory to R2:

```bash
npm run upload-to-r2
```

This script will:
- Read all files from `E:\uploadthing-files\mhm-academy`
- Upload them to R2 organized by type (images/, videos/, documents/, etc.)
- Create a mapping file (`scripts/uploadthing-to-r2-mapping.json`) that maps UploadThing URLs to R2 URLs

**Note**: The script will skip files that are already uploaded, so you can run it multiple times safely.

## Step 3: Backup Database URLs

**⚠️ CRITICAL**: Before migrating, backup your database URLs:

```bash
npm run backup-db-urls
```

This script will:
- Export all URL fields from your database
- Save them to `backups/db-urls-backup-[timestamp].json`
- Allow you to restore if something goes wrong

The backup includes:
- User images
- Course images
- Attachments
- Chapter videos and documents
- Homework submissions
- Activity submissions
- Certificates
- Timetables
- Subscription request images

## Step 4: Update Database URLs

After backing up and uploading all files, update the database URLs:

```bash
npm run migrate-db-to-r2
```

This script will:
- Read the mapping file created in Step 2
- Update all database records that contain UploadThing URLs
- Replace them with the corresponding R2 URLs

**Important**: The backup from Step 3 is your safety net!

## Step 5: Restore Database (If Needed)

If something goes wrong during migration, you can restore from backup:

```bash
# Restore from latest backup
npm run restore-db-urls

# Or restore from specific backup file
npm run restore-db-urls backups/db-urls-backup-1234567890.json
```

This will restore all URL fields to their original UploadThing values.

## Step 6: Update Your Code (Optional)

If you want to use R2 for new uploads instead of UploadThing, replace the `FileUpload` component with `R2FileUpload`:

```tsx
// Old (UploadThing)
import { FileUpload } from "@/components/file-upload";
<FileUpload endpoint="courseImage" onChange={handleChange} />

// New (R2)
import { R2FileUpload } from "@/components/r2-file-upload";
<R2FileUpload folder="images" onChange={handleChange} />
```

## Step 7: Update Next.js Image Configuration

The `next.config.js` has been updated to allow R2 images. If you're using a custom domain, make sure to add it to the `remotePatterns`:

```js
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'your-bucket.r2.dev', // or your custom domain
    },
  ],
}
```

## Verification

After migration, verify that:
1. All files are accessible via R2 URLs
2. Images display correctly in your application
3. Database URLs have been updated
4. New uploads work correctly (if you've switched to R2)

## Troubleshooting

### Files not uploading
- Check that R2 credentials are correct
- Verify bucket name and public URL
- Check R2 bucket permissions

### Database URLs not updating
- Ensure mapping file exists (`scripts/uploadthing-to-r2-mapping.json`)
- Check database connection
- Review migration script logs

### Images not displaying
- Verify `R2_PUBLIC_URL` is correct
- Check Next.js image configuration
- Ensure R2 bucket has public access enabled

## Rollback

If you need to rollback:
1. Restore database from backup
2. Keep UploadThing URLs in database
3. Files will still be accessible from UploadThing until you delete them

