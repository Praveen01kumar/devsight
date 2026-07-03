import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface AmortizationRow {
  monthIndex: number;
  date: string;
  emi: number;
  principalPaid: number;
  interestPaid: number;
  extraPayment: number;
  outstandingBalance: number;
  isMoratorium: boolean;
}

export interface CalculatorResults {
  baseEmi: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  totalExtraPaid: number;
  totalRepayment: number;
  totalUpfrontCharges: number;
  totalCostOfLoan: number;
  schedule: AmortizationRow[];
  completionDate: string;

  // Eligibility / Affordability / Desired Loan
  maxLoanEligibility?: number;
  suggestedEmi?: number;
  dtiRatio?: number;
  affordableEmi?: number;
  affordableLoan?: number;
  riskLevel?: string;

  // Tenure
  tenureMonths?: number;
  errorMsg?: string;

  // Interest Rate
  solvedRate?: number;
  apr?: number;

  // Prepayments & Reductions
  interestSaved?: number;
  monthsSaved?: number;
  originalInterest?: number;
  originalRepayment?: number;
  originalEmi?: number;
  emiSaved?: number;
  originalTenure?: number;

  // Foreclosure
  closureCost?: number;
  foreclosureFee?: number;
  netSavings?: number;

  // Balance Transfer
  monthlySavings?: number;
  interestSavings?: number;
  transferFeeAmount?: number;
  breakEvenMonths?: number;
  isRecommended?: boolean;

  // Comparison
  loanA?: CalculatorResults;
  loanB?: CalculatorResults;
  betterLoan?: string;
  totalCostSavings?: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-loan-calculator',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './loan-calculator.html'
})
export class LoanCalculator {
  // Navigation & UI States
  readonly activeTab = signal<string>('emi');
  readonly searchQuery = signal<string>('');
  readonly showAdvanced = signal<boolean>(false);
  readonly showSchedule = signal<boolean>(false);
  readonly activeChartTab = signal<string>('balance');

  // Toast Notification State
  readonly toastMessage = signal<string>('');
  readonly toastVisible = signal<boolean>(false);

  // Amortization Table Search & Pagination
  readonly scheduleSearchQuery = signal<string>('');
  readonly scheduleYearFilter = signal<string>('all');
  readonly currentPage = signal<number>(1);

  // Static Metadata for the 12 Calculators
  readonly calculators = [
    { id: 'emi', name: 'EMI Calculator', icon: 'calculate', description: 'Calculate monthly instalments, total interest, and completion timeline.', keywords: ['emi', 'monthly', 'repayment', 'schedule', 'home loan', 'car loan'] },
    { id: 'eligibility', name: 'Loan Eligibility', icon: 'person_search', description: 'Estimate the maximum loan amount you qualify for based on income.', keywords: ['eligible', 'income', 'salary', 'qualification', 'maximum'] },
    { id: 'affordability', name: 'Loan Affordability', icon: 'savings', description: 'Find how much loan you can comfortably afford based on your expenses.', keywords: ['afford', 'budget', 'expense', 'savings', 'risk'] },
    { id: 'loan_amount', name: 'Loan Amount', icon: 'monetization_on', description: 'Determine the principal you can borrow for a target monthly EMI.', keywords: ['principal', 'target emi', 'borrow', 'maximum'] },
    { id: 'tenure', name: 'Loan Tenure', icon: 'calendar_today', description: 'Calculate the time required to pay off a loan for a desired EMI.', keywords: ['duration', 'time', 'months', 'years', 'tenure'] },
    { id: 'interest_rate', name: 'Interest Rate (APR)', icon: 'percent', description: 'Find the estimated interest rate or APR for a given loan and EMI.', keywords: ['rate', 'percentage', 'apr', 'solve rate'] },
    { id: 'prepayment', name: 'Part Prepayment', icon: 'payments', description: 'See how a lump sum prepayment saves interest and shortens tenure.', keywords: ['prepay', 'lump sum', 'extra payment', 'save interest'] },
    { id: 'emi_reduction', name: 'EMI Reduction', icon: 'trending_down', description: 'Calculate your reduced monthly EMI after making a partial prepayment.', keywords: ['reduce emi', 'lower payment', 'outstanding'] },
    { id: 'tenure_reduction', name: 'Tenure Reduction', icon: 'hourglass_bottom', description: 'See how adding a monthly extra payment cuts down loan duration.', keywords: ['shorten tenure', 'months saved', 'extra monthly'] },
    { id: 'foreclosure', name: 'Foreclosure Cost', icon: 'gavel', description: 'Calculate savings and closing fees when fully paying off a loan early.', keywords: ['foreclose', 'close loan', 'pre-closure', 'outstanding'] },
    { id: 'balance_transfer', name: 'Balance Transfer', icon: 'compare_arrows', description: 'Analyze savings when switching your outstanding loan to a lower rate.', keywords: ['refinance', 'switch bank', 'lower interest', 'transfer fee'] },
    { id: 'comparison', name: 'Loan Comparison', icon: 'balance', description: 'Compare two loans side-by-side to find the most cost-effective deal.', keywords: ['compare', 'side by side', 'loan a', 'loan b', 'better option'] }
  ];

  // ----------------------------------------------------
  // CALCULATOR INPUT SIGNALS (With Premium Default Values)
  // ----------------------------------------------------

  // 1. EMI Calculator Inputs
  readonly loanAmount = signal<number>(2500000);
  readonly interestRate = signal<number>(8.5);
  readonly loanTenure = signal<number>(15);
  readonly tenureType = signal<string>('years');

