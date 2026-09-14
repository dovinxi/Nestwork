import { useNavigate, useParams } from "react-router-dom";
import { ContactFormContent } from "../components/ContactFormContent";

export function ContactFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl">
      <ContactFormContent
        contactId={id}
        onSaved={(contact) => navigate(`/contacts/${contact.id}`)}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
