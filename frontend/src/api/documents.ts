import { adapter } from './index'
import type { UploadHandlers } from './types'

export const listDocuments = () => adapter.documents.list()
export const uploadDocument = (file: File, handlers?: UploadHandlers) => adapter.documents.upload(file, handlers)
export const removeDocument = (id: string) => adapter.documents.remove(id)

/** Must match what try.py can extract (PyMuPDF for PDF, Tesseract OCR for images). */
export const ACCEPTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'] as const
export const MAX_FILES_PER_BATCH = 5
