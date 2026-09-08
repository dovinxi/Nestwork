import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ContactsListPage } from "./pages/ContactsListPage";
import { ContactDetailPage } from "./pages/ContactDetailPage";
import { ContactFormPage } from "./pages/ContactFormPage";
import { RelationshipWebPage } from "./pages/RelationshipWebPage";
import { TagsSettingsPage } from "./pages/TagsSettingsPage";
import { CirclesSettingsPage } from "./pages/CirclesSettingsPage";
import { ProfilePage } from "./pages/ProfilePage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ContactsListPage />} />
        <Route path="/contacts/new" element={<ContactFormPage />} />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/contacts/:id/edit" element={<ContactFormPage />} />
        <Route path="/web" element={<RelationshipWebPage />} />
        <Route path="/tags" element={<TagsSettingsPage />} />
        <Route path="/circles" element={<CirclesSettingsPage />} />
        <Route path="/me" element={<ProfilePage />} />
      </Routes>
    </Layout>
  );
}
