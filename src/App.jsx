import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, TrendingUp, CreditCard, Wallet, 
  Settings, Plus, Trash2, 
  Edit3, ChevronLeft, ChevronRight, ChevronRight as ChevronRIcon,
  X, Calendar, Download, Upload
} from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// --- CONFIG & UTILS ---
const STORAGE_KEY = 'flow_final_concept_v3';
const formatCurrency = (val) => new Intl.NumberFormat('ko-KR').format(val);
const Price = ({ amount, color, className = "", style = {} }) => (
  <span className={`price-container ${className}`} style={{ color, ...style }}>
    {formatCurrency(amount)}<span className="unit-krw">원</span>
  </span>
);

const REPAYMENT = {
  EQUAL: 'equal', // 원리금 균등
  BULLET: 'bullet' // 만기 일시
};

// --- CALCULATORS ---
const getLoanSnapshot = (item, year, month) => {
  const { principal = 0, rate = 0, term = 12, repaymentMethod = REPAYMENT.EQUAL, startDate = '2000-01-01', inputMode = 'auto', manualAmount = 0, manualBalance = 0 } = item;
  
  const [sY, sM] = startDate.split('-').map(Number);
  const startTotalMonths = sY * 12 + (sM || 1);
  const targetTotalMonths = year * 12 + month;
  const monthsPassed = targetTotalMonths - startTotalMonths;

  if (monthsPassed < 0) return { monthlyPayment: 0, interest: 0, principalPaid: 0, remainingBalance: principal, progress: 0 };
  if (monthsPassed >= term) return { monthlyPayment: 0, interest: 0, principalPaid: 0, remainingBalance: 0, progress: 100 };

  if (inputMode === 'manual') {
    const progress = principal ? Math.floor(((principal - manualBalance) / principal) * 100) : 0;
    return { monthlyPayment: manualAmount, interest: 0, principalPaid: principal - manualBalance, remainingBalance: manualBalance, progress };
  }

  let currentBalance = principal;
  let monthlyPayment = 0;
  const monthlyRate = (rate || 0) / 12 / 100;

  if (repaymentMethod === REPAYMENT.BULLET) {
    monthlyPayment = Math.floor(principal * monthlyRate);
    if (monthsPassed === term - 1) monthlyPayment += principal;
    currentBalance = principal; 
    if (monthsPassed >= term) currentBalance = 0;
  } else {
    if (monthlyRate === 0) {
      monthlyPayment = Math.floor(principal / term);
    } else {
      monthlyPayment = Math.floor((principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1));
    }

    for (let i = 0; i <= monthsPassed; i++) {
      const interest = Math.floor(currentBalance * monthlyRate);
      const principalRepaid = monthlyPayment - interest;
      currentBalance -= principalRepaid;
    }
  }

  const progress = principal ? Math.min(100, Math.floor(((principal - currentBalance) / principal) * 100)) : 0;
  return { monthlyPayment, remainingBalance: Math.max(0, currentBalance), progress };
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
  cardExpenses: [
    { id: 'c1', name: '식비/생활비', amount: 1250000, day: 30, provider: '국민카드', logoUrl: 'https://img.icons8.com/color/96/mastercard.png', year: 2026, month: 4 }
  ],
  loans: [
    { id: 'l1', product: '청년 전세자금 대출', principal: 150000000, rate: 3.5, term: 120, startDate: '2024-04-01', repaymentMethod: REPAYMENT.EQUAL, monthlyPayment: 1483333, balance: 110000000, day: 1, provider: '신한은행', logoUrl: '/assets/money_stack.png', year: 2026, month: 4 }
  ],
  taxes: []
};

const ASSETS = {
  LOGO_BLUE_DOT: 'var(--toss-blue)',
  ICON_INCOME: '/assets/income_bag.png',   
  ICON_EXPENSE: '/assets/wallet_wings.png',
  ICON_CARD: '/assets/card.png',
  ICON_TAX: 'https://img.icons8.com/color/96/tax.png',
  ICON_LOAN: '/assets/money_stack.png'    
};

// --- COMPONENTS ---

function DateNavigator({ year, month, onPrev, onNext, isYearly = false }) {
  return (
    <div className="card-date-nav">
      <button className="nav-btn" onClick={onPrev}><ChevronLeft size={16} /></button>
      <span className="current-view-text">{year}년 {isYearly ? '' : `${month}월`}</span>
      <button className="nav-btn" onClick={onNext}><ChevronRight size={16} /></button>
    </div>
  );
}

