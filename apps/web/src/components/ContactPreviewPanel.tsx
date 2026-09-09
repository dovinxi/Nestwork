import { useEffect, useState } from "react";
import { ContactDetailContent } from "./ContactDetailContent";
import { StatCard } from "./StatCard";
import { useContactStats } from "../api/contactStats";

interface ContactPreviewPanelProps {
  contactId: string;
  onClose: () => void;
  onNavigateContact: (contactId: string) => void;
}

/** Slide-over drawer showing full contact details without leaving the relationship web. */
export function ContactPreviewPanel({ contactId, onClose, onNavigateContact }: ContactPreviewPanelProps) {
  const [visible, setVisible] = useState(false);
  const { data: contactStats } = useContactStats(contactId);

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
        className={`fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-nest-50 shadow-2xl transition-transform duration-300 ease-out sm:w-[440px] ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-nest-200 bg-white/90 px-4 py-3 backdrop-blur">
          <span className="text-sm font-semibold text-slateblue-500">Contact</span>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg leading-none text-slateblue-400 hover:bg-nest-100 hover:text-slateblue-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!!contactStats?.stats.length && (
          <div className="grid grid-cols-2 gap-2 px-4 pt-4">
            {contactStats.stats.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
        )}

        <div className="p-4">
          <ContactDetailContent contactId={contactId} onDeleted={onClose} onNavigateContact={onNavigateContact} />
        </div>
      </div>
    </>
  );
}
