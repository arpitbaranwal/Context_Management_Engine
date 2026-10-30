import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyState, Notice } from '../components/ui/Feedback'
import { PageHeader } from '../components/ui/PageHeader'
import { DocumentList, DocumentListSkeleton } from '../features/documents/DocumentList'
import { UploadDialog } from '../features/upload/UploadDialog'
import { useDocuments } from '../state/documents'

export default function DocumentsPage() {
  const { documents, loading, error, refresh } = useDocuments()
  const [uploading, setUploading] = useState(false)

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-8 sm:px-6">
      <PageHeader
        title="Documents"
        description="Manage and index documents powering your hybrid retrieval corpus."
        actions={
          <Button variant="primary" icon={<Plus aria-hidden className="size-4" />} onClick={() => setUploading(true)}>
            Upload document
          </Button>
        }
      />
      {error && <Notice action={<Button size="sm" onClick={() => void refresh()}>Retry</Button>}>{error}</Notice>}
      {loading ? (
        <DocumentListSkeleton rows={4} />
      ) : documents.length === 0 && !error ? (
        <div className="glass-card rounded-2xl border border-line p-8">
          <EmptyState
            title="No documents yet."
            body="Upload a PDF document to start researching."
            action={
              <Button variant="primary" onClick={() => setUploading(true)}>
                Upload document
              </Button>
            }
          />
        </div>
      ) : (
        <DocumentList documents={documents} />
      )}
      <UploadDialog open={uploading} onClose={() => setUploading(false)} />
    </div>
  )
}