function NavItem({ label, Icon, active, onClick }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function HomeSummaryRow({ icon, label, amount, color, subText, onClick }) {
  return (
    <div className="summary-row" onClick={onClick}>
      <div className="summary-icon-box">
        {icon.startsWith('http') || icon.startsWith('/') ? <img src={icon} alt="" className="summary-icon-img" /> : <span className="summary-emoji">{icon}</span>}
      </div>
      <div className="summary-text-stack">
        <div className="summary-header">
          <span className="summary-label">{label}</span>
          <div className="chevron-box"><ChevronRIcon size={14} /></div>
        </div>
        <Price amount={amount} color={color} className="summary-amount" />
        {subText && <span className="summary-subtext">{subText}</span>}
      </div>
    </div>
  );
}

function SwipeableItem({ children, onEdit, onDelete }) {
  const controls = useAnimation();
  const onDragEnd = (event, info) => {
    if (info.offset.x < -50 || info.velocity.x < -500) {
      controls.start({ x: -140, transition: { type: 'spring', damping: 20, stiffness: 200 } });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } });
    }
  };

  return (
    <div className="swipe-container">
      <div className="swipe-actions-bg">
        <button className="swipe-btn btn-swipe-edit" onClick={(e) => { e.stopPropagation(); onEdit(); controls.start({ x: 0 }); }}>
          <Edit3 size={16} />
          <span>수정</span>
        </button>
        <button className="swipe-btn btn-swipe-delete" onClick={(e) => { e.stopPropagation(); onDelete(); controls.start({ x: 0 }); }}>
          <Trash2 size={16} />
          <span>삭제</span>
        </button>
      </div>
      <motion.div 
        drag="x" 
        dragConstraints={{ left: -140, right: 0 }} 
        dragElastic={0.1}
        animate={controls} 
        onDragEnd={onDragEnd} 
        className="swipe-content-wrapper"
      >
        {children}
      </motion.div>
    </div>
  );
}

