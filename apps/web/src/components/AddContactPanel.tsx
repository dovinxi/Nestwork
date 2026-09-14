import { useEffect, useState } from "react";
import type { Contact } from "@nestwork/shared";
import { ContactFormContent } from "./ContactFormContent";

interface AddContactPanelProps {
  onClose: () => void;
  onCreated: (contact: Contact) => void;
}

/** Slide-over drawer for adding a contact without leaving the Nest. */
export function AddContactPanel({ onClose, onCreated }: AddContactPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slateblue-900/20 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-nest-50 shadow-2xl transition-transform duration-300 ease-out sm:w-[560px] ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-nest-200 bg-white/90 px-4 py-3 backdrop-blur">
          <span className="text-sm font-semibold text-slateblue-500">New Contact</span>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg leading-none text-slateblue-400 hover:bg-nest-100 hover:text-slateblue-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <ContactFormContent onSaved={onCreated} onCancel={onClose} />
        </div>
      </div>
    </>
  );
}
