import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, TrendingUp, CreditCard, Wallet, 
  Settings, Plus, MoreHorizontal, Trash2, 
  Edit3, ChevronLeft, ChevronRight, ChevronRight as ChevronRIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONFIG & UTILS ---
const STORAGE_KEY = 'flow_final_concept_v3';
const formatCurrency = (val) => new Intl.NumberFormat('ko-KR').format(val);

const REPAYMENT = {
  EQUAL: 'equal', // 원리금 균등
  BULLET: 'bullet' // 만기 일시
};

// --- CALCULATORS ---
const calculateEMI = (principal, annualRate, termMonths) => {
  if (!principal || !termMonths) return 0;
  const monthlyRate = (annualRate || 0) / 12 / 100;
  if (monthlyRate === 0) return Math.floor(principal / termMonths);
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.floor(emi);
};

const calculateInterestOnly = (principal, annualRate) => {
  if (!principal) return 0;
  const monthlyRate = (annualRate || 0) / 12 / 100;
  return Math.floor(principal * monthlyRate);
};

const calculateLoanBalance = (item, monthsPassed) => {
  const { principal, rate, term, repaymentMethod } = item;
  if (!principal || !term) return 0;
  if (monthsPassed <= 0) return principal;
  if (monthsPassed >= term) return 0;
  if (repaymentMethod === REPAYMENT.BULLET) return principal;

  const monthlyRate = (rate || 0) / 12 / 100;
  if (monthlyRate === 0) return Math.floor(principal - (principal / term) * monthsPassed);
  
  const balance = principal * (Math.pow(1 + monthlyRate, term) - Math.pow(1 + monthlyRate, monthsPassed)) / (Math.pow(1 + monthlyRate, term) - 1);
  return Math.floor(balance);
};

// --- INITIAL DATA ---
const INITIAL_DATA = {
  incomes: [
    { id: '1', source: '정기 급여', amount: 4850000, day: 25, provider: '신한은행', logoUrl: '/assets/income_bag.png', year: 2026, month: 4 },
    { id: '2', source: '부업 수익', amount: 500000, day: 10, provider: '카카오뱅크', logoUrl: 'https://img.icons8.com/color/96/kakaobank.png', year: 2026, month: 4 }
  ],
  expenses: [
    { id: 'e1', name: 'SKT 통신비', amount: 65000, day: 15, provider: '현대카드', logoUrl: '/assets/wallet_wings.png', year: 2026, month: 4 },
    { id: 'e2', name: '유튜브 프리미엄', amount: 14900, day: 5, provider: '삼성카드', logoUrl: 'https://img.icons8.com/color/96/youtube-play.png', year: 2026, month: 4 }
  ],
  loans: [
    { id: 'l1', product: '청년 전세자금 대출', principal: 150000000, rate: 3.5, term: 120, startDate: '2024-04-01', repaymentMethod: REPAYMENT.EQUAL, monthlyPayment: 1483333, balance: 110000000, day: 1, provider: '신한은행', logoUrl: '/assets/money_stack.png', year: 2026, month: 4 }
  ]
};

const ASSETS = {
  LOGO_BLUE_DOT: 'var(--toss-blue)',
  ICON_INCOME: '/assets/income_bag.png',   
  ICON_EXPENSE: '/assets/wallet_wings.png', 
  ICON_LOAN: '/assets/money_stack.png'    
};

// --- COMPONENTS ---

function DateNavigator({ year, month, onPrev, onNext, isYearly = false }) {
  return (
    <div className="card-date-nav">
      <button className="nav-btn" onClick={onPrev}><ChevronLeft size={20} /></button>
      <span className="current-view-text">{year}년 {isYearly ? '' : `${month}월`}</span>
      <button className="nav-btn" onClick={onNext}><ChevronRight size={20} /></button>
    </div>
  );
}

function NavItem({ label, Icon, active, onClick }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={24} />
      <span>{label}</span>
    </button>
  );
}

function HomeSummaryRow({ icon, label, amount, color, subText, onClick }) {
  return (
    <div className="summary-row" onClick={onClick}>
      <div className="summary-icon-box">
        <img src={icon} alt="" className="summary-icon-img" />
      </div>
      <div className="summary-content">
        <span className="summary-label">{label}</span>
        <span className="summary-amount" style={{ color }}>₩{formatCurrency(amount)}</span>
        {subText && <span className="summary-subtext">{subText}</span>}
      </div>
      <div className="chevron-box">
        <ChevronRIcon size={20} />
      </div>
    </div>
  );
}

