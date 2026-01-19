import React from 'react';

export default function UnsavedChangesModal({
  open,
  saving = false,
  onCancel,
  onDiscard,
  onSave,
  title = 'Leave without saving?',
  message = 'You have unsaved changes. Would you like to save before leaving?',
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-gray-600">{message}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Leave without saving
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-full background-color-primary-main text-white font-medium transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save and leave'}
          </button>
        </div>
      </div>
    </div>
  );
}