function MonthlyYearlyGraph({ data, currentMonth, type }) {
  const maxVal = Math.max(...data, 1);
  return (
    <div className="yearly-graph-card">
      <div className="card-title" style={{ marginBottom: '8px', fontSize: '11px', fontWeight: '700', color: 'var(--toss-text-sub)' }}>월별 추이</div>
      <div className="graph-container">
        {data.map((val, i) => {
          const month = i + 1;
          const height = Math.max(4, (val / maxVal) * 60);
          const isActive = month === currentMonth;
          return (
            <div key={month} className="graph-column">
              <div className="graph-bar-wrapper">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${height}px` }}
                  className={`graph-bar ${isActive ? (type === 'card' ? 'active-card' : (type === 'tax' ? 'active-tax' : 'active')) : ''}`}
                />
              </div>
              <span className={`graph-month-label ${isActive ? 'active' : ''}`}>{month}월</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomeView({ viewDate, totals, yearlyTotals, navigateMonth, navigateYear, onNavigate, onCopy }) {
  return (
    <div className="home-view">
      <div className="toss-card">
        <div className="card-internal-header home-header-v2">
          <DateNavigator year={viewDate.year} month={viewDate.month} onPrev={() => navigateMonth(-1)} onNext={() => navigateMonth(1)} />
          <button className="btn-clone-text" onClick={onCopy}>가져오기</button>
        </div>

        <HomeSummaryRow 
          icon="/assets/income_bag.png" 
          label="이번 달 총 수입" 
          amount={totals.income} 
          color="var(--toss-blue)"
          onClick={() => onNavigate('incomes')} 
        />
        <HomeSummaryRow 
          icon="/assets/card.png" 
          label="이번 달 총 카드 지출" 
          amount={totals.cardExpense} 
          color="var(--toss-green)"
          onClick={() => onNavigate('cardExpenses')} 
        />
        <HomeSummaryRow 
          icon="/assets/wallet_wings.png" 
          label="이번 달 총 고정지출" 
          amount={totals.expense} 
          color="var(--toss-text-main)"
          onClick={() => onNavigate('expenses')} 
        />
        <HomeSummaryRow 
          icon="https://img.icons8.com/color/96/tax.png" 
          label="이번 달 총 세금" 
          amount={totals.tax} 
          color="var(--toss-purple)"
          onClick={() => onNavigate('taxes')} 
        />
        <HomeSummaryRow 
          icon="/assets/money_stack.png" 
          label="이번 달 대출 납입" 
          amount={totals.loanMonthly} 
          color="var(--toss-orange)"
          subText={`전체 잔액 ${formatCurrency(totals.loanBalance)}원`}
          onClick={() => onNavigate('loans')} 
        />
      </div>

      <div className="toss-card yearly-summary-section">
        <div className="yearly-card-header">
          <DateNavigator year={viewDate.year} isYearly onPrev={() => navigateYear(-1)} onNext={() => navigateYear(1)} />
        </div>
        <div className="yearly-stats-container">
          <div className="yearly-stat-row"><span className="stat-label">연간 총 수입</span><Price amount={yearlyTotals.income} color="var(--toss-blue)" className="stat-amount" /></div>
          <div className="yearly-stat-row"><span className="stat-label">연간 총 카드 지출</span><Price amount={yearlyTotals.card} color="var(--toss-green)" className="stat-amount" /></div>
          <div className="yearly-stat-row"><span className="stat-label">연간 총 고정 지출</span><Price amount={yearlyTotals.expense} color="var(--toss-text-main)" className="stat-amount" /></div>
          <div className="yearly-stat-row"><span className="stat-label">연간 총 세금</span><Price amount={yearlyTotals.tax} color="var(--toss-purple)" className="stat-amount" /></div>
          <div className="yearly-stat-row"><span className="stat-label">연간 대출 상환</span><Price amount={yearlyTotals.loan} color="var(--toss-orange)" className="stat-amount" /></div>
        </div>
      </div>
    </div>
  );
}

function DetailTab({ title, total, items, viewDate, navigateMonth, onAdd, onEdit, onDelete, activeMenuId, setActiveMenuId, isLoan, yearlyData }) {
  const filteredItems = useMemo(() => {
    const filtered = items.filter(i => (!i.year || !i.month) || (i.year === viewDate.year && i.month === viewDate.month));
    if (title === '고정지출' || title === '카드지출' || title === '수입') {
      return [...filtered].sort((a, b) => (a.day || 0) - (b.day || 0));
    }
    return filtered;
  }, [items, viewDate, title]);
  
  const summaryIcon = title === '수입' ? '/assets/income_bag.png' : (title === '고정지출' ? '/assets/wallet_wings.png' : (title === '카드지출' ? '/assets/card.png' : (title === '세금' ? 'https://img.icons8.com/color/96/tax.png' : '/assets/money_stack.png')));
  const summaryColor = title === '수입' ? 'var(--toss-blue)' : (title === '고정지출' ? 'var(--toss-text-main)' : (title === '카드지출' ? 'var(--toss-green)' : (title === '세금' ? 'var(--toss-purple)' : 'var(--toss-orange)')));
  
  const loanSnap = isLoan ? filteredItems.reduce((acc, i) => {
    const snap = getLoanSnapshot(i, viewDate.year, viewDate.month);
    return { balance: acc.balance + snap.remainingBalance, principal: acc.principal + (i.principal || 0) };
  }, { balance: 0, principal: 0 }) : null;

  const totalProgress = (loanSnap && loanSnap.principal) ? Math.floor(((loanSnap.principal - loanSnap.balance) / loanSnap.principal) * 100) : 0;

  return (
    <>
      {yearlyData && (
        <MonthlyYearlyGraph 
          data={yearlyData} 
          currentMonth={viewDate.month} 
          type={title === '카드지출' ? 'card' : (title === '세금' ? 'tax' : 'income')} 
        />
      )}
      <div className="toss-card summary-card-v2">
        <div className="detail-total-section">
          <div className="summary-icon-box" style={{ width: '42px', height: '42px' }}>
            <img src={summaryIcon} alt="" style={{ width: '32px', height: '32px' }} />
          </div>
          <div className="detail-total-wrapper">
            <span className="detail-total-label">이번 달 {title} 총액</span>
            <Price amount={total} color={summaryColor} className="detail-total-amount" />
            {isLoan && (
              <div className="loan-balance-row">
                <span>남은 대출 총액 </span>
                <Price amount={loanSnap.balance} />
              </div>
            )}
          </div>
        </div>
        {isLoan && (
          <div className="loan-progress-container" style={{ width: '100%', marginTop: '10px' }}>
            <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${totalProgress}%`, backgroundColor: 'var(--toss-orange)' }} /></div>
            <span className="progress-percent-text" style={{ color: 'var(--toss-orange)' }}>{totalProgress}%</span>
          </div>
        )}
      </div>

      <div className="toss-card detail-card">
        <div className="card-header-v2">
          <div className="card-title">{title} 내역</div>
          <DateNavigator year={viewDate.year} month={viewDate.month} onPrev={() => navigateMonth(-1)} onNext={() => navigateMonth(1)} />
          <button className="btn-add-icon" onClick={onAdd}><Plus size={20} /></button>
        </div>

        <div className="item-list">
          {filteredItems.map(item => (
            <SwipeableItem key={item.id} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)}>
              <div className={`item-row ${isLoan ? 'is-loan-item' : ''}`}>
                <div className="item-row-main">
                  <div className="logo-box">
                    {item.logoUrl ? <img src={item.logoUrl} alt="" className="item-logo-img" crossOrigin="anonymous" /> : <div className="logo-placeholder">{(item.source || item.name || item.product || '?').charAt(0)}</div>}
                  </div>
                  <div className="item-content">
                    <div className="item-title">{item.source || item.name || item.product}</div>
                    <div className="item-desc">{item.day}일 | {item.provider}</div>
                  </div>
                  {!isLoan && (
                    <div className="item-amount">
                      <Price amount={item.amount || item.monthlyPayment} />
                    </div>
                  )}
                </div>
                
                {isLoan && (() => {
                  const snap = getLoanSnapshot(item, viewDate.year, viewDate.month);
                  return (
                    <div className="loan-item-details">
                      <div className="loan-item-amount-row">
                        <Price amount={snap.monthlyPayment} className="loan-monthly-price" />
                      </div>
                      
                        <div className="loan-progress-detail">
                          <div className="loan-status-text">
                            {item.repaymentMethod === REPAYMENT.EQUAL ? '원리금균등' : '만기일시'} 상환 중 <span className="progress-highlight">{snap.progress}%</span>
                          </div>
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: `${snap.progress}%`, backgroundColor: 'var(--toss-orange)' }}></div>
                          </div>
                          <div className="loan-remaining-balance">
                            잔액: <Price amount={snap.remainingBalance} />
                          </div>
                        </div>
                    </div>
                  );
                })()}
              </div>
            </SwipeableItem>
          ))}
        </div>
      </div>
    </>
  );
}

