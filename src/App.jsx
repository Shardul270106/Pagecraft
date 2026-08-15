import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductMockup from './components/ProductMockup';
import Templates from './components/Templates';
import Features from './components/Features';
import Footer from './components/Footer';

export default function App() {
  const [activeTemplateId, setActiveTemplateId] = useState('professional-portfolio');

  return (
    <div className="app">
      <Navbar />
      <Hero />
      <Templates activeTemplateId={activeTemplateId} onPick={setActiveTemplateId} />
      <Features />
      <Footer />
    </div>
  );
}
