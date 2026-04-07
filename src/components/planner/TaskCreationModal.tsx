'use client';
import React from 'react';
import { TaskBuilderForm } from './TaskBuilderForm';

interface TaskCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date | null;
}

export function TaskCreationModal({ isOpen, onClose, initialDate }: TaskCreationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-[40px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
        <TaskBuilderForm
          initialDate={initialDate}
          hideFrequency={!!initialDate}
          onSuccess={onClose}
          onCancel={onClose}
          showCancelButton={true}
          className="shadow-none border-none !p-8 sm:!p-10" 
        />
      </div>
    </div>
  );
}
