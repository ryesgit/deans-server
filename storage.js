import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET || '';
const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

const normalizePath = (value) => value.replace(/\\/g, '/');

const CONTENT_TYPES = {
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

const ensureLocalDirectory = async (targetPath) => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
};

const getBucket = () => {
  if (!BUCKET_NAME) {
    throw new Error('GCS_BUCKET is not configured');
  }

  return storage.bucket(BUCKET_NAME);
};

export const isCloudStorageEnabled = () => Boolean(BUCKET_NAME);

export const getObjectPathFromStoredPath = (storedPath) => {
  if (!storedPath) {
    return null;
  }

  let normalized = normalizePath(storedPath.trim());
  normalized = normalized.replace(/^gs:\/\/[^/]+\//, '');

  const uploadsMarker = '/uploads/';
  const uploadsIndex = normalized.lastIndexOf(uploadsMarker);
  if (uploadsIndex >= 0) {
    return normalized.slice(uploadsIndex + uploadsMarker.length);
  }

  if (normalized.startsWith('uploads/')) {
    return normalized.slice('uploads/'.length);
  }

  return normalized.replace(/^\/+/, '');
};

export const getLocalPathFromObjectPath = (objectPath) =>
  path.join(LOCAL_UPLOAD_ROOT, objectPath);

export const saveBuffer = async (objectPath, buffer, { contentType, cacheControl } = {}) => {
  if (isCloudStorageEnabled()) {
    const file = getBucket().file(objectPath);
    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl,
      },
    });
    return;
  }

  const localPath = getLocalPathFromObjectPath(objectPath);
  await ensureLocalDirectory(localPath);
  await fs.promises.writeFile(localPath, buffer);
};

export const deleteObject = async (objectPath) => {
  if (!objectPath) {
    return;
  }

  if (isCloudStorageEnabled()) {
    await getBucket().file(objectPath).delete({ ignoreNotFound: true });
    return;
  }

  const localPath = getLocalPathFromObjectPath(objectPath);
  await fs.promises.rm(localPath, { force: true });
};

const setStreamingHeaders = (res, metadata = {}, { downloadName, inline = false } = {}) => {
  if (metadata.contentType) {
    res.setHeader('Content-Type', metadata.contentType);
  }

  if (metadata.cacheControl) {
    res.setHeader('Cache-Control', metadata.cacheControl);
  }

  if (downloadName) {
    const dispositionType = inline ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(downloadName)}"`);
  }
};

const getContentTypeForObjectPath = (objectPath) =>
  CONTENT_TYPES[path.extname(objectPath).toLowerCase()];

export const streamObject = async (objectPath, res, { downloadName, inline = false } = {}) => {
  if (!objectPath) {
    return false;
  }

  if (isCloudStorageEnabled()) {
    const file = getBucket().file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      return false;
    }

    const [metadata] = await file.getMetadata();
    setStreamingHeaders(res, metadata, { downloadName, inline });

    await new Promise((resolve, reject) => {
      file.createReadStream()
        .on('error', reject)
        .on('end', resolve)
        .pipe(res);
    });

    return true;
  }

  const localPath = getLocalPathFromObjectPath(objectPath);
  const exists = await fs.promises.access(localPath).then(() => true).catch(() => false);
  if (!exists) {
    return false;
  }

  const stats = await fs.promises.stat(localPath);
  res.setHeader('Content-Length', stats.size);
  setStreamingHeaders(res, { contentType: getContentTypeForObjectPath(objectPath) }, { downloadName, inline });

  await new Promise((resolve, reject) => {
    fs.createReadStream(localPath)
      .on('error', reject)
      .on('end', resolve)
      .pipe(res);
  });

  return true;
};
