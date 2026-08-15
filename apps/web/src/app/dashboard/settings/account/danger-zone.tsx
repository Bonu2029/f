'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Trash2 } from 'lucide-react';
import { Alert, Button, Input } from '@/components/ui';

/**
 * Data export and account deletion.
 *
 * Deletion asks the owner to type the business name, because it destroys call
 * history, leads and appointments and releases the phone number.
 */
export function AccountDangerZone({
  isOwner,
  organizationName,
}: {
  isOwner: boolean;
  organizationName: string;
}) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? 'The export could not be generated.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${organizationName.replace(/[^\w]+/g, '-').toLowerCase()}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice('Your export has downloaded.');
    } catch {
      setError('The export could not be downloaded.');
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'The account could not be deleted.');
        return;
      }
      // The organisation no longer exists, so send them to the public site.
      router.replace('/');
      router.refresh();
    } catch {
      setError('The deletion request could not be completed.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="critical" title={error} />}
      {notice && <Alert tone="positive" title={notice} />}

      <Button variant="secondary" loading={exporting} disabled={!isOwner} onClick={exportData}>
        <Download aria-hidden /> {exporting ? 'Preparing export' : 'Download my data'}
      </Button>

      {isOwner && (
        <div className="rounded-lg border border-red-200 bg-critical-soft p-4">
          <h3 className="text-sm font-semibold text-red-900">Delete this business</h3>
          <p className="mt-1 text-sm text-red-900/80">
            This cancels your subscription, releases your phone number, stops your receptionist and
            removes your calls, leads and appointments. Billing and audit records are retained where
            required by law. This cannot be undone.
          </p>

          {!showDelete ? (
            <Button variant="danger" className="mt-3" onClick={() => setShowDelete(true)}>
              <Trash2 aria-hidden /> Delete business
            </Button>
          ) : (
            <div className="mt-3 space-y-3">
              <label htmlFor="confirm" className="block text-sm font-medium text-red-900">
                Type <strong>{organizationName}</strong> to confirm
              </label>
              <Input
                id="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  loading={deleting}
                  disabled={confirm !== organizationName}
                  onClick={deleteAccount}
                >
                  Permanently delete
                </Button>
                <Button variant="ghost" onClick={() => setShowDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
