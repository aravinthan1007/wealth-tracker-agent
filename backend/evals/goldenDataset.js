'use strict'

/**
 * Golden Dataset — 20 labeled examples for WealthTrack eval suite.
 *
 * Principle: only eval LLM outputs.
 *   - groundedness  → does the answer match tool data? (no hallucination)
 *   - correctness   → does the answer get the facts right?
 *   - soundness     → does the advice follow sound financial principles?
 *   - toolSelection → did the agent call the right tools? (code-level, no LLM)
 *
 * Grounded in mock data:
 *   Income:       $17,000/mo (2× $8,500 salary)
 *   Expenses:     ~$3,446/mo (7 categories)
 *   Surplus:      ~$13,554/mo
 *   Net worth:    ~-$239,695  (assets $15,305 – liabilities $255,000)
 *   Credit cards: Chase Sapphire 22.99% APR $2,341, Citi 19.99% APR $980, Amex $6,200
 *   Utilization:  ~27%  ($8,920 / $33,000 limit)
 *   Stocks:       AAPL, MSFT, TSLA, GOOGL
 */

module.exports = [

  // ── GROUNDEDNESS ──────────────────────────────────────────────────────────
  {
    id: 'gs-001',
    category: 'groundedness',
    evalTypes: ['groundedness', 'correctness'],
    question: 'What is my current net worth?',
    expectedTools: ['get_networth'],
    mustContain: ['net worth', 'liabilit', 'asset'],
    mustNotContain: ["don't know", 'unable to access'],
    expectedFacts:
      'Net worth is negative, around -$239,695. Assets ~$15,305, Liabilities ~$255,000. The answer must not fabricate a positive net worth.',
    notes: 'Core groundedness — net worth is negative; agent must not hallucinate a positive value',
  },
  {
    id: 'gs-002',
    category: 'groundedness',
    evalTypes: ['groundedness', 'correctness'],
    question: 'How much do I earn every month?',
    expectedTools: ['get_income'],
    mustContain: ['17,000', '$17'],
    mustNotContain: [],
    expectedFacts:
      'Monthly income is approximately $17,000 from two salary sources of $8,500 each. Must not understate or overstate.',
    notes: 'Income groundedness',
  },
  {
    id: 'gs-003',
    category: 'groundedness',
    evalTypes: ['groundedness'],
    question: 'Break down my monthly expenses by category.',
    expectedTools: ['get_expenses'],
    mustContain: ['expense', 'month'],
    mustNotContain: [],
    expectedFacts:
      'Total monthly expenses around $3,446 across 7 categories. Category amounts must come from tool data, not be fabricated.',
    notes: 'Expense groundedness — amounts must match tool output',
  },
  {
    id: 'gs-004',
    category: 'groundedness',
    evalTypes: ['groundedness', 'correctness'],
    question: 'What are my credit card balances and interest rates?',
    expectedTools: ['get_credit_cards'],
    mustContain: ['Chase', 'APR'],
    mustNotContain: [],
    expectedFacts:
      '3 cards: Chase Sapphire 22.99% APR ~$2,341 balance; Citi Double Cash 19.99% APR ~$980 balance; Amex ~$6,200. Total ~$8,920. APR values must not be fabricated.',
    notes: 'Credit card groundedness — APR values must match data exactly',
  },
  {
    id: 'gs-005',
    category: 'groundedness',
    evalTypes: ['groundedness'],
    question: 'What stocks am I holding and what are their current prices?',
    expectedTools: ['get_networth', 'get_stock_quotes'],
    mustContain: ['AAPL', 'MSFT'],
    mustNotContain: [],
    expectedFacts:
      'Holds AAPL, MSFT, TSLA, GOOGL. Prices from Yahoo Finance or mock. Must not fabricate tickers or prices not in the data.',
    notes: 'Stock groundedness — must use real tool data for prices',
  },
  {
    id: 'gs-006',
    category: 'groundedness',
    evalTypes: ['groundedness', 'correctness'],
    question: 'What is my credit card utilization rate?',
    expectedTools: ['get_credit_cards'],
    mustContain: ['27', '%', 'utiliz'],
    mustNotContain: [],
    expectedFacts:
      'Credit utilization is approximately 27% ($8,920 balance / $33,000 total limit). Specific percentage must match the calculation.',
    notes: 'Utilization groundedness — must report the number from tool data',
  },
  {
    id: 'gs-007',
    category: 'groundedness',
    evalTypes: ['groundedness', 'correctness'],
    question: 'How much monthly surplus do I have after paying all my expenses?',
    expectedTools: ['get_income', 'get_expenses'],
    mustContain: ['13'],
    mustNotContain: [],
    expectedFacts:
      'Surplus = income ($17,000) – expenses (~$3,446) = ~$13,554/mo. Must derive from tool data and not confuse surplus with income.',
    notes: 'Surplus calculation groundedness',
  },
  {
    id: 'gs-008',
    category: 'groundedness',
    evalTypes: ['groundedness'],
    question: 'What is my total debt across all accounts?',
    expectedTools: ['get_networth'],
    mustContain: ['255,000', 'liabilit'],
    mustNotContain: [],
    expectedFacts:
      'Total liabilities ~$255,000 including mortgage, loans, and credit cards. Must not understate.',
    notes: 'Debt groundedness — total liabilities from net worth tool',
  },

  // ── CORRECTNESS ──────────────────────────────────────────────────────────
  {
    id: 'co-001',
    category: 'correctness',
    evalTypes: ['correctness'],
    question: 'Which of my credit cards has the highest interest rate?',
    expectedTools: ['get_credit_cards'],
    mustContain: ['Chase', '22.99'],
    mustNotContain: ['Citi is the highest', 'Amex is the highest'],
    expectedFacts:
      'Chase Sapphire has the highest APR at 22.99%. Citi is second at 19.99%. Must identify Chase as the answer.',
    notes: 'Correctness — must identify the correct card',
  },
  {
    id: 'co-002',
    category: 'correctness',
    evalTypes: ['correctness'],
    question: 'Is my net worth positive or negative?',
    expectedTools: ['get_networth'],
    mustContain: ['negative'],
    mustNotContain: ['positive net worth', 'net worth is positive'],
    expectedFacts:
      'Net worth is NEGATIVE at approximately -$239,695. The agent must not get the polarity wrong.',
    notes: 'Binary correctness — critical not to state positive net worth',
  },
  {
    id: 'co-003',
    category: 'correctness',
    evalTypes: ['correctness'],
    question: 'Do I have more assets or more liabilities?',
    expectedTools: ['get_networth'],
    mustContain: ['liabilit'],
    mustNotContain: ['more assets', 'assets exceed'],
    expectedFacts:
      'Liabilities (~$255,000) far exceed assets (~$15,305). Agent must state liabilities are greater.',
    notes: 'Comparison correctness — must correctly identify larger category',
  },
  {
    id: 'co-004',
    category: 'correctness',
    evalTypes: ['correctness'],
    question: 'What percentage of my monthly income goes to expenses?',
    expectedTools: ['get_income', 'get_expenses'],
    mustContain: ['20'],
    mustNotContain: ['50%', '80%', '60%'],
    expectedFacts:
      'Expenses ~$3,446 / Income $17,000 ≈ 20.3%. Must report approximately 20%, not 50% or 80%.',
    notes: 'Ratio correctness — approx 20%',
  },
  {
    id: 'co-005',
    category: 'correctness',
    evalTypes: ['correctness'],
    question: 'How many credit cards do I have?',
    expectedTools: ['get_credit_cards'],
    mustContain: ['3'],
    mustNotContain: ['2 cards', '4 cards', 'two cards', 'four cards'],
    expectedFacts:
      '3 credit cards: Chase Sapphire, Citi Double Cash, and Amex. Must state exactly 3.',
    notes: 'Count correctness',
  },

  // ── FINANCIAL SOUNDNESS ──────────────────────────────────────────────────
  {
    id: 'fs-001',
    category: 'soundness',
    evalTypes: ['soundness'],
    question: 'I have $13,000 surplus every month. Should I put it all into the stock market right now?',
    expectedTools: ['get_networth', 'get_credit_cards'],
    mustContain: [],
    mustNotContain: ['yes, invest it all', 'put everything in stocks', 'absolutely, invest all'],
    expectedFacts:
      'Sound advice: build emergency fund first, pay off high-APR debt (Chase 22.99%) before investing, diversify, include disclaimer that this is not personalized financial advice.',
    notes: 'Goal-sequencing soundness — emergency fund and debt before investing',
  },
  {
    id: 'fs-002',
    category: 'soundness',
    evalTypes: ['soundness'],
    question: 'Should I pay only the minimum payment on my Chase credit card?',
    expectedTools: ['get_credit_cards'],
    mustContain: [],
    mustNotContain: ['yes, minimum is fine', 'minimum payment is okay'],
    expectedFacts:
      'Sound advice: explain that 22.99% APR makes minimum payments very costly, recommend paying more than minimum, calculate the interest cost impact. Must strongly discourage minimum-only payment.',
    notes: 'Debt soundness — must not endorse minimum payment on 22.99% APR',
  },
  {
    id: 'fs-003',
    category: 'soundness',
    evalTypes: ['soundness'],
    question: 'I want to retire at age 45. What should I do?',
    expectedTools: ['get_income', 'get_expenses', 'get_networth'],
    mustContain: [],
    mustNotContain: [],
    expectedFacts:
      'Sound advice for FIRE: mention high savings rate needed, current negative net worth as a major challenge to address first, need to build substantial assets, healthcare gap before Medicare, and recommend professional financial planning.',
    notes: 'Retirement planning soundness — must address negative net worth reality',
  },
  {
    id: 'fs-004',
    category: 'soundness',
    evalTypes: ['soundness'],
    question: 'Should I put all my savings into a single stock like NVDA?',
    expectedTools: ['get_networth'],
    mustContain: [],
    mustNotContain: ['yes, great idea', 'nvda will definitely', 'guaranteed to'],
    expectedFacts:
      'Must strongly recommend against concentration risk. Mention diversification, single-stock volatility, index funds as alternative. Must NOT predict stock performance or guarantee returns.',
    notes: 'Diversification soundness — must warn against concentration risk',
  },
  {
    id: 'fs-005',
    category: 'soundness',
    evalTypes: ['soundness'],
    question: 'How should I prioritize: emergency fund, paying off debt, or investing?',
    expectedTools: ['get_credit_cards', 'get_income', 'get_expenses'],
    mustContain: [],
    mustNotContain: [],
    expectedFacts:
      'Correct order: (1) emergency fund 3–6 months, (2) high-APR debt payoff (Chase 22.99% beats any investment return), (3) then investing. Must follow the standard financial waterfall, not reverse it.',
    notes: 'Goal-sequencing soundness — must match the financial waterfall policy',
  },
  {
    id: 'fs-006',
    category: 'soundness',
    evalTypes: ['soundness'],
    question: 'Is my overall financial situation healthy?',
    expectedTools: ['get_networth', 'get_income', 'get_expenses', 'get_credit_cards'],
    mustContain: [],
    mustNotContain: ['perfectly healthy', 'no concerns', 'everything looks great'],
    expectedFacts:
      'Balanced assessment required. Positives: high income ($17k/mo), low expense ratio (20%), $13.5k monthly surplus. Concerns: negative net worth (-$239,695), high-APR credit card debt. Should acknowledge both without being dismissive.',
    notes: 'Balanced assessment — must not ignore the negative net worth',
  },
  {
    id: 'fs-007',
    category: 'soundness',
    evalTypes: ['soundness'],
    question: 'Can I comfortably afford to take on a $500/month car loan?',
    expectedTools: ['get_income', 'get_expenses', 'get_credit_cards'],
    mustContain: [],
    mustNotContain: ['yes, easily', 'definitely yes, no problem'],
    expectedFacts:
      'Cash flow: yes, $500 is small vs $13,554 surplus. But sound advice must also flag: existing high-APR card debt, negative net worth, opportunity cost of $500/mo toward debt payoff vs loan. Must not give a simple "yes, easy" without context.',
    notes: 'Affordability soundness — cash flow vs full financial picture',
  },
]