function ModalUI({ modal, onSave, setModal, viewDate, nameToIconMap }) {
  const [f, setF] = useState({ 
    inputMode: 'auto',
    manualAmount: 0,
    manualBalance: 0,
    ...modal.item 
  });
  
  const [amtStr, setAmtStr] = useState(formatCurrency(f.amount || f.manualAmount || 0));
  const [pStr, setPStr] = useState(formatCurrency(f.principal || 0));
  const [balStr, setBalStr] = useState(formatCurrency(f.manualBalance || 0));
  
  const isLoan = modal.sector === 'loans';

  const handleAmt = (v) => {
    const n = parseInt(v.replace(/[^0-9]/g, '')) || 0;
    setAmtStr(n > 0 ? formatCurrency(n) : '');
    if (isLoan) setF({ ...f, manualAmount: n });
    else setF({ ...f, amount: n });
  };
  const handleP = (v) => {
    const n = parseInt(v.replace(/[^0-9]/g, '')) || 0;
    setPStr(n > 0 ? formatCurrency(n) : '');
    setF({ ...f, principal: n });
  };
  const handleBal = (v) => {
    const n = parseInt(v.replace(/[^0-9]/g, '')) || 0;
    setBalStr(n > 0 ? formatCurrency(n) : '');
    setF({ ...f, manualBalance: n });
  };
  
  const handleNameChange = (newName) => {
    const field = isLoan ? 'product' : (modal.sector === 'incomes' ? 'source' : 'name');
    const nextF = { ...f, [field]: newName };
    if (nameToIconMap[newName] && !f.logoUrl) {
      nextF.logoUrl = nameToIconMap[newName];
    }
    setF(nextF);
  };

  const autoSnap = isLoan ? getLoanSnapshot(f, viewDate.year, viewDate.month) : null;

  return (
    <div className="modal-backdrop" onClick={() => setModal({ type: null })}>
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="modal-box" style={{ maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{modal.type === 'add' ? '내역 추가' : '수정하기'}</h3>
        </div>
        
        <div className="modal-body">
          {isLoan && (
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label className="form-label">입력 방식</label>
              <div className="repayment-selector">
                <div className={`repayment-option ${f.inputMode === 'auto' ? 'active' : ''}`} onClick={() => setF({...f, inputMode: 'auto'})}>🤖 자동 계산</div>
                <div className={`repayment-option ${f.inputMode === 'manual' ? 'active' : ''}`} onClick={() => setF({...f, inputMode: 'manual'})}>✍️ 수동 기록</div>
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label className="form-label">{isLoan ? '대출 상품명' : '항목명'}</label>
            <div className="toss-input-container">
              <input 
                className="toss-input" 
                value={f.source || f.name || f.product || ''} 
                onChange={e => handleNameChange(e.target.value)} 
                placeholder="어디서 발생했나요?" 
                autoFocus 
              />
            </div>
          </div>

          {isLoan ? (
            <>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">총 대출 원금</label><div className="toss-input-container"><input className="toss-input" value={pStr} onChange={e => handleP(e.target.value)} placeholder="0" /></div></div>
              
              {f.inputMode === 'auto' ? (
                <>
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
                  <div className="preview-box-enhanced">
                    <span className="preview-label-v2">예상 월 납입금</span>
                    <div>
                      <span className="preview-amount-v2">{formatCurrency(autoSnap.monthlyPayment)}원</span>
                      <span className="preview-sub-v2">{f.repaymentMethod === REPAYMENT.BULLET ? '(이자만)' : '(원금+이자)'}</span>
                    </div>
                    <div className="preview-chart-mock">
                      {[3,5,4,6,5,7,6,8,7,9,8,10,9,11,10].map((h, i) => (
                        <div key={i} className={`chart-bar ${i > 10 ? 'active' : ''}`} style={{ height: `${h * 10}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.2rem', marginTop: '1.2rem' }}><label className="form-label">시작 날짜</label><div className="toss-input-container" style={{ position: 'relative' }}><input className="toss-input" type="date" value={f.startDate || ''} onChange={e => setF({...f, startDate: e.target.value})} /><div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#111' }}><Calendar size={18} strokeWidth={2.5} /></div></div></div>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">금번 월 납입금</label><div className="toss-input-container"><input className="toss-input" value={amtStr} onChange={e => handleAmt(e.target.value)} placeholder="0" /></div></div>
                  <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">현재 대출 잔액</label><div className="toss-input-container"><input className="toss-input" value={balStr} onChange={e => handleBal(e.target.value)} placeholder="0" /></div></div>
                </div>
              )}
            </>
          ) : (
            <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">금액</label><div className="toss-input-container"><input className="toss-input" value={amtStr} onChange={e => handleAmt(e.target.value)} placeholder="0" /></div></div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">날짜 (일)</label><div className="toss-input-container"><input className="toss-input" type="number" value={f.day || ''} onChange={e => setF({...f, day: parseInt(e.target.value) || 1})} /></div></div>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}><label className="form-label">금융기관/카드</label><div className="toss-input-container"><input className="toss-input" value={f.provider || ''} onChange={e => setF({...f, provider: e.target.value})} /></div></div>
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label className="form-label">아이콘 URL (선택)</label>
            <div className="toss-input-container"><input className="toss-input" value={f.logoUrl || ''} onChange={e => setF({...f, logoUrl: e.target.value})} placeholder="https://... 또는 /assets/..." /></div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="btn-group">
            <button className="btn-base btn-grey" onClick={() => setModal({ type: null })}>취소</button>
            <button className="btn-base btn-blue" onClick={() => onSave(f)}>저장</button>
          </div>
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
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="modal-box" 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="modal-title">설정</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--toss-text-sub)' }}>
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body" style={{ padding: '2rem 1.5rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <button className="btn-base btn-grey" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px' }} onClick={exportData}>
              <Download size={18} /> 데이터 다운로드
            </button>
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="btn-base btn-blue" style={{ width: '100%', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px' }}>
              <Upload size={18} /> 데이터 복구 
              <input type="file" hidden accept=".json" onChange={importData} />
            </label>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button className="btn-base" onClick={onClose} style={{ width: '100%', background: 'transparent', color: 'var(--toss-text-sub)', fontWeight: 600 }}>닫기</button>
        </div>
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
      return (parsed.incomes && parsed.expenses && parsed.loans) ? { ...INITIAL_DATA, ...parsed } : INITIAL_DATA;
    } catch (e) { return INITIAL_DATA; }
  });

  const [viewDate, setViewDate] = useState({ year: 2026, month: 4 });
  const [activeTab, setActiveTab] = useState('home');
  const [modal, setModal] = useState({ type: null, sector: null, item: null });
  const [clonePrompt, setClonePrompt] = useState({ isOpen: false, target: null, source: null });
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const nameToIconMap = useMemo(() => {
    const map = {};
    const categories = ['incomes', 'expenses', 'cardExpenses', 'taxes', 'loans'];
    categories.forEach(cat => {
      (data[cat] || []).forEach(item => {
        const name = item.source || item.name || item.product;
        if (name && item.logoUrl && !map[name]) {
          map[name] = item.logoUrl;
        }
      });
    });
    return map;
  }, [data]);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);

  const navigateMonth = (step) => {
    let nm = viewDate.month + step, ny = viewDate.year;
    if (nm > 12) { nm = 1; ny++; } else if (nm < 1) { nm = 12; ny--; }
    const nextDate = { year: ny, month: nm };
    const exists = (data.incomes.some(i => i.year === ny && i.month === nm) || data.expenses.some(i => i.year === ny && i.month === nm) || (data.cardExpenses || []).some(i => i.year === ny && i.month === nm) || (data.taxes || []).some(i => i.year === ny && i.month === nm) || data.loans.some(i => i.year === ny && i.month === nm));
    if (!exists) setClonePrompt({ isOpen: true, target: nextDate, source: { ...viewDate } });
    setViewDate(nextDate);
  };

  const navigateYear = (step) => {
    setViewDate({ ...viewDate, year: viewDate.year + step });
  };

  const executeClone = () => {
    const { target, source } = clonePrompt;
    setData(prev => {
      const clone = (list, sector) => {
        const sourceItems = list.filter(i => i.year === source.year && i.month === source.month);
        const targetItems = list.filter(i => i.year === target.year && i.month === target.month);

        return sourceItems
          .filter(si => !targetItems.some(ti => {
            if (sector === 'incomes') return ti.source === si.source && ti.provider === si.provider;
            if (sector === 'expenses') return ti.name === si.name && ti.provider === si.provider;
            if (sector === 'cardExpenses') return ti.name === si.name && ti.provider === si.provider;
            if (sector === 'taxes') return ti.name === si.name && ti.provider === si.provider;
            if (sector === 'loans') return ti.product === si.product && ti.provider === si.provider;
            return false;
          }))
          .map(i => {
            let extra = {};
            if (sector === 'loans') {
              const snap = getLoanSnapshot(i, source.year, source.month);
              extra = {
                manualAmount: i.inputMode === 'manual' ? i.manualAmount : snap.monthlyPayment,
                manualBalance: i.inputMode === 'manual' ? Math.max(0, i.manualBalance - i.manualAmount) : Math.max(0, snap.remainingBalance - snap.monthlyPayment)
              };
            }
            return { ...i, id: Date.now() + Math.random().toString(), year: target.year, month: target.month, ...extra };
          });
      };
      return { 
        incomes: [...prev.incomes, ...clone(prev.incomes, 'incomes')], 
        expenses: [...prev.expenses, ...clone(prev.expenses, 'expenses')], 
        cardExpenses: [...(prev.cardExpenses || []), ...clone(prev.cardExpenses || [], 'cardExpenses')],
        taxes: [...(prev.taxes || []), ...clone(prev.taxes || [], 'taxes')],
        loans: [...prev.loans, ...clone(prev.loans, 'loans')] 
      };
    });
    setClonePrompt({ isOpen: false, target: null, source: null });
  };

  const manualCopyPrevious = () => {
    let pm = viewDate.month - 1, py = viewDate.year;
    if (pm < 1) { pm = 12; py--; }
    
    const target = { year: viewDate.year, month: viewDate.month }, source = { year: py, month: pm };
    let importedCount = 0;

    setData(prev => {
      const clone = (list, sector) => {
        const sourceItems = list.filter(i => i.year === source.year && i.month === source.month);
        const targetItems = list.filter(i => i.year === target.year && i.month === target.month);

        const newItems = sourceItems
          .filter(si => !targetItems.some(ti => {
            if (sector === 'incomes') return ti.source === si.source && ti.provider === si.provider;
            if (sector === 'expenses') return ti.name === si.name && ti.provider === si.provider;
            if (sector === 'cardExpenses') return ti.name === si.name && ti.provider === si.provider;
            if (sector === 'taxes') return ti.name === si.name && ti.provider === si.provider;
            if (sector === 'loans') return ti.product === si.product && ti.provider === si.provider;
            return false;
          }))
          .map(i => {
            let extra = {};
            if (sector === 'loans') {
              const snap = getLoanSnapshot(i, source.year, source.month);
              extra = {
                manualAmount: i.inputMode === 'manual' ? i.manualAmount : snap.monthlyPayment,
                manualBalance: i.inputMode === 'manual' ? Math.max(0, i.manualBalance - i.manualAmount) : Math.max(0, snap.remainingBalance - snap.monthlyPayment)
              };
            }
            return { ...i, id: (Date.now() + Math.random()).toString(), year: target.year, month: target.month, ...extra };
          });
        
        importedCount += newItems.length;
        return newItems;
      };

      const newIncomes = clone(prev.incomes, 'incomes');
      const newExpenses = clone(prev.expenses, 'expenses');
      const newCardExpenses = clone(prev.cardExpenses || [], 'cardExpenses');
      const newTaxes = clone(prev.taxes || [], 'taxes');
      const newLoans = clone(prev.loans, 'loans');

      if (importedCount === 0) {
        alert("가져올 수 있는 새로운 항목이 없습니다 (이미 중복됨)");
        return prev;
      }

      return { 
        incomes: [...prev.incomes, ...newIncomes], 
        expenses: [...prev.expenses, ...newExpenses], 
        cardExpenses: [...(prev.cardExpenses || []), ...newCardExpenses],
        taxes: [...(prev.taxes || []), ...newTaxes],
        loans: [...prev.loans, ...newLoans] 
      };
    });

    if (importedCount > 0) alert(`${importedCount}개의 항목을 가져왔습니다.`);
  };

  const totals = useMemo(() => {
    const cur = { incomes: data.incomes.filter(i => i.year === viewDate.year && i.month === viewDate.month), expenses: data.expenses.filter(i => i.year === viewDate.year && i.month === viewDate.month), cardExpenses: (data.cardExpenses || []).filter(i => i.year === viewDate.year && i.month === viewDate.month), taxes: (data.taxes || []).filter(i => i.year === viewDate.year && i.month === viewDate.month), loans: data.loans.filter(i => i.year === viewDate.year && i.month === viewDate.month) };
    const inc = cur.incomes.reduce((a,c) => a + c.amount, 0), exp = cur.expenses.reduce((a,c) => a + c.amount, 0), cardExp = cur.cardExpenses.reduce((a,c) => a + c.amount, 0), taxExp = cur.taxes.reduce((a,c) => a + c.amount, 0);
    
    let loanMonthlyTotal = 0;
    let loanBalanceTotal = 0;
    let loanPrincipalTotal = 0;

    cur.loans.forEach(i => {
      const snap = getLoanSnapshot(i, viewDate.year, viewDate.month);
      loanMonthlyTotal += snap.monthlyPayment;
      loanBalanceTotal += snap.remainingBalance;
      loanPrincipalTotal += (i.principal || 0);
    });

    const progressTotal = loanPrincipalTotal ? Math.floor(((loanPrincipalTotal - loanBalanceTotal) / loanPrincipalTotal) * 100) : 0;
    return { income: inc, expense: exp, cardExpense: cardExp, tax: taxExp, loanMonthly: loanMonthlyTotal, loanBalance: loanBalanceTotal, loanProgress: progressTotal };
  }, [data, viewDate]);

  const yearlyTotals = useMemo(() => {
    const today = new Date(), tY = today.getFullYear(), tM = today.getMonth() + 1;
    let limitM = viewDate.year === tY ? tM : (viewDate.year < tY ? 12 : 0);
    const incSum = data.incomes.filter(i => i.year === viewDate.year && i.month <= limitM).reduce((a,c) => a + c.amount, 0);
    const expSum = data.expenses.filter(i => i.year === viewDate.year && i.month <= limitM).reduce((a,c) => a + c.amount, 0);
    const cardSum = (data.cardExpenses || []).filter(i => i.year === viewDate.year && i.month <= limitM).reduce((a,c) => a + c.amount, 0);
    const taxSum = (data.taxes || []).filter(i => i.year === viewDate.year && i.month <= limitM).reduce((a,c) => a + c.amount, 0);
    let loanSum = 0;
    for (let m = 1; m <= limitM; m++) {
      data.loans.filter(l => l.year === viewDate.year && l.month === m).forEach(l => {
        const snap = getLoanSnapshot(l, viewDate.year, m);
        loanSum += snap.monthlyPayment;
      });
    }
    return { income: incSum, expense: expSum, card: cardSum, tax: taxSum, loan: loanSum };
  }, [data, viewDate.year]);

  const saveItem = (i) => {
    setData(prev => {
      let list = [...(prev[modal.sector] || [])];
      if (modal.type === 'edit') list = list.map(x => x.id === i.id ? i : x);
      else list.push({ ...i, id: Date.now().toString(), year: viewDate.year, month: viewDate.month });
      return { ...prev, [modal.sector]: list };
    });
    setModal({ type: null });
  };

  return (
    <div className="app-layout">
      <header className="main-header"><div className="header-inner"><div className="brand-logo" onClick={() => setActiveTab('home')}><img src="/assets/logo.png" alt="FLOW" /></div><button className="settings-pill" onClick={() => setIsSettingsOpen(true)}><Settings size={18} /> 설정</button></div></header>
      <div className="app-container">
        <main style={{ paddingBottom: '40px' }}>
          {activeTab === 'home' && <HomeView viewDate={viewDate} totals={totals} yearlyTotals={yearlyTotals} navigateMonth={navigateMonth} navigateYear={navigateYear} onNavigate={setActiveTab} onCopy={manualCopyPrevious} />}
          {activeTab === 'incomes' && (
            <DetailTab 
              title="수입" 
              total={totals.income} 
              items={data.incomes} 
              viewDate={viewDate} 
              navigateMonth={navigateMonth} 
              onAdd={() => setModal({ type: 'add', sector: 'incomes', item: { amount: 0, day: 1 } })} 
              onEdit={i => setModal({ type: 'edit', sector: 'incomes', item: i })} 
              onDelete={i => { setModal({ type: 'delete_confirm', sector: 'incomes', item: i }); setActiveMenuId(null); }} 
              activeMenuId={activeMenuId} 
              setActiveMenuId={setActiveMenuId} 
              yearlyData={Array.from({ length: 12 }, (_, m) => data.incomes.filter(i => i.year === viewDate.year && i.month === m+1).reduce((a, c) => a + c.amount, 0))}
            />
          )}
          {activeTab === 'cardExpenses' && (
            <DetailTab 
              title="카드지출" 
              total={totals.cardExpense} 
              items={data.cardExpenses || []} 
              viewDate={viewDate} 
              navigateMonth={navigateMonth} 
              onAdd={() => setModal({ type: 'add', sector: 'cardExpenses', item: { amount: 0, day: 1 } })} 
              onEdit={i => setModal({ type: 'edit', sector: 'cardExpenses', item: i })} 
              onDelete={i => { setModal({ type: 'delete_confirm', sector: 'cardExpenses', item: i }); setActiveMenuId(null); }} 
              activeMenuId={activeMenuId} 
              setActiveMenuId={setActiveMenuId} 
              yearlyData={Array.from({ length: 12 }, (_, m) => (data.cardExpenses || []).filter(i => i.year === viewDate.year && i.month === m+1).reduce((a, c) => a + c.amount, 0))}
            />
          )}
          {activeTab === 'expenses' && (
            <DetailTab 
              title="고정지출" 
              total={totals.expense} 
              items={data.expenses} 
              viewDate={viewDate} 
              navigateMonth={navigateMonth} 
              onAdd={() => setModal({ type: 'add', sector: 'expenses', item: { amount: 0, day: 1 } })} 
              onEdit={i => setModal({ type: 'edit', sector: 'expenses', item: i })} 
              onDelete={i => { setModal({ type: 'delete_confirm', sector: 'expenses', item: i }); setActiveMenuId(null); }} 
              activeMenuId={activeMenuId} 
              setActiveMenuId={setActiveMenuId} 
            />
          )}
          {activeTab === 'taxes' && (
            <DetailTab 
              title="세금" 
              total={totals.tax} 
              items={data.taxes || []} 
              viewDate={viewDate} 
              navigateMonth={navigateMonth} 
              onAdd={() => setModal({ type: 'add', sector: 'taxes', item: { amount: 0, day: 1 } })} 
              onEdit={i => setModal({ type: 'edit', sector: 'taxes', item: i })} 
              onDelete={i => { setModal({ type: 'delete_confirm', sector: 'taxes', item: i }); setActiveMenuId(null); }} 
              activeMenuId={activeMenuId} 
              setActiveMenuId={setActiveMenuId} 
              yearlyData={Array.from({ length: 12 }, (_, m) => (data.taxes || []).filter(i => i.year === viewDate.year && i.month === m+1).reduce((a, c) => a + c.amount, 0))}
            />
          )}
          {activeTab === 'loans' && <DetailTab title="대출" total={totals.loanMonthly} items={data.loans} isLoan viewDate={viewDate} navigateMonth={navigateMonth} onAdd={() => setModal({ type: 'add', sector: 'loans', item: { principal: 0, rate: 0, term: 12, repaymentMethod: REPAYMENT.EQUAL } })} onEdit={i => setModal({ type: 'edit', sector: 'loans', item: i })} onDelete={i => { setModal({ type: 'delete_confirm', sector: 'loans', item: i }); setActiveMenuId(null); }} activeMenuId={activeMenuId} setActiveMenuId={setActiveMenuId} />}
        </main>
      </div>
      <nav className="bottom-nav">
        <NavItem label="홈" Icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem label="수입" Icon={TrendingUp} active={activeTab === 'incomes'} onClick={() => setActiveTab('incomes')} />
        <NavItem label="카드지출" Icon={CreditCard} active={activeTab === 'cardExpenses'} onClick={() => setActiveTab('cardExpenses')} />
        <NavItem label="고정지출" Icon={Calendar} active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
        <NavItem label="세금" Icon={FileText} active={activeTab === 'taxes'} onClick={() => setActiveTab('taxes')} />
        <NavItem label="대출" Icon={Wallet} active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} />
      </nav>
      <AnimatePresence>
        {modal.type === 'delete_confirm' && (
          <div className="modal-backdrop" onClick={() => setModal({type:null})}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} className="modal-box">
              <div className="modal-header">
                <h3 className="modal-title" style={{textAlign:'center'}}>삭제하시겠습니까?</h3>
              </div>
              <div className="modal-footer">
                <div className="btn-group">
                  <button className="btn-base btn-grey" onClick={()=>setModal({type:null})}>취소</button>
                  <button className="btn-base btn-red" onClick={()=>{setData(prev=>({...prev,[modal.sector]:prev[modal.sector].filter(x=>x.id!==modal.item.id)}));setModal({type:null});}}>삭제</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {isSettingsOpen && <SettingsModal data={data} setData={setData} onClose={() => setIsSettingsOpen(false)} />}
        {modal.type && modal.type !== 'delete_confirm' && (
          <ModalUI 
            modal={modal} 
            onSave={saveItem} 
            setModal={setModal} 
            viewDate={viewDate} 
            nameToIconMap={nameToIconMap} 
          />
        )}
        {clonePrompt.isOpen && (
          <div className="modal-backdrop" onClick={()=>setClonePrompt({...clonePrompt,isOpen:false})}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} className="modal-box">
              <div className="modal-header">
                <h3 className="modal-title" style={{textAlign:'center'}}>데이터가 없습니다</h3>
              </div>
              <div className="modal-body" style={{ paddingBottom: '1.5rem' }}>
                <p style={{textAlign:'center',fontSize:'14px',margin:0}}>지난달 내역을 가져올까요?</p>
              </div>
              <div className="modal-footer">
                <div className="btn-group">
                  <button className="btn-base btn-grey" onClick={()=>setClonePrompt({...clonePrompt,isOpen:false})}>아니오</button>
                  <button className="btn-base btn-blue" onClick={executeClone}>가져오기</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
