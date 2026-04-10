import { useState } from "react";
import { X, Send } from "lucide-react";

interface ForwardModalProps {
  _ticketId: number;
  _messageId?: number;
  initialSubject?: string;
  initialBody?: string;
  onClose: () => void;
  onSubmit: (data: ForwardData) => Promise<void>;
}

interface ForwardData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body: string;
}

export function ForwardModal({
  _ticketId,
  _messageId,
  initialSubject,
  initialBody,
  onClose,
  onSubmit,
}: ForwardModalProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(initialSubject || "");
  const [body, setBody] = useState(initialBody || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const toEmails = to
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    const ccEmails = cc
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    const bccEmails = bcc
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (toEmails.length === 0) {
      alert("Please enter at least one recipient");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ to: toEmails, cc: ccEmails, bcc: bccEmails, subject, body });
      onClose();
    } catch (error) {
      console.error("Failed to forward:", error);
      alert("Failed to forward ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Forward Ticket</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">To *</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@example.com, email2@example.com"
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">CC</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">BCC</label>
            <input
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="bcc@example.com"
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-4 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Sending..." : "Forward"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
