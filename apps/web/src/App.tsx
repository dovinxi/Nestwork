import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ContactsListPage } from "./pages/ContactsListPage";
import { ContactDetailPage } from "./pages/ContactDetailPage";
import { ContactFormPage } from "./pages/ContactFormPage";
import { NestPage } from "./pages/NestPage";
import { CreatePage } from "./pages/CreatePage";
import { ProfilePage } from "./pages/ProfilePage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<NestPage />} />
        <Route path="/contacts" element={<ContactsListPage />} />
        <Route path="/contacts/new" element={<ContactFormPage />} />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/contacts/:id/edit" element={<ContactFormPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/me" element={<ProfilePage />} />
      </Routes>
    </Layout>
  );
}
