import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';   
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductMockup from './components/ProductMockup';
import Templates from './components/Templates';
import Features from './components/Features';
import Footer from './components/Footer';
import Home from './pages/Home';               

function LandingPage({ activeTemplateId, setActiveTemplateId }) {
  return (
    <>
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
      <Navbar />
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
        <Route path="/home" element={<Home />} />
      </Routes>
    </div>
  );
}