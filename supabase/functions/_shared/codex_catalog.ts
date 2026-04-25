export type ModuleSpec = {
  track: 'markets' | 'chart' | 'risk' | 'mind' | 'craft';
  level: 1 | 2 | 3;
  slug: string;
  title_en: string;
  title_gr: string;
  ordinal: number;
};

export const LEVEL_1_SPEC: ModuleSpec[] = [
  { track:'markets', level:1, slug:'markets-01-order-types',         title_en:'Order Types & Execution',     title_gr:'Τάξις τῆς Ἀγορᾶς',  ordinal:1 },
  { track:'markets', level:1, slug:'markets-02-bid-ask-spread',      title_en:'Bid, Ask, and the Spread',    title_gr:'Διαφορά Τιμῆς',     ordinal:2 },
  { track:'markets', level:1, slug:'markets-03-session-times',       title_en:'When the Market Breathes',    title_gr:'Ὧραι Ἀγορᾶς',       ordinal:3 },
  { track:'markets', level:1, slug:'markets-04-fees-and-slippage',   title_en:'Fees, Slippage, and Friction',title_gr:'Τριβή τῆς Ἀγορᾶς',  ordinal:4 },
  { track:'chart',   level:1, slug:'chart-01-candle-anatomy',        title_en:'Candle Anatomy',              title_gr:'Ἀνατομία τοῦ Κηροῦ', ordinal:1 },
  { track:'chart',   level:1, slug:'chart-02-trend-channels',        title_en:'Trend and Channel',           title_gr:'Πορεία καὶ Δίοδος',  ordinal:2 },
  { track:'chart',   level:1, slug:'chart-03-support-resistance',    title_en:'Support and Resistance',      title_gr:'Στήριξις καὶ Ἀντίστασις', ordinal:3 },
  { track:'chart',   level:1, slug:'chart-04-breakout-patterns',     title_en:'Breakouts and Failures',      title_gr:'Διαρρήξεις',         ordinal:4 },
  { track:'risk',    level:1, slug:'risk-01-position-sizing',        title_en:'Position Sizing 101',         title_gr:'Μέτρον τῆς Θέσεως',  ordinal:1 },
  { track:'risk',    level:1, slug:'risk-02-risk-reward',            title_en:'Risk to Reward',              title_gr:'Λόγος Κινδύνου',     ordinal:2 },
  { track:'risk',    level:1, slug:'risk-03-stop-loss-mechanics',    title_en:'Where the Stop Goes',         title_gr:'Ἐσχάτη Γραμμή',      ordinal:3 },
  { track:'risk',    level:1, slug:'risk-04-portfolio-heat',         title_en:'Portfolio Heat',              title_gr:'Θερμότης Στόλου',    ordinal:4 },
  { track:'mind',    level:1, slug:'mind-01-four-biases',            title_en:'The Four Biases',             title_gr:'Τέσσερες Πλάναι',    ordinal:1 },
  { track:'mind',    level:1, slug:'mind-02-loss-aversion',          title_en:'Loss Aversion',               title_gr:'Φόβος Ζημίας',       ordinal:2 },
  { track:'mind',    level:1, slug:'mind-03-recency-bias',           title_en:'Recency Bias',                title_gr:'Πρόσφατος Πλάνη',    ordinal:3 },
  { track:'mind',    level:1, slug:'mind-04-tilt-recovery',          title_en:'Tilt and Recovery',           title_gr:'Παράνοια καὶ Σωφροσύνη', ordinal:4 },
  { track:'craft',   level:1, slug:'craft-01-what-is-playbook',      title_en:'What is a Playbook?',         title_gr:'Τί ἔστι Τακτικόν;',  ordinal:1 },
  { track:'craft',   level:1, slug:'craft-02-trade-journal',         title_en:'The Journal Discipline',      title_gr:'Βίβλος Ἐργασίας',    ordinal:2 },
  { track:'craft',   level:1, slug:'craft-03-review-rituals',        title_en:'Review Rituals',              title_gr:'Θεάσεις',            ordinal:3 },
  { track:'craft',   level:1, slug:'craft-04-pattern-of-one',        title_en:'The Pattern of One',          title_gr:'Ἓν Πρότυπον',        ordinal:4 },
];