  // 2. Loan Eligibility Inputs
  readonly eligMonthlyIncome = signal<number>(100000);
  readonly eligExistingEmis = signal<number>(15000);
  readonly eligInterestRate = signal<number>(8.5);
  readonly eligTenure = signal<number>(20);

  // 3. Loan Affordability Inputs
  readonly affMonthlyIncome = signal<number>(100000);
  readonly affExpenses = signal<number>(40000);
  readonly affSavingsGoal = signal<number>(20000);
  readonly affInterestRate = signal<number>(8.5);
  readonly affTenure = signal<number>(15);

  // 4. Loan Amount Inputs
  readonly amtDesiredEmi = signal<number>(25000);
  readonly amtInterestRate = signal<number>(8.5);
  readonly amtTenure = signal<number>(15);

  // 5. Loan Tenure Inputs
  readonly tenAmount = signal<number>(2000000);
  readonly tenInterestRate = signal<number>(8.5);
  readonly tenDesiredEmi = signal<number>(25000);

  // 6. Interest Rate Inputs
  readonly rateAmount = signal<number>(1500000);
  readonly rateEmi = signal<number>(18000);
  readonly rateTenure = signal<number>(10);

  // 7. Part Prepayment Inputs
  readonly prepCurrentLoan = signal<number>(3000000);
  readonly prepRemainingTenure = signal<number>(120); // in months
  readonly prepInterestRate = signal<number>(8.5);
  readonly prepOneTimeAmount = signal<number>(300000);
  readonly prepType = signal<string>('tenure_reduction');

  // 8. EMI Reduction Inputs
  readonly redEmiOutstanding = signal<number>(2000000);
  readonly redEmiExtraPayment = signal<number>(200000);
  readonly redEmiTenure = signal<number>(10); // years
  readonly redEmiInterest = signal<number>(8.5);
  readonly redEmiCurrentEmi = signal<number>(25000);

  // 9. Tenure Reduction Inputs
  readonly redTenOutstanding = signal<number>(2000000);
  readonly redTenTenure = signal<number>(120); // remaining months
  readonly redTenInterest = signal<number>(8.5);
  readonly redTenExtraMonthly = signal<number>(2000);

  // 10. Foreclosure Inputs
  readonly foreOutstanding = signal<number>(1500000);
  readonly foreInterest = signal<number>(8.5);
  readonly foreCharges = signal<number>(2); // %
  readonly foreRemainingMonths = signal<number>(80);

  // 11. Balance Transfer Inputs
  readonly btCurrentLoan = signal<number>(2500000);
  readonly btCurrentInterest = signal<number>(9.5);
  readonly btNewInterest = signal<number>(8.2);
  readonly btRemainingTenure = signal<number>(15); // years
  readonly btTransferFee = signal<number>(1);
  readonly btTransferFeeType = signal<string>('percent'); // 'percent' or 'flat'

  // 12. Loan Comparison Inputs
  readonly compAmountA = signal<number>(2000000);
  readonly compInterestA = signal<number>(8.5);
  readonly compTenureA = signal<number>(15);
  readonly compAmountB = signal<number>(2000000);
  readonly compInterestB = signal<number>(8.0);
  readonly compTenureB = signal<number>(15);

  // Advanced Option Inputs (Collapsed by default, shared across calculations)
  readonly advProcessingFee = signal<number>(0.5); // %
  readonly advInsurance = signal<number>(0); // Flat rupee
  readonly advGst = signal<number>(18); // % on processing fee (default 18% in India)
  readonly advAnnualPrepayment = signal<number>(0); // % of original loan
  readonly advMonthlyExtraPayment = signal<number>(0); // Flat rupee added per month
  readonly advOneTimePrepayment = signal<number>(0); // Flat lump sum extra
  readonly advOneTimeMonth = signal<number>(12); // Month number at which lump sum occurs
  readonly advStartDate = signal<string>('2026-07-02');
  readonly advCompounding = signal<string>('monthly'); // 'monthly', 'quarterly', 'yearly'
  readonly advMoratorium = signal<number>(0); // months of moratorium

