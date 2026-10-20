// User status / market tags shown on the profile (multi-select, max 5).
// Ids must stay in sync with USER_STATUS_IDS in backend/tracker/serializers.py.
// Ids are stored on accounts: never rename or remove one, only add.

export const MAX_USER_STATUSES = 5;

export type UserStatusGroup =
  | 'school'
  | 'major'
  | 'research'
  | 'tech'
  | 'data'
  | 'creative'
  | 'business'
  | 'industry'
  | 'independent'
  | 'life';

export interface UserStatusOption {
  id: string;
  group: UserStatusGroup;
  label: string;
}

// Display order is deliberate (not alphabetical): students first, then the
// core IT / tech roles, then business and founders, then everything else.
// Within each group the broadest / most common option leads and catch-alls
// ("Other") come last.
export const USER_STATUS_GROUPS: UserStatusGroup[] = [
  'major',
  'school',
  'research',
  'tech',
  'data',
  'business',
  'independent',
  'creative',
  'industry',
  'life',
];

type Row = [id: string, label: string];

const GROUP_ROWS: Record<UserStatusGroup, Row[]> = {
  major: [
    ['student_cs', 'Student (Computer Science)'],
    ['student_data_science', 'Student (Data Science / AI)'],
    ['student_engineering', 'Student (Engineering)'],
    ['student_science', 'Student (Science / Math)'],
    ['student_business', 'Student (Business / Economics)'],
    ['student_law', 'Student (Law / Policy)'],
    ['student_medicine', 'Student (Medicine / Health)'],
    ['student_humanities', 'Student (Humanities / Social Sci.)'],
    ['student_languages', 'Student (Languages / Linguistics)'],
    ['student_design_arts', 'Student (Design / Fine Arts)'],
    ['student_architecture', 'Student (Architecture)'],
    ['student_other', 'Student (Other)'],
  ],
  school: [
    ['exam_prep', 'Entrance Exam Prep'],
    ['high_school_student', 'High School Student'],
    ['vocational_student', 'Vocational / Technical School'],
    ['online_degree', 'Online Degree Student'],
    ['mature_student', 'Working Adult Student'],
    ['bootcamp_self_taught', 'Bootcamp / Self-Taught'],
    ['international_student', 'International Student'],
    ['exchange_student', 'Exchange / Study Abroad'],
  ],
  research: [
    ['graduate_research', 'Graduate / Researcher'],
    ['phd_candidate', 'PhD Candidate'],
    ['postdoc', 'Postdoctoral Researcher'],
    ['academic_faculty', 'Professor / Faculty'],
    ['industry_rnd', 'Industry R&D'],
  ],
  tech: [
    ['tech_market', 'Tech Market (Engineer / Dev)'],
    ['backend_dev', 'Backend Developer'],
    ['frontend_dev', 'Frontend Developer'],
    ['fullstack_dev', 'Full-Stack Developer'],
    ['mobile_dev', 'Mobile App Developer'],
    ['cloud_infra', 'Cloud / Infrastructure'],
    ['devops_sre', 'DevOps / SRE'],
    ['security', 'Cybersecurity'],
    ['embedded_iot', 'Embedded / IoT'],
    ['game_dev', 'Game Developer'],
    ['robotics', 'Robotics'],
    ['blockchain_web3', 'Blockchain / Web3'],
    ['product_manager', 'Product Manager'],
  ],
  data: [
    ['data_ai', 'Data / AI / ML'],
    ['data_analyst', 'Data Analyst / BI'],
    ['data_engineer', 'Data Engineer'],
    ['ml_engineer', 'ML Engineer / MLOps'],
    ['llm_builder', 'LLM / AI App Builder'],
    ['quant', 'Quant / Algorithmic Trading'],
  ],
  business: [
    ['business_corporate', 'Business / Corporate'],
    ['sales_bd', 'Sales / Business Development'],
    ['marketing_growth', 'Marketing / Growth'],
    ['finance_consulting', 'Finance / Consulting'],
    ['accounting_tax', 'Accounting / Tax'],
    ['legal', 'Legal / Compliance'],
    ['hr_people', 'HR / Recruiting'],
    ['operations_supply', 'Operations / Supply Chain'],
    ['real_estate', 'Real Estate'],
    ['investor_vc', 'VC / Angel Investor'],
    ['individual_investor', 'Individual Investor / Trader'],
  ],
  independent: [
    ['startup_founder', 'Startup / Founder / CEO'],
    ['solo_saas', 'Solo SaaS / Bootstrapper'],
    ['side_project', 'Side Project / Indie Hacker'],
    ['freelance', 'Freelance / Independent'],
    ['consultant_coach', 'Independent Consultant / Coach'],
    ['small_business_owner', 'Small Business Owner'],
    ['content_creator', 'Content Creator'],
    ['streamer_vtuber', 'Streamer / VTuber'],
    ['open_source', 'Open Source Maintainer'],
    ['digital_nomad', 'Digital Nomad / Remote'],
  ],
  creative: [
    ['design_creative', 'Design / Creative'],
    ['ux_ui_designer', 'UX / UI Designer'],
    ['graphic_designer', 'Graphic / Brand Designer'],
    ['illustrator_artist', 'Illustrator / Artist'],
    ['video_film', 'Video / Film'],
    ['music_audio', 'Music / Audio'],
    ['photographer', 'Photographer'],
    ['writer_editor', 'Writer / Editor'],
    ['architect_interior', 'Architect / Interior'],
  ],
  industry: [
    ['engineering_trades', 'Engineering / Facility / Trades'],
    ['electrician', 'Electrician / Electrical Works'],
    ['construction', 'Construction / Civil'],
    ['manufacturing', 'Manufacturing / Factory'],
    ['energy_utilities', 'Energy / Utilities'],
    ['logistics_transport', 'Logistics / Transport'],
    ['healthcare', 'Healthcare / Medical'],
    ['nurse_care', 'Nursing / Care Work'],
    ['pharma_biotech', 'Pharma / Biotech'],
    ['education_teaching', 'Education / Teaching'],
    ['public_sector', 'Public Sector / Government'],
    ['ngo_nonprofit', 'NGO / Nonprofit'],
    ['media_journalism', 'Media / Journalism'],
    ['hospitality_food', 'Hospitality / Food Service'],
    ['retail_service', 'Retail / Service'],
    ['agriculture', 'Agriculture / Fisheries'],
    ['sports_athlete', 'Athlete / Sports Industry'],
  ],
  life: [
    ['job_hunting_grad', 'Graduate Job Hunting'],
    ['first_job', 'First Year at Work'],
    ['job_seeking', 'Job Seeking / Career Change'],
    ['reskilling', 'Reskilling / Upskilling'],
    ['certification_prep', 'Certification / License Prep'],
    ['language_learner', 'Language Learner'],
    ['gap_year', 'Gap Year'],
    ['working_parent', 'Working Parent'],
    ['career_break', 'Career Break / Caregiving'],
    ['hobbyist', 'Hobbyist / Learning for Fun'],
    ['lifelong_learner', 'Retired / Lifelong Learner'],
    ['other', 'Other'],
  ],
};

export const USER_STATUS_OPTIONS: UserStatusOption[] = USER_STATUS_GROUPS.flatMap((group) =>
  GROUP_ROWS[group].map(([id, label]) => ({ id, group, label }))
);

const KNOWN_STATUS_IDS = new Set(USER_STATUS_OPTIONS.map((o) => o.id));

/** Known ids only, de-duplicated, capped at MAX_USER_STATUSES, order kept. */
export function sanitizeUserStatuses(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && KNOWN_STATUS_IDS.has(item) && !out.includes(item)) out.push(item);
    if (out.length >= MAX_USER_STATUSES) break;
  }
  return out;
}

export const getUserStatusOption = (id: string): UserStatusOption | undefined =>
  USER_STATUS_OPTIONS.find((o) => o.id === id);

/** Case-insensitive match against the label and the id. */
export const matchesStatusQuery = (opt: UserStatusOption, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    opt.label.toLowerCase().includes(q) || opt.id.includes(q)
  );
};
