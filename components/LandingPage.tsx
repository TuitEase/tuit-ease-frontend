import React, { useEffect, useState } from 'react';
import { getAuthToken, isAuthTokenStorageEvent } from '../src/auth/api';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { Problem } from './Problem';
import { HowItWorks } from './HowItWorks';
import { Features } from './Features';
import { BeforeAfter } from './BeforeAfter';
import { WhoItsFor } from './WhoItsFor';
import { SocialProof } from './SocialProof';
import { Pricing } from './Pricing';
import { FAQ } from './FAQ';
import { FinalCTA } from './FinalCTA';
import { Footer } from './Footer';

export const LandingPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAuthToken()));

  useEffect(() => {
    const updateAuthState = (event: StorageEvent) => {
      if (isAuthTokenStorageEvent(event)) setIsAuthenticated(Boolean(getAuthToken()));
    };
    window.addEventListener('storage', updateAuthState);
    return () => window.removeEventListener('storage', updateAuthState);
  }, []);

  const handleTrack = (eventName: string, payload: Record<string, unknown> = {}) => {
    // Analytics Placeholder - Replace with Segment, Google Analytics, or Mixpanel
    if (typeof window !== 'undefined') {
      console.log(`[TuitEase Analytics] ${eventName}:`, payload);
      // (window as any).gtag?.('event', eventName, payload);
      // (window as any).mixpanel?.track(eventName, payload);
    }
  };

  const handleOpenSignup = () => {
    window.location.assign(isAuthenticated ? '/dashboard/' : '/signup/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar onOpenSignup={handleOpenSignup} onTrack={handleTrack} isAuthenticated={isAuthenticated} />
      <main>
        <Hero onOpenSignup={handleOpenSignup} onTrack={handleTrack} />
        <Problem />
        <HowItWorks onOpenSignup={handleOpenSignup} />
        <Features />
        <BeforeAfter />
        <WhoItsFor />
        <SocialProof />
        <Pricing onOpenSignup={handleOpenSignup} />
        <FAQ onTrack={handleTrack} />
        <FinalCTA onOpenSignup={handleOpenSignup} />
      </main>
      <Footer onOpenSignup={handleOpenSignup} />
    </div>
  );
};

export default LandingPage;
