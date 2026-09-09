import { useNavigate, useParams } from "react-router-dom";
import { ContactDetailContent } from "../components/ContactDetailContent";

export function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) return null;

  return <ContactDetailContent contactId={id} onDeleted={() => navigate("/")} />;
}
