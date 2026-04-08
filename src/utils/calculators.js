/**
 * Formats currency in KRW.
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(value);
};

/**
 * Checks if a specific date falls within the filtered year and month.
 */
export const isWithinPeriod = (itemDateStr, year, month, mode = 'monthly') => {
  const itemDate = new Date(itemDateStr);
  if (mode === 'yearly') {
    return itemDate.getFullYear() === year;
  }
  return itemDate.getFullYear() === year && (itemDate.getMonth() + 1) === month;
};

/**
 * Calculates loan D-Day (days until full repayment).
 */
export const calculateLoanDDay = (balance, monthlyPayment) => {
  if (monthlyPayment <= 0) return 36500; // ~100 years
  const monthsRemaining = balance / monthlyPayment;
  return Math.ceil(monthsRemaining * 30.44);
};

/**
 * Calculates remaining days in a contract.
 */
export const calculateRemainingDays = (endDateStr) => {
  const end = new Date(endDateStr);
  const now = new Date();
  const diffTime = end - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

/**
 * Matches an expense name to card benefits.
 */
export const matchBenefit = (expenseName, cardBenefits) => {
  if (!cardBenefits) return null;
  const lowerName = expenseName.toLowerCase();
  return cardBenefits.find(benefit => 
    benefit.categories.some(cat => lowerName.includes(cat.toLowerCase()))
  );
};

/**
 * Aggregates items by a specific property (e.g. category or bank).
 */
export const aggregateByProperty = (items, propName) => {
  return items.reduce((acc, item) => {
    const key = item[propName] || '기타';
    acc[key] = (acc[key] || 0) + (parseFloat(item.amount) || 0);
    return acc;
  }, {});
};

/**
 * Calculates Year-over-Year change percentage.
 */
export const calculateChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};
