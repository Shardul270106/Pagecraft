import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductMockup from './components/ProductMockup';
import Templates from './components/Templates';
import Features from './components/Features';
import Footer from './components/Footer';
import Home from './pages/Home';
import Editor from './pages/Editor';
import PublicPortfolio from './pages/PublicPortfolio';
import { Navigate } from 'react-router-dom';

function RequireAuth({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/" replace />;
}

function LandingPage({ activeTemplateId, setActiveTemplateId }) {
  return (
    <>
      <Navbar />
      <Hero />
      <Templates activeTemplateId={activeTemplateId} onPick={setActiveTemplateId} />
      <Features />
      <Footer />
    </>
  );
}

export default function App() {
  const [activeTemplateId, setActiveTemplateId] = useState('professional-portfolio');

  return (
    <div className="app">
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              activeTemplateId={activeTemplateId}
              setActiveTemplateId={setActiveTemplateId}
            />
          }
        />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/editor/:id" element={<RequireAuth><Editor /></RequireAuth>} />
        <Route path="/p/:slug" element={<PublicPortfolio />} />
      </Routes>
    </div>
  );
}
