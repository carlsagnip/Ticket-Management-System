import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Continue", cancelText = "Cancel", isDestructive = false, isAlert = false }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent style={{ maxWidth: "480px" }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="modal-body">
          <AlertDialogDescription style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>
            {message}
          </AlertDialogDescription>
        </div>
        
        <AlertDialogFooter>
          {!isAlert && (
            <AlertDialogCancel onClick={onClose}>
              {cancelText}
            </AlertDialogCancel>
          )}
          <AlertDialogAction 
            className={isDestructive ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
