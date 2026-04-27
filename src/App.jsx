import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SociogramApp } from './SociogramApp.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { isSupabaseTeacherPortalEnabled } from './config.js';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import TeacherClassList from './pages/TeacherClassList.jsx';
import TeacherSessionPage from './pages/TeacherSessionPage.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

function appBasename() {
  const b = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  if (!b || b === '') return;
  return b;
}

function AppRoutes() {
  if (!isSupabaseTeacherPortalEnabled()) {
    return <SociogramApp />;
  }
  return (
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route
        path="/teacher"
        element={
          <PrivateRoute>
            <TeacherClassList />
          </PrivateRoute>
        }
      />
      <Route
        path="/teacher/session/:sessionId"
        element={
          <PrivateRoute>
            <TeacherSessionPage />
          </PrivateRoute>
        }
      />
      <Route path="/*" element={<SociogramApp />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={appBasename()}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
