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

// 원리금 균등 상환 계산기
const calculateEMI = (principal, annualRate, termMonths) => {
  if (!principal || !annualRate || !termMonths) return 0;
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return Math.round(principal / termMonths);
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(emi);
};

// 상환 잔액 계산기
const calculateLoanBalance = (principal, annualRate, termMonths, monthsPassed) => {
  if (!principal || !annualRate || !termMonths) return 0;
  if (monthsPassed >= termMonths) return 0;
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return Math.round(principal - (principal / termMonths) * monthsPassed);
  const balance = principal * (Math.pow(1 + monthlyRate, termMonths) - Math.pow(1 + monthlyRate, monthsPassed)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(balance);
};

// --- ASSET PATHS ---
const ASSETS = {
  LOGO_BLUE_DOT: 'var(--toss-blue)',
  ICON_INCOME: '/assets/income_bag.png',   
  ICON_EXPENSE: '/assets/wallet_wings.png', 
  ICON_LOAN: '/assets/money_stack.png'    
};

// --- MAIN APP ---
export default function App() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  const [viewDate, setViewDate] = useState({ year: 2026, month: 4 });
  const [activeTab, setActiveTab] = useState('home');
  const [modal, setModal] = useState({ type: null, sector: null, item: null });
  const [clonePrompt, setClonePrompt] = useState({ isOpen: false, target: null, source: null });
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);

  const navigateMonth = (step) => {
    let nm = viewDate.month + step;
    let ny = viewDate.year;
    if (nm > 12) { nm = 1; ny++; } else if (nm < 1) { nm = 12; ny--; }
    
    const nextDate = { year: ny, month: nm };
    const nextMonthDataExists = (data.incomes.some(i => i.year === ny && i.month === nm) || 
                                 data.expenses.some(i => i.year === ny && i.month === nm) || 
                                 data.loans.some(i => i.year === ny && i.month === nm));

    if (!nextMonthDataExists) {
      setClonePrompt({ isOpen: true, target: nextDate, source: { ...viewDate } });
    }
    
    setViewDate(nextDate);
  };

  const executeClone = () => {
    const { target, source } = clonePrompt;
    setData(prev => {
      const cloneList = (list) => list
        .filter(item => item.year === source.year && item.month === source.month)
        .map(item => ({ ...item, id: Date.now() + Math.random().toString(), year: target.year, month: target.month }));
      
      return {
        incomes: [...prev.incomes, ...cloneList(prev.incomes)],
        expenses: [...prev.expenses, ...cloneList(prev.expenses)],
        loans: [...prev.loans, ...cloneList(prev.loans)]
      };
    });
    setClonePrompt({ isOpen: false, target: null, source: null });
  };

  const navigateYear = (step) => {
    setViewDate({ ...viewDate, year: viewDate.year + step });
  };

  const currentMonthData = useMemo(() => {
    const filterFn = (items) => items.filter(i => i.year === viewDate.year && i.month === viewDate.month);
    return {
      incomes: filterFn(data.incomes),
      expenses: filterFn(data.expenses),
      loans: filterFn(data.loans)
    };
  }, [data, viewDate]);

  const totals = useMemo(() => {
    const inc = currentMonthData.incomes.reduce((a,c) => a + c.amount, 0);
    const exp = currentMonthData.expenses.reduce((a,c) => a + c.amount, 0);
    
    // Calculate REAL monthly payment and REAL balance for current viewDate
    const loanSummary = currentMonthData.loans.reduce((acc, item) => {
      const [startY, startM] = (item.startDate || "2000-01-01").split('-').map(Number);
      const monthsPassed = (viewDate.year * 12 + viewDate.month) - (startY * 12 + (startM || 1));
      const safeMonthsPassed = Math.max(0, monthsPassed);
      
      const balance = calculateLoanBalance(item.principal, item.rate, item.term, safeMonthsPassed);
      const monthly = calculateEMI(item.principal, item.rate, item.term);
      
      return { monthly: acc.monthly + monthly, balance: acc.balance + balance };
    }, { monthly: 0, balance: 0 });

    return {
      income: inc,
      expense: exp,
      loanMonthly: loanSummary.monthly,
      loanBalance: loanSummary.balance
    };
  }, [currentMonthData, viewDate]);

  const yearlyTotals = useMemo(() => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1; // 1-indexed

    // Limit summation month: 
    // If viewing the current year, stop at today's month.
    // If viewing a past year, show full year (12).
    // If viewing a future year, show 0.
    let limitMonth = 0;
    if (viewDate.year === todayYear) limitMonth = todayMonth;
    else if (viewDate.year < todayYear) limitMonth = 12;
    
    const yearlyFilter = (items) => items.filter(i => i.year === viewDate.year && i.month <= limitMonth);
    const yIncomes = yearlyFilter(data.incomes);
    const yExpenses = yearlyFilter(data.expenses);
    const yLoans = yearlyFilter(data.loans);
    
    const incSum = yIncomes.reduce((a,c) => a + c.amount, 0);
    const expSum = yExpenses.reduce((a,c) => a + c.amount, 0);
    
    // Sum EMIs for each month up to limitMonth
    let loanPaySum = 0;
    for (let m = 1; m <= limitMonth; m++) {
      const loansInMonth = data.loans.filter(l => l.year === viewDate.year && l.month === m);
      loansInMonth.forEach(l => {
        loanPaySum += calculateEMI(l.principal, l.rate, l.term);
      });
    }
    
    return {
      income: incSum,
      expense: expSum,
      loan: loanPaySum
    };
  }, [data, viewDate.year]); // Only depend on year, not viewDate.month

  const saveAction = (item) => {
    const isEdit = modal.type === 'edit';
    setData(prev => {
      let list = [...prev[modal.sector]];
      if (isEdit) list = list.map(i => i.id === item.id ? item : i);
      else list.push({ ...item, id: Date.now().toString(), year: viewDate.year, month: viewDate.month });
      return { ...prev, [modal.sector]: list };
    });
    setModal({ type: null });
  };

  return (
    <div className="app-layout">
      <header className="main-header">
        <div className="header-inner">
          <div className="brand-logo" onClick={() => setActiveTab('home')}>
            FLOW<span className="brand-dot">.</span>
          </div>
          <button className="settings-pill" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={18} /> 설정
          </button>
        </div>
      </header>

      <div className="app-container">
        <main style={{ paddingBottom: '40px' }}>
          {activeTab === 'home' && (
            <HomeView 
              viewDate={viewDate} 
              totals={totals} 
              yearlyTotals={yearlyTotals}
              navigateMonth={navigateMonth} 
              navigateYear={navigateYear}
              onNavigate={setActiveTab} 
            />
          )}
          {activeTab === 'incomes' && <DetailTab title="수입" sector="incomes" color="var(--toss-blue)" items={currentMonthData.incomes} 
            viewDate={viewDate} navigateMonth={navigateMonth}
            onAdd={() => setModal({ type: 'add', sector: 'incomes', item: { source: '', amount: 0, day: 1, provider: '', logoUrl: '' } })} 
            onEdit={(i) => setModal({ type: 'edit', sector: 'incomes', item: i })} 
            onDelete={(i) => setModal({ type: 'delete_confirm', sector: 'incomes', item: i })} 
            activeMenuId={activeMenuId} setActiveMenuId={setActiveMenuId} />}
          {activeTab === 'expenses' && <DetailTab title="지출" sector="expenses" color="var(--toss-text-main)" items={currentMonthData.expenses} 
            viewDate={viewDate} navigateMonth={navigateMonth}
            onAdd={() => setModal({ type: 'add', sector: 'expenses', item: { name: '', amount: 0, day: 1, provider: '', logoUrl: '' } })} 
            onEdit={(i) => setModal({ type: 'edit', sector: 'expenses', item: i })} 
            onDelete={(i) => setModal({ type: 'delete_confirm', sector: 'expenses', item: i })} 
            activeMenuId={activeMenuId} setActiveMenuId={setActiveMenuId} />}
          {activeTab === 'loans' && <DetailTab title="대출" sector="loans" color="var(--toss-orange)" items={currentMonthData.loans} isLoan
            viewDate={viewDate} navigateMonth={navigateMonth}
            onAdd={() => setModal({ type: 'add', sector: 'loans', item: { product: '', principal: 0, rate: 0, term: 12, startDate: '', day: 1, provider: '', logoUrl: '' } })} 
            onEdit={(i) => setModal({ type: 'edit', sector: 'loans', item: i })} 
            onDelete={(i) => setModal({ type: 'delete_confirm', sector: 'loans', item: i })} 
            activeMenuId={activeMenuId} setActiveMenuId={setActiveMenuId} />}
        </main>
      </div>

      <nav className="bottom-nav">
        <NavItem label="홈" Icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem label="수입" Icon={TrendingUp} active={activeTab === 'incomes'} onClick={() => setActiveTab('incomes')} />
        <NavItem label="지출" Icon={CreditCard} active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
        <NavItem label="대출" Icon={Wallet} active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} />
      </nav>

      <AnimatePresence>
        {(modal.type === 'add' || modal.type === 'edit') && <ModalUI modal={modal} setModal={setModal} onSave={saveAction} />}
        {modal.type === 'delete_confirm' && (
          <div className="modal-backdrop" onClick={() => setModal({ type: null })}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 style={{ textAlign: 'center', marginBottom: 24, fontWeight: 800 }}>내역을 삭제하시겠습니까?</h3>
              <div className="btn-group">
                <button className="btn-base btn-grey" onClick={() => setModal({ type: null })}>취소</button>
                <button className="btn-base btn-red" onClick={() => {
                  setData(prev => ({ ...prev, [modal.sector]: prev[modal.sector].filter(i => i.id !== modal.item.id) }));
                  setModal({ type: null });
                }}>삭제</button>
              </div>
            </motion.div>
          </div>
        )}
        {isSettingsOpen && <SettingsModal data={data} setData={setData} onClose={() => setIsSettingsOpen(false)} />}
        
        {clonePrompt.isOpen && (
          <div className="modal-backdrop" onClick={() => setClonePrompt({ ...clonePrompt, isOpen: false })}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 style={{ textAlign: 'center', marginBottom: 16, fontWeight: 800 }}>{clonePrompt.target.year}년 {clonePrompt.target.month}월 데이터가 없습니다</h3>
              <p style={{ textAlign: 'center', marginBottom: 24, fontSize: '14px', color: 'var(--toss-text-sub)' }}>{clonePrompt.source.month}월 내역을 자동으로 복사해올까요?</p>
              <div className="btn-group">
                <button className="btn-base btn-grey" onClick={() => setClonePrompt({ ...clonePrompt, isOpen: false })}>아니오</button>
                <button className="btn-base btn-blue" onClick={executeClone}>복사하기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB-VIEWS ---

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

function HomeView({ viewDate, totals, yearlyTotals, navigateMonth, navigateYear, onNavigate }) {
  return (
    <div className="home-view">
      <div className="toss-card">
        <DateNavigator 
          year={viewDate.year} 
          month={viewDate.month} 
          onPrev={() => navigateMonth(-1)} 
          onNext={() => navigateMonth(1)} 
        />

        <HomeSummaryRow 
          icon={ASSETS.ICON_INCOME} 
          label="이번 달 총 수입" 
          amount={totals.income} 
          color="var(--toss-blue)" 
          onClick={() => onNavigate('incomes')} 
        />
        <HomeSummaryRow 
          icon={ASSETS.ICON_EXPENSE} 
          label="이번 달 총 지출" 
          amount={totals.expense} 
          color="var(--toss-text-main)" 
          onClick={() => onNavigate('expenses')} 
        />
        <HomeSummaryRow 
          icon={ASSETS.ICON_LOAN} 
          label="이번 달 대출 납입" 
          amount={totals.loanMonthly} 
          color="var(--toss-orange)" 
          subText={`전체 잔액 ₩${formatCurrency(totals.loanBalance)}`}
          onClick={() => onNavigate('loans')} 
        />
      </div>

      <div className="toss-card yearly-summary-section">
        <DateNavigator 
          year={viewDate.year} 
          isYearly
          onPrev={() => navigateYear(-1)} 
          onNext={() => navigateYear(1)} 
        />
        <div className="yearly-stats-container">
          <div className="yearly-stat-row">
            <span className="stat-label">연간 총 수입</span>
            <span className="stat-amount" style={{ color: 'var(--toss-blue)' }}>₩{formatCurrency(yearlyTotals.income)}</span>
          </div>
          <div className="yearly-stat-row">
            <span className="stat-label">연간 총 지출</span>
            <span className="stat-amount" style={{ color: 'var(--toss-text-main)' }}>₩{formatCurrency(yearlyTotals.expense)}</span>
          </div>
          <div className="yearly-stat-row">
            <span className="stat-label">연간 대출 상환</span>
            <span className="stat-amount" style={{ color: 'var(--toss-orange)' }}>₩{formatCurrency(yearlyTotals.loan)}</span>
          </div>
        </div>
      </div>
    </div>
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

function DetailTab({ title, items, viewDate, navigateMonth, onAdd, onEdit, onDelete, activeMenuId, setActiveMenuId, isLoan }) {
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // If item has no year/month, it's considered recurring (show always)
      if (!item.year || !item.month) return true;
      return item.year === viewDate.year && item.month === viewDate.month;
    });
  }, [items, viewDate]);

  return (
    <div className="toss-card detail-card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <button className="btn-add-icon" onClick={onAdd}><Plus size={26} /></button>
      </div>

      <DateNavigator 
        year={viewDate.year} 
        month={viewDate.month} 
        onPrev={() => navigateMonth(-1)} 
        onNext={() => navigateMonth(1)} 
      />

      <div className="item-list">
        {filteredItems.map(item => {
          const hasPrincipal = !!item.principal;
          
          return (
            <div key={item.id} className="item-row" style={{ alignItems: 'flex-start', paddingBottom: isLoan ? '24px' : '1.2rem' }}>
              <div className="logo-box" style={{ marginTop: '4px' }}>
                {item.logoUrl ? (
                  <img src={item.logoUrl} alt="" className="item-logo-img" crossOrigin="anonymous" />
                ) : (
                  <div className="logo-placeholder">{(item.source || item.name || item.product).charAt(0)}</div>
                )}
              </div>
              <div className="item-content">
                <div className="item-title">{item.source || item.name || item.product}</div>
                <div className="item-desc" style={{ color: 'var(--toss-text-sub)', opacity: 0.7, fontSize: '12px', marginTop: '2px' }}>{item.day}일 | {item.provider}</div>
                
                {isLoan && hasPrincipal && (() => {
                  const [startY, startM] = (item.startDate || "2000-01-01").split('-').map(Number);
                  const monthsPassed = (viewDate.year * 12 + viewDate.month) - (startY * 12 + (startM || 1));
                  const safeMonthsPassed = Math.max(0, monthsPassed);
                  const currentBalance = calculateLoanBalance(item.principal, item.rate, item.term, safeMonthsPassed);
                  const progress = Math.min(100, Math.round(((item.principal - currentBalance) / item.principal) * 100));
                  
                  return (
                    <div className="loan-progress-container">
                      <div className="progress-info">
                        <span>상환 현황 (잔액: ₩{formatCurrency(currentBalance)})</span>
                        <span className="progress-percent">{progress}%</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="item-amount" style={{ 
                color: (item.amount > 0 || item.monthlyPayment > 0) ? (title === '수입' ? 'var(--toss-blue)' : 'var(--toss-text-main)') : 'var(--toss-text-main)',
                marginTop: '4px'
              }}>
                ₩{formatCurrency(item.amount || item.monthlyPayment)}
              </div>
              <button className="btn-more" style={{ marginTop: '0px' }} onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}>
                <MoreHorizontal size={20} />
              </button>
              <AnimatePresence>{activeMenuId === item.id && <ActionMenu onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} onClose={() => setActiveMenuId(null)} />}</AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionMenu({ onEdit, onDelete, onClose }) {
  const ref = useRef();
  useEffect(() => { const fn = (e) => { if(ref.current && !ref.current.contains(e.target)) onClose(); }; document.addEventListener('mousedown', fn); return () => document.removeEventListener('mousedown', fn); }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="action-menu" ref={ref}>
      <div className="menu-item" onClick={onEdit}><Edit3 size={16} /> 수정</div>
      <div className="menu-item menu-delete" onClick={onDelete}><Trash2 size={16} /> 삭제</div>
    </motion.div>
  );
}

function ModalUI({ modal, onSave, setModal }) {
  const [f, setF] = useState({ ...modal.item });
  const [amtStr, setAmtStr] = useState(formatCurrency(modal.item.amount || 0));
  const [principalStr, setPrincipalStr] = useState(formatCurrency(modal.item.principal || 0));
  const isLoan = modal.sector === 'loans';

  const handleAmtChange = (v) => {
    const raw = v.replace(/[^0-9]/g, '');
    const num = parseInt(raw) || 0;
    setAmtStr(num > 0 ? formatCurrency(num) : '');
    setF({ ...f, amount: num });
  };

  const handlePrincipalChange = (v) => {
    const raw = v.replace(/[^0-9]/g, '');
    const num = parseInt(raw) || 0;
    setPrincipalStr(num > 0 ? formatCurrency(num) : '');
    setF({ ...f, principal: num });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setF({ ...f, logoUrl: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const submitAction = () => {
    let finalItem = { ...f };
    if (isLoan) {
      const emi = calculateEMI(f.principal, f.rate, f.term);
      finalItem.monthlyPayment = emi;
      // Initial balance for new item (simulated)
      finalItem.balance = f.principal; 
    }
    onSave(finalItem);
  };

  return (
    <div className="modal-backdrop" onClick={() => setModal({ type: null })}>
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="modal-box" 
        style={{ maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem 2rem' }} onClick={e => e.stopPropagation()}>
        <h3 className="modal-title" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>{modal.type === 'add' ? '내역 추가' : '수정하기'}</h3>
        
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label className="form-label">{isLoan ? '대출 상품명' : '항목명'}</label>
          <div className="toss-input-container">
            <input className="toss-input" style={{ fontSize: '1rem' }} value={f.source || f.name || f.product} onChange={e => setF({...f, [isLoan ? 'product' : (modal.sector === 'incomes' ? 'source' : 'name')]: e.target.value})} placeholder="어디서 발생했나요?" autoFocus />
          </div>
        </div>

        {!isLoan ? (
          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label className="form-label">금액</label>
            <div className="toss-input-container">
              <input className="toss-input" style={{ fontSize: '1rem' }} value={amtStr} onChange={e => handleAmtChange(e.target.value)} placeholder="0" />
            </div>
          </div>
        ) : (
          <>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label className="form-label">총 대출 원금</label>
              <div className="toss-input-container">
                <input className="toss-input" style={{ fontSize: '1rem' }} value={principalStr} onChange={e => handlePrincipalChange(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label">연 이자율 (%)</label>
                <div className="toss-input-container">
                  <input className="toss-input" style={{ fontSize: '1rem' }} type="number" step="0.1" value={f.rate || ''} onChange={e => setF({...f, rate: parseFloat(e.target.value) || 0})} placeholder="0.0" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label">대출 기간 (개월)</label>
                <div className="toss-input-container">
                  <input className="toss-input" style={{ fontSize: '1rem' }} type="number" value={f.term || ''} onChange={e => setF({...f, term: parseInt(e.target.value) || 12})} placeholder="12" />
                </div>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label className="form-label">시작 날짜</label>
              <div className="toss-input-container">
                <input className="toss-input" style={{ fontSize: '1rem' }} type="date" value={f.startDate || ''} onChange={e => setF({...f, startDate: e.target.value})} />
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label className="form-label">날짜 (일)</label>
            <div className="toss-input-container">
              <input className="toss-input" style={{ fontSize: '1rem' }} type="number" value={f.day || ''} onChange={e => setF({...f, day: parseInt(e.target.value) || 1})} placeholder="1" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label className="form-label">{isLoan ? '금융기관' : '결제수단'}</label>
            <div className="toss-input-container">
              <input className="toss-input" style={{ fontSize: '1rem' }} value={f.provider || ''} onChange={e => setF({...f, provider: e.target.value})} placeholder="은행/카드" />
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label className="form-label">이미지 (URL 또는 파일)</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="toss-input-container" style={{ flex: 1 }}>
              <input className="toss-input" style={{ fontSize: '0.8rem' }} value={f.logoUrl || ''} onChange={e => setF({...f, logoUrl: e.target.value})} placeholder="https://..." />
            </div>
            <label className="btn-base btn-grey" style={{ padding: '8px 12px', fontSize: '12px', width: 'auto', flex: 'none', cursor: 'pointer' }}>
              업로드
              <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>
          {f.logoUrl && <img src={f.logoUrl} alt="Preview" style={{ width: '40px', height: '40px', marginTop: '10px', borderRadius: '8px', objectFit: 'cover' }} />}
        </div>

        <div className="btn-group">
          <button className="btn-base btn-grey" onClick={() => setModal({ type: null })}>취소</button>
          <button className="btn-base btn-blue" onClick={submitAction}>저장</button>
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
    a.href = url;
    a.download = `flow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (imported.incomes && imported.expenses && imported.loans) {
            setData(imported);
            alert('데이터가 성공적으로 복구되었습니다.');
            onClose();
          } else {
            alert('올바른 데이터 형식이 아닙니다.');
          }
        } catch (err) {
          alert('파일을 읽는 중 오류가 발생했습니다.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">설정</h3>
        <p style={{ color: 'var(--toss-text-sub)', marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '13px' }}>
          매달 반복되는 내역은 매월 첫 이동 시 자동으로 복사됩니다.<br/>
          중요한 데이터는 주기적으로 백업해 주세요.
        </p>
        
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <button className="btn-base btn-grey" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={exportData}>
            JSON 데이터 다운로드
          </button>
        </div>

        <div className="form-group" style={{ marginBottom: '2.5rem' }}>
          <label className="btn-base btn-blue" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            데이터 복구 (파일 선택)
            <input type="file" hidden accept=".json" onChange={importData} />
          </label>
        </div>

        <button className="btn-base btn-grey" onClick={onClose} style={{ width: '100%', background: 'transparent', color: 'var(--toss-text-sub)' }}>닫기</button>
      </motion.div>
    </div>
  );
}

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
    { id: 'l1', product: '청년 전세자금 대출', principal: 150000000, rate: 3.5, term: 120, startDate: '2024-04-01', monthlyPayment: 1483333, balance: 110000000, day: 1, provider: '신한은행', logoUrl: '/assets/money_stack.png', year: 2026, month: 4 }
  ]
};