function ActionMenu({ onEdit, onDelete, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const fn = (e) => { if(ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="action-menu" ref={ref}>
      <div className="menu-item" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit3 size={16} /> 수정</div>
      <div className="menu-item menu-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 size={16} /> 삭제</div>
    </motion.div>
  );
}

function HomeView({ viewDate, totals, yearlyTotals, navigateMonth, navigateYear, onNavigate, onCopy }) {
  return (
    <div className="home-view">
      <div className="toss-card" style={{ paddingBottom: '16px' }}>
        <div className="home-card-header">
          <DateNavigator 
            year={viewDate.year} 
            month={viewDate.month} 
            onPrev={() => navigateMonth(-1)} 
            onNext={() => navigateMonth(1)} 
          />
          <button className="btn-clone-text" onClick={onCopy}>이전 달 가져오기</button>
        </div>
        <HomeSummaryRow icon={ASSETS.ICON_INCOME} label="이번 달 총 수입" amount={totals.income} color="var(--toss-blue)" onClick={() => onNavigate('incomes')} />
        <HomeSummaryRow icon={ASSETS.ICON_EXPENSE} label="이번 달 총 지출" amount={totals.expense} color="var(--toss-text-main)" onClick={() => onNavigate('expenses')} />
        <HomeSummaryRow icon={ASSETS.ICON_LOAN} label="이번 달 대출 납입" amount={totals.loanMonthly} color="var(--toss-orange)" subText={`전체 잔액 ₩${formatCurrency(totals.loanBalance)}`} onClick={() => onNavigate('loans')} />
      </div>

      <div className="toss-card yearly-summary-section">
        <DateNavigator year={viewDate.year} isYearly onPrev={() => navigateYear(-1)} onNext={() => navigateYear(1)} />
        <div className="yearly-stats-container">
          <div className="yearly-stat-row"><span className="stat-label">연간 총 수입</span><span className="stat-amount" style={{ color: 'var(--toss-blue)' }}>₩{formatCurrency(yearlyTotals.income)}</span></div>
          <div className="yearly-stat-row"><span className="stat-label">연간 총 지출</span><span className="stat-amount" style={{ color: 'var(--toss-text-main)' }}>₩{formatCurrency(yearlyTotals.expense)}</span></div>
          <div className="yearly-stat-row"><span className="stat-label">연간 대출 상환</span><span className="stat-amount" style={{ color: 'var(--toss-orange)' }}>₩{formatCurrency(yearlyTotals.loan)}</span></div>
        </div>
      </div>
    </div>
  );
}

function DetailTab({ title, items, viewDate, navigateMonth, onAdd, onEdit, onDelete, activeMenuId, setActiveMenuId, isLoan }) {
  const filteredItems = useMemo(() => items.filter(i => (!i.year || !i.month) || (i.year === viewDate.year && i.month === viewDate.month)), [items, viewDate]);
  
  return (
    <div className="toss-card detail-card">
      <div className="card-header-v2">
        <div className="card-title">{title}</div>
        <DateNavigator className="card-date-nav" year={viewDate.year} month={viewDate.month} onPrev={() => navigateMonth(-1)} onNext={() => navigateMonth(1)} />
        <button className="btn-add-icon" onClick={onAdd}><Plus size={26} /></button>
      </div>

      <div className="item-list">
        {filteredItems.map(item => (
          <div key={item.id} className="item-row" style={{ alignItems: 'flex-start' }}>
            <div className="logo-box" style={{ marginTop: '4px' }}>
              {item.logoUrl ? <img src={item.logoUrl} alt="" className="item-logo-img" crossOrigin="anonymous" /> : <div className="logo-placeholder">{(item.source || item.name || item.product || '?').charAt(0)}</div>}
            </div>
            <div className="item-content">
              <div className="item-title">{item.source || item.name || item.product}</div>
              <div className="item-desc" style={{ color: 'var(--toss-text-sub)', opacity: 0.7, fontSize: '12px', marginTop: '2px' }}>{item.day}일 | {item.provider}</div>
              {isLoan && item.principal > 0 && (() => {
                const [startY, startM] = (item.startDate || "2000-01-01").split('-').map(Number);
                const monthsPassed = (viewDate.year * 12 + viewDate.month) - (startY * 12 + (startM || 1));
                const currentBalance = calculateLoanBalance(item, Math.max(0, monthsPassed));
                const progress = item.principal ? Math.min(100, Math.round(((item.principal - currentBalance) / item.principal) * 100)) : 0;
                return (
                  <div className="loan-progress-container">
                    <div className="progress-info">
                      <span>{item.repaymentMethod === REPAYMENT.BULLET ? '만기일시' : '원리금균등'} 상환 중</span>
                      <span className="progress-percent">{progress}%</span>
                    </div>
                    <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${progress}%` }}></div></div>
                    <div className="progress-info" style={{ marginTop: '2px', opacity: 0.6 }}><span>잔액: ₩{formatCurrency(currentBalance)}</span></div>
                  </div>
                );
              })()}
            </div>
            <div className="item-amount" style={{ color: (item.amount > 0 || (item.monthlyPayment > 0 || item.principal > 0)) ? (title === '수입' ? 'var(--toss-blue)' : 'var(--toss-text-main)') : 'var(--toss-text-main)', marginTop: '4px' }}>
              ₩{formatCurrency(
                item.amount || (
                  isLoan 
                    ? (item.repaymentMethod === REPAYMENT.BULLET ? calculateInterestOnly(item.principal, item.rate) : calculateEMI(item.principal, item.rate, item.term))
                    : item.monthlyPayment
                )
              )}
            </div>
            <button className="btn-more" style={{ marginTop: '0px' }} onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}><MoreHorizontal size={20} /></button>
            <AnimatePresence>{activeMenuId === item.id && <ActionMenu onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} onClose={() => setActiveMenuId(null)} />}</AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModalUI({ modal, onSave, setModal }) {
  const [f, setF] = useState({ ...modal.item });
  const [amtStr, setAmtStr] = useState(formatCurrency(modal.item.amount || 0));
  const [pStr, setPStr] = useState(formatCurrency(modal.item.principal || 0));
  const isLoan = modal.sector === 'loans';

  const handleAmt = (v) => {
    const n = parseInt(v.replace(/[^0-9]/g, '')) || 0;
    setAmtStr(n > 0 ? formatCurrency(n) : '');
    setF({ ...f, amount: n });
  };
  const handleP = (v) => {
    const n = parseInt(v.replace(/[^0-9]/g, '')) || 0;
    setPStr(n > 0 ? formatCurrency(n) : '');
    setF({ ...f, principal: n });
  };

  return (
    <div className="modal-backdrop" onClick={() => setModal({ type: null })}>
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="modal-box" style={{ maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem 2rem' }} onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{modal.type === 'add' ? '내역 추가' : '수정하기'}</h3>
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label className="form-label">{isLoan ? '대출 상품명' : '항목명'}</label>
          <div className="toss-input-container"><input className="toss-input" value={f.source || f.name || f.product || ''} onChange={e => setF({...f, [isLoan ? 'product' : (modal.sector === 'incomes' ? 'source' : 'name')]: e.target.value})} placeholder="어디서 발생했나요?" autoFocus /></div>
        </div>
        {!isLoan ? (
          <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">금액</label><div className="toss-input-container"><input className="toss-input" value={amtStr} onChange={e => handleAmt(e.target.value)} placeholder="0" /></div></div>
        ) : (
          <>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">총 대출 원금</label><div className="toss-input-container"><input className="toss-input" value={pStr} onChange={e => handleP(e.target.value)} placeholder="0" /></div></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">연 이율 (%)</label><div className="toss-input-container"><input className="toss-input" type="number" step="0.1" value={f.rate || ''} onChange={e => setF({...f, rate: parseFloat(e.target.value) || 0})} /></div></div>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">기간 (개월)</label><div className="toss-input-container"><input className="toss-input" type="number" value={f.term || ''} onChange={e => setF({...f, term: parseInt(e.target.value) || 12})} /></div></div>
            </div>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label className="form-label">상환 방식</label>
              <div className="repayment-selector">
                <div className={`repayment-option ${f.repaymentMethod === REPAYMENT.EQUAL ? 'active' : ''}`} onClick={() => setF({...f, repaymentMethod: REPAYMENT.EQUAL})}>원리금 균등</div>
                <div className={`repayment-option ${f.repaymentMethod === REPAYMENT.BULLET ? 'active' : ''}`} onClick={() => setF({...f, repaymentMethod: REPAYMENT.BULLET})}>만기 일시</div>
              </div>
            </div>
            <div className="preview-box">
              <span className="preview-label">예상 월 납입금</span>
              <div className="preview-value">₩{formatCurrency(f.repaymentMethod === REPAYMENT.BULLET ? calculateInterestOnly(f.principal, f.rate) : calculateEMI(f.principal, f.rate, f.term))} <span style={{ fontSize: '12px', color: 'var(--toss-text-sub)' }}>{f.repaymentMethod === REPAYMENT.BULLET ? '(이자만)' : '(원금+이자)'}</span></div>
              <div className="mini-chart">{Array.from({ length: 20 }).map((_, i) => <div key={i} className={`chart-bar ${f.repaymentMethod === REPAYMENT.BULLET && 'interest'}`} style={{ height: `${20 + Math.random() * 5 + (i * (f.repaymentMethod === REPAYMENT.EQUAL ? 1 : 0.4))}%` }} />)}</div>
            </div>
            <div className="form-group" style={{ marginBottom: '1.2rem', marginTop: '1.2rem' }}><label className="form-label">시작 날짜</label><div className="toss-input-container"><input className="toss-input" type="date" value={f.startDate || ''} onChange={e => setF({...f, startDate: e.target.value})} /></div></div>
          </>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">날짜 (일)</label><div className="toss-input-container"><input className="toss-input" type="number" value={f.day || ''} onChange={e => setF({...f, day: parseInt(e.target.value) || 1})} /></div></div>
          <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">금융기관/카드</label><div className="toss-input-container"><input className="toss-input" value={f.provider || ''} onChange={e => setF({...f, provider: e.target.value})} /></div></div>
        </div>
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label className="form-label">아이콘 URL (선택)</label>
          <div className="toss-input-container"><input className="toss-input" value={f.logoUrl || ''} onChange={e => setF({...f, logoUrl: e.target.value})} placeholder="https://... 또는 /assets/..." /></div>
        </div>
        <div className="btn-group">
          <button className="btn-base btn-grey" onClick={() => setModal({ type: null })}>취소</button>
          <button className="btn-base btn-blue" onClick={() => onSave(f)}>저장</button>
        </div>
      </motion.div>
    </div>
  );
}

function SettingsModal({ data, setData, onClose }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `flow_backup.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importData = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const p = JSON.parse(ev.target.result);
          if (p.incomes && p.expenses && p.loans) { setData(p); alert('복구 완료'); onClose(); }
        } catch (err) { alert('오류 발생'); }
      };
      reader.readAsText(file);
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">설정</h3>
        <div className="form-group" style={{ marginBottom: '1rem' }}><button className="btn-base btn-grey" style={{ width: '100%' }} onClick={exportData}>데이터 다운로드</button></div>
        <div className="form-group" style={{ marginBottom: '1rem' }}><label className="btn-base btn-blue" style={{ width: '100%', cursor: 'pointer', textAlign: 'center', display: 'block' }}>데이터 복구 <input type="file" hidden accept=".json" onChange={importData} /></label></div>
        <button className="btn-base btn-grey" onClick={onClose} style={{ width: '100%', background: 'transparent' }}>닫기</button>
      </motion.div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---

export default function App() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return INITIAL_DATA;
      const parsed = JSON.parse(saved);
      return (parsed.incomes && parsed.expenses && parsed.loans) ? parsed : INITIAL_DATA;
    } catch (e) { return INITIAL_DATA; }
  });

  const [viewDate, setViewDate] = useState({ year: 2026, month: 4 });
  const [activeTab, setActiveTab] = useState('home');
  const [modal, setModal] = useState({ type: null, sector: null, item: null });
  const [clonePrompt, setClonePrompt] = useState({ isOpen: false, target: null, source: null });
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);

  const navigateMonth = (step) => {
    let nm = viewDate.month + step, ny = viewDate.year;
    if (nm > 12) { nm = 1; ny++; } else if (nm < 1) { nm = 12; ny--; }
    const nextDate = { year: ny, month: nm };
    const exists = (data.incomes.some(i => i.year === ny && i.month === nm) || data.expenses.some(i => i.year === ny && i.month === nm) || data.loans.some(i => i.year === ny && i.month === nm));
    if (!exists) setClonePrompt({ isOpen: true, target: nextDate, source: { ...viewDate } });
    setViewDate(nextDate);
  };

  const executeClone = () => {
    const { target, source } = clonePrompt;
    setData(prev => {
      const clone = (list) => list.filter(i => i.year === source.year && i.month === source.month).map(i => ({ ...i, id: Date.now() + Math.random().toString(), year: target.year, month: target.month }));
      return { incomes: [...prev.incomes, ...clone(prev.incomes)], expenses: [...prev.expenses, ...clone(prev.expenses)], loans: [...prev.loans, ...clone(prev.loans)] };
    });
    setClonePrompt({ isOpen: false, target: null, source: null });
  };

  const manualCopyPrevious = () => {
    let pm = viewDate.month - 1, py = viewDate.year;
    if (pm < 1) { pm = 12; py--; }
    const exists = (data.incomes.some(i => i.year === viewDate.year && i.month === viewDate.month) || data.expenses.some(i => i.year === viewDate.year && i.month === viewDate.month) || data.loans.some(i => i.year === viewDate.year && i.month === viewDate.month));
    if (exists && !window.confirm("현재 달에 이미 데이터가 있습니다. 덮어쓸까요?")) return;
    const target = { year: viewDate.year, month: viewDate.month }, source = { year: py, month: pm };
    setData(prev => {
      const clone = (list) => list.filter(i => i.year === source.year && i.month === source.month).map(i => ({ ...i, id: Date.now() + Math.random().toString(), year: target.year, month: target.month }));
      return { incomes: [...prev.incomes, ...clone(prev.incomes)], expenses: [...prev.expenses, ...clone(prev.expenses)], loans: [...prev.loans, ...clone(prev.loans)] };
    });
    alert("복사 완료");
  };

  const totals = useMemo(() => {
    const cur = { incomes: data.incomes.filter(i => i.year === viewDate.year && i.month === viewDate.month), expenses: data.expenses.filter(i => i.year === viewDate.year && i.month === viewDate.month), loans: data.loans.filter(i => i.year === viewDate.year && i.month === viewDate.month) };
    const inc = cur.incomes.reduce((a,c) => a + c.amount, 0), exp = cur.expenses.reduce((a,c) => a + c.amount, 0);
    const loan = cur.loans.reduce((acc, i) => {
      const [sY, sM] = (i.startDate || "2000-01-01").split('-').map(Number);
      const passed = (viewDate.year * 12 + viewDate.month) - (sY * 12 + (sM || 1));
      const bal = calculateLoanBalance(i, Math.max(0, passed));
      const mon = i.repaymentMethod === REPAYMENT.BULLET ? (passed === i.term - 1 ? i.principal + calculateInterestOnly(i.principal, i.rate) : calculateInterestOnly(i.principal, i.rate)) : calculateEMI(i.principal, i.rate, i.term);
      return { monthly: acc.monthly + mon, balance: acc.balance + bal };
    }, { monthly: 0, balance: 0 });
    return { income: inc, expense: exp, loanMonthly: loan.monthly, loanBalance: loan.balance };
  }, [data, viewDate]);

  const yearlyTotals = useMemo(() => {
    const today = new Date(), tY = today.getFullYear(), tM = today.getMonth() + 1;
    let limitM = viewDate.year === tY ? tM : (viewDate.year < tY ? 12 : 0);
    const incSum = data.incomes.filter(i => i.year === viewDate.year && i.month <= limitM).reduce((a,c) => a + c.amount, 0);
    const expSum = data.expenses.filter(i => i.year === viewDate.year && i.month <= limitM).reduce((a,c) => a + c.amount, 0);
    let loanSum = 0;
    for (let m = 1; m <= limitM; m++) {
      data.loans.filter(l => l.year === viewDate.year && l.month === m).forEach(l => {
        loanSum += l.repaymentMethod === REPAYMENT.BULLET ? calculateInterestOnly(l.principal, l.rate) : calculateEMI(l.principal, l.rate, l.term);
      });
    }
    return { income: incSum, expense: expSum, loan: loanSum };
  }, [data, viewDate.year]);

  return (
    <div className="app-layout">
      <header className="main-header"><div className="header-inner"><div className="brand-logo" onClick={() => setActiveTab('home')}><img src="/assets/logo.png" alt="FLOW" style={{ height: '24px', display: 'block' }} /></div><button className="settings-pill" onClick={() => setIsSettingsOpen(true)}><Settings size={18} /> 설정</button></div></header>
      <div className="app-container">
        <main style={{ paddingBottom: '40px' }}>
          {activeTab === 'home' && <HomeView viewDate={viewDate} totals={totals} yearlyTotals={yearlyTotals} navigateMonth={navigateMonth} navigateYear={e => setViewDate({...viewDate, year: viewDate.year + e})} onNavigate={setActiveTab} onCopy={manualCopyPrevious} />}
          {activeTab === 'incomes' && <DetailTab title="수입" items={data.incomes} viewDate={viewDate} navigateMonth={navigateMonth} onAdd={() => setModal({ type: 'add', sector: 'incomes', item: { amount: 0, day: 1 } })} onEdit={i => setModal({ type: 'edit', sector: 'incomes', item: i })} onDelete={i => setModal({ type: 'delete_confirm', sector: 'incomes', item: i })} activeMenuId={activeMenuId} setActiveMenuId={setActiveMenuId} />}
          {activeTab === 'expenses' && <DetailTab title="지출" items={data.expenses} viewDate={viewDate} navigateMonth={navigateMonth} onAdd={() => setModal({ type: 'add', sector: 'expenses', item: { amount: 0, day: 1 } })} onEdit={i => setModal({ type: 'edit', sector: 'expenses', item: i })} onDelete={i => setModal({ type: 'delete_confirm', sector: 'expenses', item: i })} activeMenuId={activeMenuId} setActiveMenuId={setActiveMenuId} />}
          {activeTab === 'loans' && <DetailTab title="대출" items={data.loans} isLoan viewDate={viewDate} navigateMonth={navigateMonth} onAdd={() => setModal({ type: 'add', sector: 'loans', item: { principal: 0, rate: 0, term: 12, repaymentMethod: REPAYMENT.EQUAL } })} onEdit={i => setModal({ type: 'edit', sector: 'loans', item: i })} onDelete={i => setModal({ type: 'delete_confirm', sector: 'loans', item: i })} activeMenuId={activeMenuId} setActiveMenuId={setActiveMenuId} />}
        </main>
      </div>
      <nav className="bottom-nav">
        <NavItem label="홈" Icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem label="수입" Icon={TrendingUp} active={activeTab === 'incomes'} onClick={() => setActiveTab('incomes')} />
        <NavItem label="지출" Icon={CreditCard} active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
        <NavItem label="대출" Icon={Wallet} active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} />
      </nav>
      <AnimatePresence>
        {(modal.type === 'add' || modal.type === 'edit') && <ModalUI modal={modal} setModal={setModal} onSave={i => { setData(prev => { let list = [...prev[modal.sector]]; if(modal.type==='edit') list=list.map(x=>x.id===i.id?i:x); else list.push({...i, id: Date.now().toString(), year: viewDate.year, month: viewDate.month}); return {...prev, [modal.sector]: list}; }); setModal({type:null}); }} />}
        {modal.type === 'delete_confirm' && <div className="modal-backdrop" onClick={() => setModal({type:null})}><motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} className="modal-box"><h3 style={{textAlign:'center',marginBottom:24,fontWeight:800}}>삭제하시겠습니까?</h3><div className="btn-group"><button className="btn-base btn-grey" onClick={()=>setModal({type:null})}>취소</button><button className="btn-base btn-red" onClick={()=>{setData(prev=>({...prev,[modal.sector]:prev[modal.sector].filter(x=>x.id!==modal.item.id)}));setModal({type:null});}}>삭제</button></div></motion.div></div>}
        {isSettingsOpen && <SettingsModal data={data} setData={setData} onClose={()=>setIsSettingsOpen(false)} />}
        {clonePrompt.isOpen && <div className="modal-backdrop" onClick={()=>setClonePrompt({...clonePrompt,isOpen:false})}><motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} className="modal-box"><h3 style={{textAlign:'center',marginBottom:16,fontWeight:800}}>데이터가 없습니다</h3><p style={{textAlign:'center',marginBottom:24,fontSize:'14px'}}>지난달 내역을 가져올까요?</p><div className="btn-group"><button className="btn-base btn-grey" onClick={()=>setClonePrompt({...clonePrompt,isOpen:false})}>아니오</button><button className="btn-base btn-blue" onClick={executeClone}>가져오기</button></div></motion.div></div>}
      </AnimatePresence>
    </div>
  );
}
