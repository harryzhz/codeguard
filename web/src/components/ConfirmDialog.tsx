import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        margin: 0,
        border: "none",
        borderRadius: "20px",
        padding: "28px 32px",
        maxWidth: "420px",
        width: "90vw",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        fontFamily: "inherit",
      }}
    >
      <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 10px 0", color: "#1A1A1A" }}>
        {title}
      </h3>
      <p style={{ fontSize: "14px", color: "#666", margin: "0 0 24px 0", lineHeight: 1.5 }}>
        {message}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: "8px 20px",
            borderRadius: "20px",
            border: "1px solid #ddd",
            background: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            color: "#666",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          data-testid="confirm-delete"
          style={{
            padding: "8px 20px",
            borderRadius: "20px",
            border: "none",
            background: "#D44A3A",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Deleting..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
