import multer from "multer";

export function createUploadMiddleware(fieldName: string, maxBytes: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      files: 1,
      fileSize: maxBytes
    }
  }).single(fieldName);
}
