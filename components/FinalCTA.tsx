import React from 'react';

interface FinalCTAProps {
  onOpenSignup: (source: string) => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onOpenSignup }) => {
  return (
    <section className="py-20 lg:py-28 bg-emerald-900 text-white relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Ready to run your next workshop without the headaches?
        </h2>
        <p className="mt-6 text-lg sm:text-xl text-emerald-100 max-w-2xl mx-auto font-normal">
          Join hundreds of trainers, tutors, and coaches who fill their classes and get paid on autopilot.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => onOpenSignup('final_cta')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-emerald-950 bg-white hover:bg-emerald-50 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
          >
            Create your first class in 2 minutes
          </button>
        </div>

        <p className="mt-6 text-xs sm:text-sm text-emerald-300 font-medium">
          ✓ No credit card required &nbsp;·&nbsp; ✓ Free for your first 3 classes &nbsp;·&nbsp; ✓ Setup takes 2 minutes
        </p>
      </div>
    </section>
  );
};
