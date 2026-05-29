import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SearchResultPage from "./pages/SearchResultPage";
import NotebooksPage from "./pages/NotebooksPage";
import NotebookDetailPage from "./pages/NotebookDetailPage";
import PracticePage from "./pages/PracticePage";
import SettingsPage from "./pages/SettingsPage";
import KanjiDetailPage from "./pages/KanjiDetailPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
        <Routes>
          {/* Pages with Layout (Sidebar + Header) */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchResultPage />} />
            <Route path="/notebooks" element={<NotebooksPage />} />
            <Route path="/notebooks/:id" element={<NotebookDetailPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/kanji/:char" element={<KanjiDetailPage />} />
          </Route>

          {/* Auth pages (no Layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
