'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userName: string;
}

export function DeleteAccountDialog({
  open,
  onClose,
  onConfirm,
  userName,
}: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE exactly to confirm.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmText('');
    setError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Delete Account" size="sm">
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-400">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-600">This action cannot be undone</p>
            <p className="text-sm text-ink-400 mt-1">
              Deleting your account will permanently remove your profile, sessions, workshops,
              roadmaps, and all associated data from SkillSphere. You will be signed out
              immediately.
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-ink-400 mb-1">
            You are about to delete the account for{' '}
            <span className="font-semibold text-ink">{userName}</span>.
          </p>
          <p className="text-sm text-ink-400">
            Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm.
          </p>
        </div>

        <input
          className="input font-mono"
          placeholder="Type DELETE here"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setError('');
          }}
          disabled={loading}
          autoComplete="off"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || confirmText !== 'DELETE'}
            className="flex-1 !bg-red-600 hover:!bg-red-700 !text-white !border-0"
          >
            {loading ? 'Deleting...' : 'Permanently Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

