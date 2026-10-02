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
import './LandingPage.css';

import tabletSketch from './assets/home-art/tablet-sketch.webp';
import designWorkstation from './assets/home-art/design-workstation.webp';
import portfolioProfile from './assets/home-art/portfolio-profile.webp';
import creativeWhiteboard from './assets/home-art/creative-whiteboard.webp';
import digitalIllustration from './assets/home-art/digital-illustration.webp';
import photographyKit from './assets/home-art/photography-kit.webp';

const LANDING_ART = [tabletSketch, designWorkstation, portfolioProfile, creativeWhiteboard, digitalIllustration, photographyKit];

function RequireAuth({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/" replace />;
}

function LandingPage({ activeTemplateId, setActiveTemplateId }) {
  const [authRequest, setAuthRequest] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const openAuth = (tab, templateId) => {
    if (templateId) sessionStorage.setItem('pagecraft:template', templateId);
    else sessionStorage.removeItem('pagecraft:template');
    setSelectedTemplateId(templateId || null);
    setAuthRequest(tab);
  };

  return (
    <div className="landing-home">
      <div className="landing-home__art" aria-hidden="true">
        {LANDING_ART.map((image, index) => <img key={image} src={image} alt="" className={`landing-home__art-image landing-home__art-image--${index + 1}`} />)}
      </div>
      <Navbar
        authRequest={authRequest}
        selectedTemplateId={selectedTemplateId}
        onOpenAuth={openAuth}
        onCloseAuth={() => { setAuthRequest(null); setSelectedTemplateId(null); }}
      />
      <Hero onStartBuilding={() => openAuth('signup')} />
      <Templates
        activeTemplateId={activeTemplateId}
        onPick={setActiveTemplateId}
        onStartBuilding={(templateId) => openAuth('signup', templateId)}
      />
      <Features />
      <Footer onStartBuilding={() => openAuth('signup')} />
    </div>
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
