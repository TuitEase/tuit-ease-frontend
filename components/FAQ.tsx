import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Do my students need to download an app or create an account?",
    answer: "No! That is the beauty of TuitEase. Students open your link, enter their name and phone number, and pay or confirm their seat. All reminders arrive straight on their existing WhatsApp and SMS."
  },
  {
    question: "Which payment methods are supported?",
    answer: "We integrate directly with Paystack. Your students can pay with Nigerian debit cards (Mastercard, Visa, Verve), bank transfers (instant virtual account), Apple Pay, or USSD. You can also manually record cash or offline transfers with one tap."
  },
  {
    question: "Can my students pay in installments?",
    answer: "Yes. When setting up a class, you can toggle on 'Allow Installments' and choose whether to allow 2 or 3 parts. TuitEase calculates the schedule, generates clean payment links, and chases the due dates on WhatsApp automatically."
  },
  {
    question: "Does it work for in-person / physical classes?",
    answer: "Yes! When creating a class, select 'Offline' or 'Hybrid'. You can provide your physical venue address and a Google Maps link. All confirmations and day-before reminders will include the directions and map link for your attendees."
  },
  {
    question: "Is my money safe and how do payouts work?",
    answer: "100% safe. We use Paystack Subaccounts. Your bank account details are verified directly through Paystack. When a student pays, the transaction splits automatically—your earnings land directly in your registered bank account on Paystack's standard settlement schedule."
  },
  {
    question: "What if a student doesn't have WhatsApp?",
    answer: "TuitEase automatically detects undelivered WhatsApp messages and seamlessly falls back to regular SMS via Termii. Your student never misses their seat confirmation or class link."
  },
  {
    question: "How fast can I set up my first class?",
    answer: "Under 3 minutes. Sign up with Google or your email, name your class, set a price and capacity, and your public booking link is live and ready to paste into your WhatsApp bio."
  }
];

interface FAQProps {
  onTrack: (eventName: string, payload?: Record<string, unknown>) => void;
}

export const FAQ: React.FC<FAQProps> = ({ onTrack }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    const next = openIndex === idx ? null : idx;
    setOpenIndex(next);
    if (next !== null) {
      onTrack('faq_opened', { question: faqs[idx].question });
    }
  };

  return (
    <section id="faq" className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600 mb-2">
            Got Questions?
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Frequently asked questions
          </h3>
          <p className="mt-4 text-slate-600 text-base">
            Everything you need to know about setting up your classes on TuitEase.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-colors">
                <button 
                  onClick={() => toggle(idx)}
                  className="w-full p-6 text-left flex items-center justify-between font-bold text-slate-900 text-base sm:text-lg focus:outline-none"
                >
                  <span>{faq.question}</span>
                  <svg 
                    className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