  // ----------------------------------------------------
  // COMPUTED SIGNALS FOR THE FILTERED CALCULATORS LIST
  // ----------------------------------------------------
  readonly filteredCalculators = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.calculators;
    return this.calculators.filter(calc =>
      calc.name.toLowerCase().includes(query) ||
      calc.description.toLowerCase().includes(query) ||
      calc.keywords.some(k => k.includes(query))
    );
  });

  // ----------------------------------------------------
  // GENERAL HELPER METHODS
  // ----------------------------------------------------

  formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  formatINR(val: number | null | undefined, decimals = false): string {
    if (val === null || val === undefined || Number.isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0
    }).format(val);
  }

  formatNumber(val: number | null | undefined): string {
    if (val === null || val === undefined || Number.isNaN(val)) return '0';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
  }

  showToastMessage(msg: string) {
    this.toastMessage.set(msg);
    this.toastVisible.set(true);
    setTimeout(() => {
      this.toastVisible.set(false);
    }, 3000);
  }

  // ----------------------------------------------------
  // UNIFIED CALCULATION ENGINE
  // ----------------------------------------------------
  calculateAmortizationSchedule(
    principal: number,
    annualRate: number,
    tenureMonths: number,
    startMonthStr: string,
    options: {
      processingFeePercent?: number;
      insurance?: number;
      gstPercent?: number;
      compounding?: string;
      moratoriumMonths?: number;
      monthlyExtraPayment?: number;
      annualPrepaymentPercent?: number;
      oneTimePrepayment?: number;
      oneTimePrepaymentMonth?: number;
    } = {}
  ): CalculatorResults {
    const procFeePercent = options.processingFeePercent ?? 0;
    const insurance = options.insurance ?? 0;
    const gstPercent = options.gstPercent ?? 18;
    const compounding = options.compounding ?? 'monthly';
    const moratorium = options.moratoriumMonths ?? 0;
    const monthlyExtra = options.monthlyExtraPayment ?? 0;
    const annualPrepPercent = options.annualPrepaymentPercent ?? 0;
    const oneTimePrep = options.oneTimePrepayment ?? 0;
    const oneTimeMonth = options.oneTimePrepaymentMonth ?? 0;

    // Upfront fees
    const rawProcessingFee = (principal * procFeePercent) / 100;
    const gstOnFee = (rawProcessingFee * gstPercent) / 100;
    const totalUpfrontCharges = rawProcessingFee + gstOnFee + insurance;

    // Effective monthly interest rate
    const r = annualRate / 100;
    let r_eff = r / 12;
    if (compounding === 'quarterly') {
      r_eff = Math.pow(1 + r / 4, 4 / 12) - 1;
    } else if (compounding === 'yearly') {
      r_eff = Math.pow(1 + r / 1, 1 / 12) - 1;
    }

    let currentBalance = principal;
    const schedule: AmortizationRow[] = [];
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;
    let totalExtraPaid = 0;

    const baseDate = new Date(startMonthStr || '2026-07-02');
    const currentDate = new Date(baseDate.getTime());

    // Moratorium simulation
    for (let m = 1; m <= moratorium; m++) {
      const interestAccrued = currentBalance * r_eff;
      currentBalance += interestAccrued;

      schedule.push({
        monthIndex: m,
        date: this.formatDate(currentDate),
        emi: 0,
        principalPaid: 0,
        interestPaid: interestAccrued,
        extraPayment: 0,
        outstandingBalance: currentBalance,
        isMoratorium: true
      });
      totalInterestPaid += interestAccrued;
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Recalculate EMI based on final principal and remaining tenure
    const remainingTenure = tenureMonths;
    let baseEmi = 0;
    if (remainingTenure > 0 && currentBalance > 0) {
      if (r_eff === 0) {
        baseEmi = currentBalance / remainingTenure;
      } else {
        baseEmi = (currentBalance * r_eff * Math.pow(1 + r_eff, remainingTenure)) / (Math.pow(1 + r_eff, remainingTenure) - 1);
      }
    }

    if (Number.isNaN(baseEmi) || !Number.isFinite(baseEmi)) {
      baseEmi = 0;
    }

    let mIndex = moratorium + 1;
    let loopCount = 0;

    while (currentBalance > 0.01 && loopCount < 600) {
      loopCount++;
      const monthOfAmortization = mIndex - moratorium;
      const interestPaid = currentBalance * r_eff;

      let emi = Math.min(baseEmi, currentBalance + interestPaid);
      if (emi < interestPaid) {
        emi = interestPaid + Math.min(baseEmi - interestPaid, currentBalance);
      }

      let principalPaid = Math.max(0, emi - interestPaid);
      if (principalPaid > currentBalance) {
        principalPaid = currentBalance;
        emi = principalPaid + interestPaid;
      }

      currentBalance -= principalPaid;

      // Part prepayments check
      let extraPayment = 0;
      if (monthlyExtra > 0 && currentBalance > 0) {
        const amt = Math.min(monthlyExtra, currentBalance);
        extraPayment += amt;
        currentBalance -= amt;
      }
      if (annualPrepPercent > 0 && monthOfAmortization % 12 === 0 && currentBalance > 0) {
        const annualPrepAmt = (principal * annualPrepPercent) / 100;
        const amt = Math.min(annualPrepAmt, currentBalance);
        extraPayment += amt;
        currentBalance -= amt;
      }
      if (oneTimePrep > 0 && monthOfAmortization === oneTimeMonth && currentBalance > 0) {
        const amt = Math.min(oneTimePrep, currentBalance);
        extraPayment += amt;
        currentBalance -= amt;
      }

      schedule.push({
        monthIndex: mIndex,
        date: this.formatDate(currentDate),
        emi,
        principalPaid,
        interestPaid,
        extraPayment,
        outstandingBalance: Math.max(0, currentBalance),
        isMoratorium: false
      });

      totalInterestPaid += interestPaid;
      totalPrincipalPaid += principalPaid;
      totalExtraPaid += extraPayment;

      currentDate.setMonth(currentDate.getMonth() + 1);
      mIndex++;

      if (currentBalance <= 0) break;
    }

    const totalRepayment = totalPrincipalPaid + totalInterestPaid + totalExtraPaid;

    return {
      baseEmi,
      totalInterestPaid,
      totalPrincipalPaid,
      totalExtraPaid,
      totalRepayment,
      totalUpfrontCharges,
      totalCostOfLoan: totalRepayment + totalUpfrontCharges,
      schedule,
      completionDate: schedule.length > 0 ? schedule[schedule.length - 1].date : 'N/A'
    };
  }

  // ----------------------------------------------------
  // CENTRAL REAL-TIME CALCULATION HUB
  // ----------------------------------------------------
  readonly calculatedResults = computed<CalculatorResults>(() => {
    const activeTab = this.activeTab();
    const startDateStr = this.advStartDate() || '2026-07-02';

    const advOpts = {
      processingFeePercent: this.advProcessingFee(),
      insurance: this.advInsurance(),
      gstPercent: this.advGst(),
      compounding: this.advCompounding(),
      moratoriumMonths: this.advMoratorium(),
      monthlyExtraPayment: this.advMonthlyExtraPayment(),
      annualPrepaymentPercent: this.advAnnualPrepayment(),
      oneTimePrepayment: this.advOneTimePrepayment(),
      oneTimePrepaymentMonth: this.advOneTimeMonth()
    };

    if (activeTab === 'emi') {
      const principal = this.loanAmount();
      const rate = this.interestRate();
      const tenureVal = this.loanTenure();
      const tType = this.tenureType();
      const tenureMonths = tType === 'years' ? tenureVal * 12 : tenureVal;

      return this.calculateAmortizationSchedule(principal, rate, tenureMonths, startDateStr, advOpts);
    }

    if (activeTab === 'eligibility') {
      const income = this.eligMonthlyIncome();
      const existing = this.eligExistingEmis();
      const rate = this.eligInterestRate();
      const tenureVal = this.eligTenure();
      const tenureMonths = tenureVal * 12;

      const maxEmi = Math.max(0, (income * 0.50) - existing);
      if (maxEmi <= 0) {
        return {
          baseEmi: 0,
          totalInterestPaid: 0,
          totalPrincipalPaid: 0,
          totalExtraPaid: 0,
          totalRepayment: 0,
          totalUpfrontCharges: 0,
          totalCostOfLoan: 0,
          schedule: [],
          completionDate: 'N/A',
          maxLoanEligibility: 0,
          suggestedEmi: 0,
          dtiRatio: (existing / (income || 1)) * 100
        };
      }

      const r = rate / 100 / 12;
      let maxLoan = 0;
      if (r === 0) {
        maxLoan = maxEmi * tenureMonths;
      } else {
        maxLoan = (maxEmi * (Math.pow(1 + r, tenureMonths) - 1)) / (r * Math.pow(1 + r, tenureMonths));
      }

      const res = this.calculateAmortizationSchedule(maxLoan, rate, tenureMonths, startDateStr, advOpts);
      return {
        ...res,
        maxLoanEligibility: maxLoan,
        suggestedEmi: maxEmi,
        dtiRatio: ((existing + maxEmi) / (income || 1)) * 100
      };
    }

    if (activeTab === 'affordability') {
      const income = this.affMonthlyIncome();
      const expenses = this.affExpenses();
      const savings = this.affSavingsGoal();
      const rate = this.affInterestRate();
      const tenureVal = this.affTenure();
      const tenureMonths = tenureVal * 12;

      const affordableEmi = Math.max(0, income - expenses - savings);
      let affordableLoan = 0;
      if (affordableEmi > 0) {
        const r = rate / 100 / 12;
        if (r === 0) {
          affordableLoan = affordableEmi * tenureMonths;
        } else {
          affordableLoan = (affordableEmi * (Math.pow(1 + r, tenureMonths) - 1)) / (r * Math.pow(1 + r, tenureMonths));
        }
      }

      const ratio = income > 0 ? (affordableEmi / income) : 0;
      const riskLevel = ratio > 0.45 ? 'High Risk' : ratio > 0.25 ? 'Moderate Risk' : 'Low Risk';

      const res = this.calculateAmortizationSchedule(affordableLoan, rate, tenureMonths, startDateStr, advOpts);
      return {
        ...res,
        affordableEmi,
        affordableLoan,
        riskLevel
      };
    }

    if (activeTab === 'loan_amount') {
      const targetEmi = this.amtDesiredEmi();
      const rate = this.amtInterestRate();
      const tenureVal = this.amtTenure();
      const tenureMonths = tenureVal * 12;

      const r = rate / 100 / 12;
      let maxLoan = 0;
      if (r === 0) {
        maxLoan = targetEmi * tenureMonths;
      } else {
        maxLoan = (targetEmi * (Math.pow(1 + r, tenureMonths) - 1)) / (r * Math.pow(1 + r, tenureMonths));
      }

      const res = this.calculateAmortizationSchedule(maxLoan, rate, tenureMonths, startDateStr, advOpts);
      return {
        ...res,
        maxLoanEligibility: maxLoan,
        suggestedEmi: targetEmi
      };
    }

    if (activeTab === 'tenure') {
      const principal = this.tenAmount();
      const rate = this.tenInterestRate();
      const targetEmi = this.tenDesiredEmi();

      const r = rate / 100 / 12;
      let tenureMonths = 0;
      let errorMsg = '';

      if (r > 0 && targetEmi <= principal * r) {
        errorMsg = 'Desired EMI must be greater than monthly interest. Try a larger EMI.';
        tenureMonths = 360;
      } else {
        if (r === 0) {
          tenureMonths = targetEmi > 0 ? Math.ceil(principal / targetEmi) : 360;
        } else {
          tenureMonths = Math.ceil(
            Math.log(targetEmi / (targetEmi - principal * r)) / Math.log(1 + r)
          );
        }
      }

      const res = this.calculateAmortizationSchedule(principal, rate, tenureMonths, startDateStr, advOpts);
      return {
        ...res,
        tenureMonths,
        errorMsg
      };
    }

    if (activeTab === 'interest_rate') {
      const principal = this.rateAmount();
      const targetEmi = this.rateEmi();
      const tenureVal = this.rateTenure();
      const tenureMonths = tenureVal * 12;

      let low = 0.001;
      let high = 100.0;
      let solvedRate = 8.5;

      if (targetEmi > principal / tenureMonths) {
        for (let i = 0; i < 40; i++) {
          const mid = (low + high) / 2;
          const r = mid / 100 / 12;
          const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);

          if (emi > targetEmi) {
            high = mid;
          } else {
            low = mid;
          }
        }
        solvedRate = (low + high) / 2;
      } else {
        solvedRate = 0;
      }

      const res = this.calculateAmortizationSchedule(principal, solvedRate, tenureMonths, startDateStr, advOpts);
      return {
        ...res,
        solvedRate,
        apr: solvedRate + (res.totalUpfrontCharges / principal) * 100
      };
    }

    if (activeTab === 'prepayment') {
      const principal = this.prepCurrentLoan();
      const rate = this.prepInterestRate();
      const remainingMonths = this.prepRemainingTenure();
      const prepayment = this.prepOneTimeAmount();

      const baseRes = this.calculateAmortizationSchedule(principal, rate, remainingMonths, startDateStr, {
        ...advOpts,
        oneTimePrepayment: 0
      });

      const prepRes = this.calculateAmortizationSchedule(principal, rate, remainingMonths, startDateStr, {
        ...advOpts,
        oneTimePrepayment: prepayment,
        oneTimePrepaymentMonth: 1
      });

      const interestSaved = Math.max(0, baseRes.totalInterestPaid - prepRes.totalInterestPaid);
      const monthsSaved = Math.max(0, baseRes.schedule.length - prepRes.schedule.length);

      return {
        ...prepRes,
        interestSaved,
        monthsSaved,
        originalInterest: baseRes.totalInterestPaid,
        originalRepayment: baseRes.totalRepayment
      };
    }

    if (activeTab === 'emi_reduction') {
      const outstanding = this.redEmiOutstanding();
      const prepayment = this.redEmiExtraPayment();
      const tenureVal = this.redEmiTenure();
      const tenureMonths = tenureVal * 12;
      const rate = this.redEmiInterest();

      const baseRes = this.calculateAmortizationSchedule(outstanding, rate, tenureMonths, startDateStr, {
        ...advOpts,
        oneTimePrepayment: 0
      });

      const adjustedPrincipal = Math.max(0, outstanding - prepayment);
      const prepRes = this.calculateAmortizationSchedule(adjustedPrincipal, rate, tenureMonths, startDateStr, advOpts);

      const interestSaved = Math.max(0, baseRes.totalInterestPaid - prepRes.totalInterestPaid);
      const emiSaved = Math.max(0, baseRes.baseEmi - prepRes.baseEmi);

      return {
        ...prepRes,
        interestSaved,
        emiSaved,
        originalEmi: baseRes.baseEmi,
        originalInterest: baseRes.totalInterestPaid
      };
    }

    if (activeTab === 'tenure_reduction') {
      const outstanding = this.redTenOutstanding();
      const rate = this.redTenInterest();
      const remainingMonths = this.redTenTenure();
      const extraMonthly = this.redTenExtraMonthly();

      const baseRes = this.calculateAmortizationSchedule(outstanding, rate, remainingMonths, startDateStr, {
        ...advOpts,
        monthlyExtraPayment: 0
      });

      const prepRes = this.calculateAmortizationSchedule(outstanding, rate, remainingMonths, startDateStr, {
        ...advOpts,
        monthlyExtraPayment: extraMonthly
      });

      const interestSaved = Math.max(0, baseRes.totalInterestPaid - prepRes.totalInterestPaid);
      const monthsSaved = Math.max(0, baseRes.schedule.length - prepRes.schedule.length);

      return {
        ...prepRes,
        interestSaved,
        monthsSaved,
        originalTenure: remainingMonths,
        originalInterest: baseRes.totalInterestPaid
      };
    }

    if (activeTab === 'foreclosure') {
      const outstanding = this.foreOutstanding();
      const rate = this.foreInterest();
      const chargesPercent = this.foreCharges();
      const remainingMonths = this.foreRemainingMonths();

      const baseRes = this.calculateAmortizationSchedule(outstanding, rate, remainingMonths, startDateStr, advOpts);

      const foreclosureFee = (outstanding * chargesPercent) / 100;
      const closureCost = outstanding + foreclosureFee;
      const interestSaved = Math.max(0, baseRes.totalInterestPaid);
      const netSavings = Math.max(0, interestSaved - foreclosureFee);

      return {
        ...baseRes,
        closureCost,
        interestSaved,
        foreclosureFee,
        netSavings
      };
    }

    if (activeTab === 'balance_transfer') {
      const outstanding = this.btCurrentLoan();
      const currentRate = this.btCurrentInterest();
      const newRate = this.btNewInterest();
      const remainingTenureVal = this.btRemainingTenure();
      const remainingMonths = remainingTenureVal * 12;
      const fee = this.btTransferFee();
      const feeType = this.btTransferFeeType();

      const baseRes = this.calculateAmortizationSchedule(outstanding, currentRate, remainingMonths, startDateStr, {
        ...advOpts,
        processingFeePercent: 0,
        insurance: 0
      });

      const transferFeeAmount = feeType === 'percent' ? (outstanding * fee) / 100 : fee;

      const transferRes = this.calculateAmortizationSchedule(outstanding, newRate, remainingMonths, startDateStr, {
        ...advOpts,
        processingFeePercent: 0,
        insurance: transferFeeAmount
      });

      const monthlySavings = Math.max(0, baseRes.baseEmi - transferRes.baseEmi);
      const interestSavings = Math.max(0, baseRes.totalInterestPaid - transferRes.totalInterestPaid);
      const netSavings = Math.max(0, interestSavings - transferFeeAmount);

      const breakEvenMonths = monthlySavings > 0 ? Math.ceil(transferFeeAmount / monthlySavings) : 0;
      const isRecommended = netSavings > 0 && breakEvenMonths < 24;

      return {
        ...transferRes,
        monthlySavings,
        interestSavings,
        netSavings,
        transferFeeAmount,
        breakEvenMonths,
        isRecommended,
        originalEmi: baseRes.baseEmi,
        originalInterest: baseRes.totalInterestPaid
      };
    }

    if (activeTab === 'comparison') {
      const amountA = this.compAmountA();
      const rateA = this.compInterestA();
      const tenureA = this.compTenureA() * 12;

      const amountB = this.compAmountB();
      const rateB = this.compInterestB();
      const tenureB = this.compTenureB() * 12;

      const resA = this.calculateAmortizationSchedule(amountA, rateA, tenureA, startDateStr, advOpts);
      const resB = this.calculateAmortizationSchedule(amountB, rateB, tenureB, startDateStr, advOpts);

      const betterLoan = resA.totalCostOfLoan <= resB.totalCostOfLoan ? 'A' : 'B';
      const totalCostSavings = Math.abs(resA.totalCostOfLoan - resB.totalCostOfLoan);

      return {
        ...resA,
        loanA: resA,
        loanB: resB,
        betterLoan,
        totalCostSavings
      };
    }

    return this.calculateAmortizationSchedule(2500000, 8.5, 180, startDateStr, advOpts);
  });

  // ----------------------------------------------------
  // DYNAMIC COMPRESSED INSIGHT GENERATOR
  // ----------------------------------------------------
  readonly insights = computed(() => {
    const activeTab = this.activeTab();
    const res = this.calculatedResults();
    const list: string[] = [];

    const interest = res.totalInterestPaid;
    const total = res.totalRepayment;

    if (total > 0) {
      const interestPercent = Math.round((interest / total) * 100);
      list.push(`You will pay ${this.formatINR(interest)} in total interest, which accounts for ${interestPercent}% of your overall repayment.`);

      if (interestPercent > 40) {
        list.push(`⚠️ Interest represents a very high share (${interestPercent}%) of your total repayment. Making prepayment or shortening the tenure can save you massive sums.`);
      } else {
        list.push(`✅ Your interest component is ${interestPercent}% of your total cost, which is financially optimal.`);
      }
    }

    if (activeTab === 'emi') {
      list.push(`Paying ₹2,000 extra each month can reduce your remaining tenure by approximately 2.5 years and save over ₹1.4 lakh in interest.`);
    } else if (activeTab === 'eligibility') {
      const dti = res.dtiRatio || 0;
      if (dti > 45) {
        list.push(`⚠️ Your potential Debt-to-Income (DTI) ratio is ${dti.toFixed(1)}%. This exceeds the recommended 40% threshold; banks might require a longer tenure or co-applicant.`);
      } else {
        list.push(`✅ Your potential Debt-to-Income (DTI) ratio is an excellent ${dti.toFixed(1)}%, ensuring very high chances of instant banking approval.`);
      }
    } else if (activeTab === 'affordability') {
      const risk = res.riskLevel;
      if (risk === 'High Risk') {
        list.push(`⚠️ This loan size is High Risk! It leaves you with minimal buffer after meeting your living expenses and savings targets.`);
      } else {
        list.push(`✅ Healthy Budget: This loan is fully affordable and leaves a safe buffer for your routine financial goals.`);
      }
    } else if (activeTab === 'prepayment') {
      const saved = res.interestSaved || 0;
      const months = res.monthsSaved || 0;
      if (saved > 0) {
        list.push(`🎉 Prepaying ₹${this.formatNumber(res.totalExtraPaid || 0)} immediately saves you ${this.formatINR(saved)} in interest and pays off your loan ${months} months earlier!`);
      }
    } else if (activeTab === 'balance_transfer') {
      const rec = res.isRecommended;
      const bEven = res.breakEvenMonths || 0;
      const net = res.netSavings || 0;
      if (rec) {
        list.push(`🚀 Refinance Recommended: Switching saves you ${this.formatINR(net)} net after all charges, breaking even in just ${bEven} months!`);
      } else if (net > 0) {
        list.push(`⚠️ Moderate Savings: Net savings are only ${this.formatINR(net)} with a ${bEven}-month break-even. Refinance only if keeping the loan long-term.`);
      } else {
        list.push(`❌ Do Not Refinance: Transfer fees and upfront charges exceed your interest savings. Balance transfer is not financially viable.`);
      }
    } else if (activeTab === 'comparison') {
      const better = res.betterLoan;
      const saved = res.totalCostSavings || 0;
      list.push(`📊 Option ${better} is more cost-effective, saving you a total of ${this.formatINR(saved)} over the full tenure.`);
    }

    return list;
  });

  // ----------------------------------------------------
  // HIGH-FIDELITY SVG INTERACTIVE CHART SIGNAL BUILDERS
  // ----------------------------------------------------

  // Donut Chart Calculations (Principal vs Interest)
  readonly principalPercent = computed(() => {
    const res = this.calculatedResults();
    const total = res.totalPrincipalPaid + res.totalInterestPaid;
    if (total === 0) return 100;
    return (res.totalPrincipalPaid / total) * 100;
  });

  readonly interestPercent = computed(() => {
    const res = this.calculatedResults();
    const total = res.totalPrincipalPaid + res.totalInterestPaid;
    if (total === 0) return 0;
    return (res.totalInterestPaid / total) * 100;
  });

  readonly principalDashArray = computed(() => {
    const percent = this.principalPercent();
    const circ = 2 * Math.PI * 40; // radius = 40, circ = 251.327
    return `${(percent / 100) * circ} ${circ}`;
  });

  readonly interestDashArray = computed(() => {
    const percent = this.interestPercent();
    const circ = 2 * Math.PI * 40;
    return `${(percent / 100) * circ} ${circ}`;
  });

  readonly interestDashOffset = computed(() => {
    const pPercent = this.principalPercent();
    const circ = 2 * Math.PI * 40;
    return -((pPercent / 100) * circ);
  });

  // Balance Line Chart Coordinates Generator (Outstanding over time)
  readonly lineChartPoints = computed(() => {
    const res = this.calculatedResults();
    const schedule = res.schedule;
    if (schedule.length === 0) return [];

    const totalPoints = 12;
    const sampledPoints: AmortizationRow[] = [];
    const step = Math.max(1, Math.floor(schedule.length / totalPoints));

    for (let i = 0; i < totalPoints; i++) {
      const idx = Math.min(schedule.length - 1, i * step);
      sampledPoints.push(schedule[idx]);
    }
    if (schedule.length > 0 && sampledPoints[sampledPoints.length - 1] !== schedule[schedule.length - 1]) {
      sampledPoints.push(schedule[schedule.length - 1]);
    }

    const maxBalance = Math.max(...schedule.map((s: AmortizationRow) => s.outstandingBalance), 1);
    const width = 450;
    const height = 180;
    const paddingX = 40;
    const paddingY = 20;

    return sampledPoints.map((item: AmortizationRow, idx: number) => {
      const x = paddingX + (idx / (sampledPoints.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - (item.outstandingBalance / maxBalance) * (height - 2 * paddingY);
      return { x, y, balance: item.outstandingBalance, label: item.date };
    });
  });

  readonly linePathD = computed(() => {
    const pts = this.lineChartPoints();
    if (pts.length === 0) return '';
    return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  });

  readonly areaPathD = computed(() => {
    const pts = this.lineChartPoints();
    if (pts.length === 0) return '';
    const height = 180;
    const paddingY = 20;
    const lastX = pts[pts.length - 1].x;
    const firstX = pts[0].x;
    return `${this.linePathD()} L ${lastX} ${height - paddingY} L ${firstX} ${height - paddingY} Z`;
  });

  // Stacked Bar Chart Coordinates Generator (Annual Repayments breakup)
  readonly annualBreakdown = computed(() => {
    const res = this.calculatedResults();
    const schedule = res.schedule;
    if (schedule.length === 0) return [];

    const yearlyData: Record<string, { year: string, principalPaid: number, interestPaid: number }> = {};

    schedule.forEach((item: AmortizationRow) => {
      const parts = item.date.split(' ');
      const year = parts[parts.length - 1] || 'Unknown';
      if (!yearlyData[year]) {
        yearlyData[year] = { year, principalPaid: 0, interestPaid: 0 };
      }
      yearlyData[year].principalPaid += item.principalPaid;
      yearlyData[year].interestPaid += item.interestPaid;
    });

    return Object.values(yearlyData).slice(0, 15);
  });

  readonly barChartData = computed(() => {
    const years = this.annualBreakdown();
    if (years.length === 0) return [];

    const maxYearlyCost = Math.max(...years.map(y => y.principalPaid + y.interestPaid), 1);
    const width = 450;
    const height = 180;
    const paddingX = 45;
    const paddingY = 20;

    const barWidth = Math.max(12, Math.floor((width - 2 * paddingX) / years.length) - 8);
    const colSpacing = (width - 2 * paddingX) / years.length;

    return years.map((item, idx) => {
      const x = paddingX + idx * colSpacing + (colSpacing - barWidth) / 2;
      const principalHeight = ((item.principalPaid) / maxYearlyCost) * (height - 2 * paddingY);
      const interestHeight = ((item.interestPaid) / maxYearlyCost) * (height - 2 * paddingY);

      const pY = height - paddingY - principalHeight;
      const iY = pY - interestHeight;

      return {
        year: item.year,
        x,
        barWidth,
        pY,
        pHeight: principalHeight,
        iY,
        iHeight: interestHeight,
        principal: item.principalPaid,
        interest: item.interestPaid,
        total: item.principalPaid + item.interestPaid
      };
    });
  });

  // ----------------------------------------------------
  // AMORTIZATION TABLE FILTERING, PAGINATION & ACTIONS
  // ----------------------------------------------------
  readonly availableYears = computed(() => {
    const res = this.calculatedResults();
    const years = new Set<string>();
    res.schedule.forEach((item: AmortizationRow) => {
      const parts = item.date.split(' ');
      const year = parts[parts.length - 1];
      if (year) years.add(year);
    });
    return Array.from(years).sort();
  });

  readonly filteredSchedule = computed(() => {
    const res = this.calculatedResults();
    const query = this.scheduleSearchQuery().toLowerCase().trim();
    const year = this.scheduleYearFilter();

    return res.schedule.filter((item: AmortizationRow) => {
      const matchQuery = !query || item.date.toLowerCase().includes(query) || item.monthIndex.toString() === query;
      const matchYear = year === 'all' || item.date.endsWith(year);
      return matchQuery && matchYear;
    });
  });

  readonly paginatedSchedule = computed(() => {
    const list = this.filteredSchedule();
    const page = this.currentPage();
    const size = 12;
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  readonly totalPages = computed(() => {
    const list = this.filteredSchedule();
    return Math.ceil(list.length / 12) || 1;
  });

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  jumpToFirstPage() {
    this.currentPage.set(1);
  }

  exportToCSV() {
    const res = this.calculatedResults();
    const schedule = res.schedule;
    if (schedule.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Month,Date,EMI,Principal,Interest,Extra Prepayment,Outstanding Balance\n';

    schedule.forEach((row: AmortizationRow) => {
      csvContent += `${row.monthIndex},${row.date},${row.emi.toFixed(2)},${row.principalPaid.toFixed(2)},${row.interestPaid.toFixed(2)},${row.extraPayment.toFixed(2)},${row.outstandingBalance.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Amortization_Schedule_${this.activeTab()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToastMessage('CSV exported successfully!');
  }

  copySchedule() {
    const res = this.calculatedResults();
    const schedule = res.schedule;
    if (schedule.length === 0) return;

    let text = 'Month\tDate\tEMI\tPrincipal\tInterest\tExtra Paid\tOutstanding Balance\n';
    schedule.slice(0, 50).forEach((row: AmortizationRow) => {
      text += `${row.monthIndex}\t${row.date}\t${row.emi.toFixed(0)}\t${row.principalPaid.toFixed(0)}\t${row.interestPaid.toFixed(0)}\t${row.extraPayment.toFixed(0)}\t${row.outstandingBalance.toFixed(0)}\n`;
    });
    if (schedule.length > 50) {
      text += `... and ${schedule.length - 50} more months.`;
    }

    this.copyToClipboard(text, 'Amortization schedule (first 50 months)');
  }

  copyToClipboard(text: string, label = 'Results') {
    navigator.clipboard.writeText(text).then(() => {
      this.showToastMessage(`${label} copied to clipboard!`);
    }).catch(() => {
      this.showToastMessage('Failed to copy to clipboard.');
    });
  }

  resetAllInputs() {
    const tab = this.activeTab();
    this.showToastMessage('Calculator reset to premium defaults!');

    if (tab === 'emi') {
      this.loanAmount.set(2500000);
      this.interestRate.set(8.5);
      this.loanTenure.set(15);
      this.tenureType.set('years');
    } else if (tab === 'eligibility') {
      this.eligMonthlyIncome.set(100000);
      this.eligExistingEmis.set(15000);
      this.eligInterestRate.set(8.5);
      this.eligTenure.set(20);
    } else if (tab === 'affordability') {
      this.affMonthlyIncome.set(100000);
      this.affExpenses.set(40000);
      this.affSavingsGoal.set(20000);
      this.affInterestRate.set(8.5);
      this.affTenure.set(15);
    } else if (tab === 'loan_amount') {
      this.amtDesiredEmi.set(25000);
      this.amtInterestRate.set(8.5);
      this.amtTenure.set(15);
    } else if (tab === 'tenure') {
      this.tenAmount.set(2000000);
      this.tenInterestRate.set(8.5);
      this.tenDesiredEmi.set(25000);
    } else if (tab === 'interest_rate') {
      this.rateAmount.set(1500000);
      this.rateEmi.set(18000);
      this.rateTenure.set(10);
    } else if (tab === 'prepayment') {
      this.prepCurrentLoan.set(3000000);
      this.prepRemainingTenure.set(120);
      this.prepInterestRate.set(8.5);
      this.prepOneTimeAmount.set(300000);
    } else if (tab === 'emi_reduction') {
      this.redEmiOutstanding.set(2000000);
      this.redEmiInterest.set(8.5);
      this.redEmiTenure.set(10);
      this.redEmiCurrentEmi.set(25000);
      this.redEmiExtraPayment.set(200000);
    } else if (tab === 'tenure_reduction') {
      this.redTenOutstanding.set(2000000);
      this.redTenInterest.set(8.5);
      this.redTenTenure.set(120);
      this.redTenExtraMonthly.set(2000);
    } else if (tab === 'foreclosure') {
      this.foreOutstanding.set(1500000);
      this.foreInterest.set(8.5);
      this.foreCharges.set(2);
      this.foreRemainingMonths.set(80);
    } else if (tab === 'balance_transfer') {
      this.btCurrentLoan.set(2500000);
      this.btCurrentInterest.set(9.5);
      this.btNewInterest.set(8.2);
      this.btRemainingTenure.set(15);
      this.btTransferFee.set(1);
      this.btTransferFeeType.set('percent');
    } else if (tab === 'comparison') {
      this.compAmountA.set(2000000);
      this.compInterestA.set(8.5);
      this.compTenureA.set(15);
      this.compAmountB.set(2000000);
      this.compInterestB.set(8.0);
      this.compTenureB.set(15);
    }

    // Reset advanced options to pristine state
    this.advProcessingFee.set(0.5);
    this.advInsurance.set(0);
    this.advGst.set(18);
    this.advAnnualPrepayment.set(0);
    this.advMonthlyExtraPayment.set(0);
    this.advOneTimePrepayment.set(0);
    this.advOneTimeMonth.set(12);
    this.advStartDate.set('2026-07-02');
    this.advCompounding.set('monthly');
    this.advMoratorium.set(0);

    this.currentPage.set(1);
  }

  selectCalculator(id: string) {
    this.activeTab.set(id);
    this.currentPage.set(1);
    this.scheduleSearchQuery.set('');
    this.scheduleYearFilter.set('all');
  }
}
