import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    color: 'from-slate-600 to-slate-700',
    borderColor: 'border-slate-600/30',
    glowColor: '',
    badge: null,
    features: [
      { text: 'Basic bot commands', included: true },
      { text: '1 Ticket panel', included: true },
      { text: '5 Giveaways / month', included: true },
      { text: 'Basic welcome messages', included: true },
      { text: 'Community support', included: true },
      { text: 'Custom embed colors', included: false },
      { text: 'AI Assistant', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false },
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    period: '/month',
    color: 'from-indigo-600 to-purple-600',
    borderColor: 'border-indigo-500/30',
    glowColor: 'shadow-indigo-500/20',
    badge: 'POPULAR',
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Unlimited ticket panels', included: true },
      { text: 'Unlimited giveaways', included: true },
      { text: 'Custom welcome embeds', included: true },
      { text: 'Auto-role management', included: true },
      { text: 'Custom embed colors', included: true },
      { text: 'Audit log exports', included: true },
      { text: 'Priority support', included: true },
      { text: 'AI Assistant (limited)', included: true },
    ]
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: 9.99,
    period: '/month',
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/30',
    glowColor: 'shadow-amber-500/20',
    badge: 'BEST VALUE',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'AI Assistant (unlimited)', included: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'Custom bot branding', included: true },
      { text: 'Multiple ticket panels', included: true },
      { text: 'Transcript exports (PDF)', included: true },
      { text: 'Staff verification system', included: true },
      { text: 'Custom commands', included: true },
      { text: 'Dedicated support channel', included: true },
    ]
  }
];

// Payment method SVG logos
const PayPalLogo = () => (
  <svg viewBox="0 0 124 33" className="h-6">
    <path fill="#253B80" d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z"/>
    <path fill="#179BD7" d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z" fill="#179BD7"/>
    <path fill="#253B80" d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z"/>
    <path fill="#179BD7" d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z"/>
    <path fill="#222D65" d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-1.294-.516z"/>
  </svg>
);

const BinanceLogo = () => (
  <svg viewBox="0 0 126 30" className="h-5">
    <path fill="#F0B90B" d="M8.528 15.001l4.472-4.472 4.474 4.472-4.474 4.474-4.472-4.474zm4.472-10.529L20.529 12l2.529-2.529L13 1.943 5.472 9.471 8 12l5-7.528zM2.529 15.001L0 12.472v5.058l2.529 2.529 2.528-2.529-2.528-2.529zm10.471 10.528L5.472 18l-2.529 2.529L13 28.057l7.529-7.528L18 18l-5 7.529zM23.472 15l2.528-2.529v5.058L23.472 20 20.943 17.47 23.472 15z"/>
    <path fill="#F0B90B" d="M16.236 15L13 11.764 10.588 14.176l-.278.278-.546.546L13 18.236 16.236 15z"/>
    <text x="32" y="22" fill="#F0B90B" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold">Binance</text>
  </svg>
);

const StripeLogo = () => (
  <svg viewBox="0 0 60 25" className="h-5">
    <path fill="#635BFF" d="M5 10.3c0-.7.6-1 1.5-1 1.3 0 3 .4 4.3 1.1V6.7c-1.5-.6-2.9-.8-4.3-.8C3.2 5.9.5 7.9.5 11.1c0 4.9 6.8 4.1 6.8 6.3 0 .8-.7 1.1-1.7 1.1-1.5 0-3.4-.6-4.9-1.4v3.8c1.7.7 3.3 1 4.9 1 3.4 0 5.7-1.7 5.7-4.9 0-5.3-6.8-4.3-6.8-6.4l.5-.3zM16.6 3.3l-4.4.9v3.5l4.4-.9V3.3zm0 4.3h-4.4v14.1h4.4V7.6zm5.3 1.3l-.3-1.3h-4v14.1h4.4v-9.6c1-1.3 2.8-1.1 3.3-.9V7.6c-.6-.2-2.5-.6-3.4 1.3zm8.7-1.3h-3.3l-.1 11.2c0 2.1 1.5 3.6 3.6 3.6 1.1 0 2-.2 2.4-.5v-3.4c-.4.2-2.5.7-2.5-1.1V11h2.5V7.6h-2.5l-.1-3.1zm10.1 3.5c-1.5 0-2.4.7-2.9 1.2l-.2-1h-4v18.7l4.4-.9v-4.5c.6.4 1.4 1 2.8 1 2.8 0 5.4-2.3 5.4-7.2-.1-4.6-2.7-7.3-5.5-7.3zm-1 10.8c-.9 0-1.5-.3-1.9-.8v-6.3c.4-.5 1-.8 1.9-.8 1.5 0 2.5 1.6 2.5 4 0 2.3-1 3.9-2.5 3.9zm14.4-10.8c-2.6 0-4.7 1.1-4.7 3.3 0 2.2 2 2.9 3.6 3.2 1.2.3 1.6.5 1.6.9 0 .5-.5.7-1.3.7-1.2 0-2.7-.5-3.8-1.2v3.5c1.3.6 2.6.8 3.8.8 2.7 0 4.8-1.1 4.8-3.4 0-2.3-2.1-3-3.7-3.4-1.1-.3-1.5-.4-1.5-.8 0-.4.4-.6 1.1-.6 1 0 2.3.3 3.3.9V8c-1.1-.5-2.3-.7-3.2-.7v-.2z"/>
  </svg>
);

const CryptoIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" stroke="#F0B90B" strokeWidth="2"/>
    <path d="M12 6v2m0 8v2m-4-8h2m4 0h2m-6.5-2.5L11 9m2 6l1.5 1.5m-9-1.5L7 13.5m8 0l1.5 1.5m-9-7L9 9.5m6 5l1.5 1.5" stroke="#F0B90B" strokeWidth="1.5" strokeLinecap="round"/>
    <text x="9" y="16" fill="#F0B90B" fontSize="8" fontWeight="bold">₿</text>
  </svg>
);

export default function Premium({ selectedGuild }) {
  const { t } = useTranslation();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState(null);

  useEffect(() => {
    fetchPremiumStatus();
  }, []);

  const fetchPremiumStatus = async () => {
    try {
      const res = await fetch('/api/dashboard/premium/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPremiumStatus(data);
        setCurrentPlan(data.plan || 'free');
      }
    } catch (e) {
      console.error('Failed to fetch premium status:', e);
    }
  };

  const handleSelectPlan = (plan) => {
    if (plan.id === 'free' || plan.id === currentPlan) return;
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePayment = async (method) => {
    setProcessing(true);
    try {
      let endpoint;
      switch (method) {
        case 'paypal':
          endpoint = '/api/dashboard/premium/paypal/create-order';
          break;
        case 'stripe':
          endpoint = '/api/dashboard/premium/stripe/create-session';
          break;
        case 'binance':
          endpoint = '/api/dashboard/premium/crypto/create-order';
          break;
        default:
          return;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: selectedPlan.id })
      });

      if (res.ok) {
        const data = await res.json();
        if (method === 'stripe' && data.url) {
          // Stripe redirects to checkout page
          window.location.href = data.url;
        } else if (method === 'paypal') {
          // Show PayPal payment info
          alert(`PayPal Payment\n\nPlan: ${data.description}\nAmount: $${data.amount} ${data.currency}\n\nPlease send payment to our PayPal and provide the transaction ID to activate your premium.\n\nContact support after payment.`);
        } else if (method === 'binance') {
          // Show crypto payment info
          alert(`Crypto Payment\n\nPlan: ${data.description}\nAmount: ${data.amount} ${data.currency}\nNetwork: ${data.network}\nSupported: ${data.supportedCoins.join(', ')}\n\nWallet: ${data.walletAddress}\n\nSend the exact amount and provide the transaction hash to activate your premium.\n\nContact support after payment.`);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || 'Payment failed. Please try again.');
      }
    } catch (e) {
      console.error('Payment error:', e);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
      setShowPaymentModal(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-full mb-6">
          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
          <span className="text-amber-400 text-sm font-bold">PREMIUM</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
          Upgrade to <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Premium</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Unlock the full power of Supreme Bot with premium features, unlimited access, and priority support.
        </p>
      </div>

      {/* Current Plan Badge */}
      {currentPlan !== 'free' && (
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl">
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" />
            <span className="text-white font-medium">Current Plan: <span className="text-indigo-400 font-bold capitalize">{currentPlan}</span></span>
            {premiumStatus?.expiresAt && (
              <span className="text-slate-400 text-sm">• Renews {new Date(premiumStatus.expiresAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-slate-800/50 backdrop-blur-xl rounded-3xl border ${plan.borderColor} p-8 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${plan.glowColor} ${
              plan.badge === 'POPULAR' ? 'ring-2 ring-indigo-500/50' : ''
            }`}
          >
            {/* Badge */}
            {plan.badge && (
              <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${plan.color} shadow-lg`}>
                {plan.badge}
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                {plan.price === 0 ? (
                  <span className="text-4xl font-bold text-white">Free</span>
                ) : (
                  <>
                    <span className="text-lg text-slate-400">$</span>
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </>
                )}
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  {feature.included ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                  )}
                  <span className={`text-sm ${feature.included ? 'text-slate-300' : 'text-slate-500'}`}>{feature.text}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => handleSelectPlan(plan)}
              disabled={plan.id === currentPlan || plan.id === 'free'}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${
                plan.id === currentPlan
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : plan.id === 'free'
                  ? 'bg-slate-700/50 text-slate-400 cursor-default'
                  : `bg-gradient-to-r ${plan.color} text-white hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02]`
              }`}
            >
              {plan.id === currentPlan ? '✓ Current Plan' : plan.id === 'free' ? 'Free Forever' : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Methods Section */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-3">Accepted Payment Methods</h2>
        <p className="text-slate-400">Secure payments powered by industry-leading providers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
        {/* PayPal */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 text-center hover:border-[#0070ba]/30 transition-all duration-300 group">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#003087]/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <PayPalLogo />
          </div>
          <h3 className="text-white font-bold mb-1">PayPal</h3>
          <p className="text-slate-400 text-sm">Credit/Debit Cards & PayPal Balance</p>
        </div>

        {/* Binance Pay */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 text-center hover:border-[#F0B90B]/30 transition-all duration-300 group">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#F0B90B]/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <BinanceLogo />
          </div>
          <h3 className="text-white font-bold mb-1">Binance Pay</h3>
          <p className="text-slate-400 text-sm">BTC, ETH, USDT, BNB & more</p>
        </div>

        {/* Stripe */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 text-center hover:border-[#635BFF]/30 transition-all duration-300 group">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#635BFF]/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <StripeLogo />
          </div>
          <h3 className="text-white font-bold mb-1">Stripe</h3>
          <p className="text-slate-400 text-sm">Apple Pay, Google Pay & Cards</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { q: 'Can I cancel anytime?', a: 'Yes! You can cancel your subscription at any time. Your premium features will remain active until the end of your billing period.' },
            { q: 'Do I get a refund if I cancel?', a: 'We offer a 7-day money-back guarantee. If you\'re not satisfied within the first 7 days, contact us for a full refund.' },
            { q: 'Can I switch plans?', a: 'Absolutely! You can upgrade or downgrade your plan at any time. The price difference will be prorated.' },
            { q: 'Is my payment secure?', a: 'Yes, all payments are processed through PayPal, Stripe, or Binance Pay - industry-leading payment providers with bank-level encryption.' },
          ].map((faq, i) => (
            <details key={i} className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 group">
              <summary className="p-5 cursor-pointer text-white font-medium flex items-center justify-between hover:text-indigo-400 transition-colors">
                {faq.q}
                <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-5 pb-5 text-slate-400 text-sm">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r ${selectedPlan.color} mb-4`}>
                {selectedPlan.name.toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Choose Payment Method</h2>
              <p className="text-slate-400">
                <span className="text-white font-bold text-3xl">${selectedPlan.price}</span>
                <span className="text-slate-400">{selectedPlan.period}</span>
              </p>
            </div>

            {/* Payment Options */}
            <div className="space-y-3 mb-6">
              {/* PayPal */}
              <button
                onClick={() => handlePayment('paypal')}
                disabled={processing}
                className="w-full flex items-center gap-4 p-4 bg-[#003087]/10 hover:bg-[#003087]/20 border border-[#003087]/30 hover:border-[#003087]/50 rounded-2xl transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-[#003087]/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PayPalLogo />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-bold">PayPal</p>
                  <p className="text-slate-400 text-xs">Credit/Debit Cards & PayPal Balance</p>
                </div>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>

              {/* Binance Pay */}
              <button
                onClick={() => handlePayment('binance')}
                disabled={processing}
                className="w-full flex items-center gap-4 p-4 bg-[#F0B90B]/5 hover:bg-[#F0B90B]/10 border border-[#F0B90B]/20 hover:border-[#F0B90B]/40 rounded-2xl transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-[#F0B90B]/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BinanceLogo />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-bold">Binance Pay</p>
                  <p className="text-slate-400 text-xs">BTC, ETH, USDT, BNB & 100+ coins</p>
                </div>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>

              {/* Stripe */}
              <button
                onClick={() => handlePayment('stripe')}
                disabled={processing}
                className="w-full flex items-center gap-4 p-4 bg-[#635BFF]/5 hover:bg-[#635BFF]/10 border border-[#635BFF]/20 hover:border-[#635BFF]/40 rounded-2xl transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-[#635BFF]/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <StripeLogo />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-bold">Stripe</p>
                  <p className="text-slate-400 text-xs">Apple Pay, Google Pay & Credit Cards</p>
                </div>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Secured with 256-bit SSL encryption
            </div>

            {/* Cancel */}
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full py-3 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
