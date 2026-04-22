import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowLeft, Copy, CheckCircle2, AlertCircle, Clock, Shield, Zap, RefreshCw, Wallet, Hash, DollarSign, Info, Check, Loader } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode';
import { toast } from 'react-toastify';
import BottomNav from '../components/BottomNav';

const NETWORKS = [
  { id: 'TRC20', label: 'TRC20', full: 'TRON Network', color: '#E84142', badge: 'Recommended', speed: 'Fast ~1 min', logo: 'https://cryptologos.cc/logos/tron-trx-logo.png' },
  { id: 'BSC',   label: 'BSC',   full: 'BNB Smart Chain', color: '#F0B90B', badge: 'Low Fee', speed: 'Medium ~3 min', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
];

const StepBar = ({ current }) => (
  <div className="flex items-center mb-5">
    {['Network','Pay','Confirm'].map((s,i)=>(
      <React.Fragment key={i}>
        <div className="flex flex-col items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i<current?'bg-emerald-500 text-white':i===current?'bg-primary text-black':'bg-white/10 text-white/30'}`}>
            {i<current?<Check size={13}/>:i+1}
          </div>
          <span className={`text-[10px] mt-1 whitespace-nowrap ${i===current?'text-primary':i<current?'text-emerald-400':'text-white/30'}`}>{s}</span>
        </div>
        {i<2&&<div className={`h-[2px] flex-1 mx-1 mb-4 rounded-full ${i<current?'bg-emerald-500':'bg-white/10'}`}/>}
      </React.Fragment>
    ))}
  </div>
);

export default function Deposit() {
  const navigate = useNavigate();
  const { state: pkgInfo } = useLocation();
  const [step, setStep] = useState(0);
  const [net, setNet] = useState('TRC20');
  const [amount, setAmount] = useState(pkgInfo?.minAmount || '');
  const [txHash, setTxHash] = useState('');
  const [minDeposit, setMinDeposit] = useState(50);
  const [wallets, setWallets] = useState({ TRC20:'', BSC:'' });
  const [autoMode, setAutoMode] = useState(true); // default: NowPayments
  const [npApi, setNpApi] = useState(true);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState([]);
  // Auto-pay state
  const [payInfo, setPayInfo] = useState(null); // {payAddress,payCurrency,payAmount,depositId,paymentId}
  const [payStatus, setPayStatus] = useState(null);
  const pollRef = useRef(null);

  const token = () => localStorage.getItem('token');
  const curNet = NETWORKS.find(n=>n.id===net);
  const curAddr = autoMode ? payInfo?.payAddress : wallets[net];

  useEffect(()=>{
    axios.get('/api/recharge/wallets').then(r=>{
      setWallets(r.data.wallets||{});
      if(r.data.minDepositAmount) setMinDeposit(r.data.minDepositAmount);
    }).catch(()=>{});
    axios.get('/api/recharge/nowpayments/status').then(r=>setNpApi(r.data?.available!==false)).catch(()=>setNpApi(false));
    fetchHistory();
  },[]);

  const fetchHistory = async()=>{
    try{ const r=await axios.get('/api/recharge/history',{headers:{Authorization:`Bearer ${token()}`}}); setHistory(r.data?.deposits||[]); }catch{}
  };

  useEffect(()=>{
    const addr = curAddr;
    if(addr){ QRCode.toDataURL(addr,{width:200,margin:1,color:{dark:'#000',light:'#fff'}}).then(setQr).catch(()=>{}); }
    else setQr('');
  },[curAddr,net]);

  // Poll payment status every 8s
  useEffect(()=>{
    if(step===1&&autoMode&&payInfo?.depositId&&payStatus!=='approved'){
      pollRef.current=setInterval(async()=>{
        try{
          const r=await axios.get(`/api/recharge/payment-status/${payInfo.depositId}`,{headers:{Authorization:`Bearer ${token()}`}});
          setPayStatus(r.data.status);
          if(r.data.status==='approved'){ clearInterval(pollRef.current); setDone(true); fetchHistory(); }
        }catch{}
      },8000);
    }
    return()=>clearInterval(pollRef.current);
  },[step,payInfo,autoMode]);

  const copy = (addr)=>{ navigator.clipboard.writeText(addr); setCopied(true); toast.success('Copied!',{autoClose:1500}); setTimeout(()=>setCopied(false),2000); };

  const validate = ()=>{
    const amt=parseFloat(amount);
    if(!amount||isNaN(amt)){ toast.error('Enter amount'); return false; }
    if(amt<minDeposit){ toast.error(`Minimum ${minDeposit} USDT`); return false; }
    if(pkgInfo){ if(amt<pkgInfo.minAmount){ toast.warning(`Min ${pkgInfo.minAmount} USDT`); return false; } if(amt>pkgInfo.maxAmount){ toast.warning(`Max ${pkgInfo.maxAmount} USDT`); return false; } }
    return true;
  };

  const handleAutoCreate = async()=>{
    if(!validate()) return;
    setSubmitting(true);
    try{
      const r=await axios.post('/api/recharge/create-payment',{amount:parseFloat(amount),network:net,packageId:pkgInfo?.packageId,packageName:pkgInfo?.packageName},{headers:{Authorization:`Bearer ${token()}`}});
      setPayInfo(r.data);
      setPayStatus('waiting');
      setStep(1);
    }catch(e){ toast.error(e.response?.data?.message||'Failed to create payment'); }
    finally{ setSubmitting(false); }
  };

  const handleManualSubmit = async()=>{
    if(!validate()) return;
    if(!txHash||txHash.length<10){ toast.error('Enter valid TX hash'); return; }
    setSubmitting(true);
    try{
      await axios.post('/api/recharge/submit',{amount:parseFloat(amount),transactionHash:txHash,network:net,packageId:pkgInfo?.packageId,packageName:pkgInfo?.packageName},{headers:{Authorization:`Bearer ${token()}`}});
      setDone(true); fetchHistory();
    }catch(e){ toast.error(e.response?.data?.message||'Submission failed'); }
    finally{ setSubmitting(false); }
  };

  const stColor = s=>s==='approved'?'text-emerald-400 bg-emerald-400/10':s==='rejected'||s==='expired'?'text-red-400 bg-red-400/10':'text-amber-400 bg-amber-400/10';

  if(done) return(
    <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center px-6 pb-24">
      <div className="text-center animate-modal-in">
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-500/30">
          <CheckCircle2 size={48} className="text-emerald-400"/>
        </div>
        <h2 className="text-white text-2xl font-bold mb-2">{autoMode?'Payment Confirmed!':'Deposit Submitted!'}</h2>
        <p className="text-white/50 text-sm mb-6">{autoMode?'Your balance has been credited automatically.':'Under review — usually 10-30 minutes.'}</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left mb-6 max-w-xs mx-auto space-y-2">
          {[['Amount',`${amount} USDT`],['Network',net],['Method',autoMode?'Auto (NowPayments)':'Manual'],['Status',autoMode?'Confirmed':'Pending']].map(([k,v])=>(
            <div key={k} className="flex justify-between text-xs"><span className="text-white/40">{k}</span><span className="text-white font-medium">{v}</span></div>
          ))}
        </div>
        <button onClick={()=>navigate('/home')} className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-primary to-cyan-400 text-black font-bold mb-2">Back to Home</button>
        <button onClick={()=>{setDone(false);setStep(0);setPayInfo(null);setTxHash('');setAmount(pkgInfo?.minAmount||'');}} className="w-full max-w-xs py-3 rounded-xl border border-white/10 text-white/50 text-sm">New Deposit</button>
      </div>
      <BottomNav/>
    </div>
  );

  return(
    <div className="min-h-screen bg-[#0b1120] pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-cyan-500/10 to-transparent pointer-events-none"/>
        <div className="max-w-md mx-auto px-4 pt-4 pb-3 flex items-center gap-3 relative z-10">
          <button onClick={()=>step>0?setStep(s=>s-1):navigate(-1)} className="p-2 rounded-xl bg-white/10 text-white">
            <ArrowLeft size={20}/>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Crypto Deposit</h1>
            <p className="text-white/40 text-xs">USDT · Auto &amp; Manual</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-full">
            <Shield size={12} className="text-emerald-400"/><span className="text-emerald-400 text-xs font-semibold">Secure</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-3 space-y-4">
        {pkgInfo&&(
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center gap-3">
            <Zap size={18} className="text-primary flex-shrink-0"/>
            <div><p className="text-white font-semibold text-sm">{pkgInfo.packageName}</p><p className="text-primary text-xs">{pkgInfo.minAmount}–{pkgInfo.maxAmount} USDT</p></div>
          </div>
        )}

        <StepBar current={step}/>

        {/* ── STEP 0: Config ── */}
        {step===0&&(
          <div className="space-y-4 animate-fade-in">
            {/* Payment Mode Toggle */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex gap-1">
              {[{v:true,l:'🤖 Auto Pay',d:'NowPayments — instant'},{v:false,l:'✍️ Manual',d:'Submit TX hash'}].map(({v,l,d})=>(
                <button key={String(v)} onClick={()=>setAutoMode(v)} className={`flex-1 py-2 rounded-xl text-center transition-all ${autoMode===v?'bg-primary text-black':'text-white/50 hover:text-white'}`}>
                  <p className="text-xs font-bold">{l}</p>
                  <p className={`text-[10px] ${autoMode===v?'text-black/70':'text-white/30'}`}>{d}</p>
                </button>
              ))}
            </div>

            {autoMode&&!npApi&&(
              <div className="flex gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5"/>
                <p className="text-amber-300 text-xs">Auto Pay temporarily unavailable. Use Manual mode.</p>
              </div>
            )}

            {/* Network */}
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2">Select Network</p>
              <div className="grid grid-cols-2 gap-2">
                {NETWORKS.map(n=>(
                  <button key={n.id} onClick={()=>setNet(n.id)} className={`p-3 rounded-2xl border text-left transition-all relative ${net===n.id?'border-primary/60 bg-primary/10':'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    {net===n.id&&<div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check size={10} className="text-black"/></div>}
                    <div className="flex items-center gap-2 mb-1">
                      <img src={n.logo} alt="" className="w-6 h-6 object-contain" onError={e=>e.target.style.display='none'}/>
                      <span className="text-white font-bold text-sm">{n.label}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{background:n.color+'25',color:n.color}}>{n.badge}</span>
                    <p className="text-white/30 text-[10px] mt-1">{n.speed}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <label className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider mb-3">
                <DollarSign size={12} className="text-primary"/> Amount (USDT)
                {pkgInfo&&<span className="ml-auto text-primary/70 normal-case">{pkgInfo.minAmount}–{pkgInfo.maxAmount}</span>}
              </label>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={`Min: ${minDeposit}`}
                className="w-full bg-transparent text-white text-xl font-bold placeholder-white/20 focus:outline-none"/>
              <div className="h-px bg-white/10 mt-2"/>
              <p className="text-white/30 text-xs mt-2">Min deposit: <span className="text-primary">{minDeposit} USDT</span></p>
            </div>

            <button onClick={autoMode&&npApi?handleAutoCreate:()=>setStep(1)}
              disabled={submitting||(autoMode&&!npApi)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-cyan-400 text-black font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting?<><Loader size={16} className="animate-spin"/>Creating Payment...</>:autoMode?'Generate Payment Address →':'Continue to Submit →'}
            </button>
          </div>
        )}

        {/* ── STEP 1: Pay / Submit ── */}
        {step===1&&(
          <div className="space-y-4 animate-fade-in">
            {autoMode&&payInfo?(
              <>
                {/* Status banner */}
                <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold
                  ${payStatus==='approved'?'bg-emerald-500/15 border-emerald-500/30 text-emerald-400':
                    payStatus==='confirming'?'bg-blue-500/15 border-blue-500/30 text-blue-400':
                    payStatus==='expired'?'bg-red-500/15 border-red-500/30 text-red-400':
                    'bg-amber-500/15 border-amber-500/30 text-amber-400'}`}>
                  {payStatus==='approved'?<CheckCircle2 size={16}/>:payStatus==='expired'?<AlertCircle size={16}/>:<Loader size={16} className="animate-spin"/>}
                  {payStatus==='approved'?'Payment Confirmed!':payStatus==='confirming'?'Confirming on blockchain...':payStatus==='expired'?'Payment Expired':'Waiting for your payment…'}
                  <RefreshCw size={13} className="ml-auto cursor-pointer opacity-50" onClick={()=>{}}/>
                </div>

                {/* QR */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-3xl shadow-[0_0_40px_rgba(0,217,181,0.2)]">
                    {qr?<img src={qr} alt="QR" className="w-44 h-44"/>:<div className="w-44 h-44 flex items-center justify-center"><RefreshCw size={24} className="text-gray-400 animate-spin"/></div>}
                  </div>
                </div>

                {/* Pay details */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Send Exactly</p>
                    <p className="text-white text-2xl font-bold">{payInfo.payAmount} <span className="text-primary text-base">{payInfo.payCurrency?.toUpperCase()}</span></p>
                  </div>
                  <div className="h-px bg-white/10"/>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white/40 text-xs uppercase tracking-wider">Payment Address</p>
                      <button onClick={()=>copy(payInfo.payAddress)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${copied?'bg-emerald-500/20 text-emerald-400':'bg-primary/20 text-primary'}`}>
                        {copied?<><CheckCircle2 size={11}/>Copied</>:<><Copy size={11}/>Copy</>}
                      </button>
                    </div>
                    <p className="text-white font-mono text-xs break-all leading-relaxed">{payInfo.payAddress}</p>
                  </div>
                </div>

                <div className="flex gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5"/>
                  <p className="text-amber-300/80 text-xs">Send <strong>exactly {payInfo.payAmount} {payInfo.payCurrency?.toUpperCase()}</strong> to avoid issues. Payment auto-confirms in 1–3 confirmations.</p>
                </div>

                <p className="text-white/30 text-center text-xs">Checking status automatically every 8 seconds…</p>
              </>
            ):(
              // Manual submit form
              <>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Deposit Address</p>
                    <button onClick={()=>copy(wallets[net])} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${copied?'bg-emerald-500/20 text-emerald-400':'bg-primary/20 text-primary'}`}>
                      {copied?<><CheckCircle2 size={11}/>Copied</>:<><Copy size={11}/>Copy</>}
                    </button>
                  </div>
                  {qr&&<div className="flex justify-center mb-3"><div className="p-3 bg-white rounded-xl"><img src={qr} alt="QR" className="w-36 h-36"/></div></div>}
                  <p className="text-white font-mono text-xs break-all">{wallets[net]||'Not configured — contact admin'}</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <label className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider mb-3">
                    <Hash size={12} className="text-primary"/> Transaction Hash
                  </label>
                  <input type="text" value={txHash} onChange={e=>setTxHash(e.target.value)}
                    placeholder="Paste blockchain TX hash here"
                    className="w-full bg-transparent text-white text-sm font-mono placeholder-white/20 focus:outline-none"/>
                  <div className="h-px bg-white/10 mt-2"/>
                  <p className="text-white/30 text-xs mt-1">Copy from your wallet app</p>
                </div>

                <button onClick={handleManualSubmit} disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-cyan-400 text-black font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting?<><Loader size={16} className="animate-spin"/>Submitting...</>:<><CheckCircle2 size={16}/>Submit Deposit</>}
                </button>
              </>
            )}
          </div>
        )}

        {/* History */}
        {history.length>0&&(
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Recent Deposits</p>
              <button onClick={fetchHistory}><RefreshCw size={13} className="text-primary"/></button>
            </div>
            <div className="space-y-2">
              {history.slice(0,5).map(d=>(
                <div key={d._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                      <Wallet size={13} className="text-white/50"/>
                    </div>
                    <div>
                      <p className="text-white text-xs font-semibold">{d.amount} USDT</p>
                      <p className="text-white/30 text-[10px]">{d.network} · {d.paymentMethod==='auto'?'Auto':'Manual'} · {new Date(d.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${stColor(d.status)}`}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Precautions */}
        <div className="p-4 rounded-2xl bg-white/3 border border-white/8">
          <div className="flex items-center gap-2 mb-3"><Info size={13} className="text-primary"/><span className="text-white/50 text-xs font-semibold uppercase tracking-wider">Important Notes</span></div>
          <ul className="space-y-1.5">
            {[`Min deposit: ${minDeposit} USDT`,'Only send USDT to the given address','Auto Pay confirms within 1–3 blockchain confirmations','Wrong network = permanent loss','Contact support if payment not received in 1 hour'].map((t,i)=>(
              <li key={i} className="flex items-start gap-2 text-white/40 text-xs"><span className="text-primary">•</span>{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <BottomNav/>
    </div>
  );
}
