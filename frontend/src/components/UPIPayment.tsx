import { QrCode, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface UPIPaymentProps {
  amount: number;
  workerName: string;
  upiId?: string;
  onPaymentSuccess?: () => void;
}

export default function UPIPayment({ 
  amount, 
  workerName, 
  upiId = 'sih26089@upi', 
  onPaymentSuccess 
}: UPIPaymentProps) {
  
  // UPI Intent URL format
  const upiIntentUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(workerName)}&am=${amount}&cu=INR&tn=Payment for Cooperative Service`;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div className="text-center">
        <h3 className="font-bold text-slate-800 text-lg">Pay with UPI</h3>
        <p className="text-sm text-slate-500 font-medium">Scan QR code or click the button below to pay directly via any UPI app.</p>
      </div>

      <div className="flex justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 inline-block">
          <QRCodeSVG 
            value={upiIntentUrl} 
            size={180} 
            level="H"
            includeMargin={true}
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Amount to Pay</span>
        <span className="text-3xl font-extrabold text-slate-900">₹{amount.toFixed(2)}</span>
      </div>

      <a 
        href={upiIntentUrl}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-md transition-transform active:scale-95"
      >
        <QrCode className="w-5 h-5" />
        Open UPI App (GPay, PhonePe, Paytm)
      </a>

      {onPaymentSuccess && (
        <button 
          onClick={onPaymentSuccess}
          className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 underline"
        >
          I have already paid / Skip for Dev
        </button>
      )}
    </div>
  );
}
