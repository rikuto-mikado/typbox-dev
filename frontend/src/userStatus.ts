// User status / market tags shown on the profile (multi-select, max 5).
// Ids must stay in sync with USER_STATUS_IDS in backend/tracker/serializers.py.
// Ids are stored on accounts: never rename or remove one, only add.
import type { Lang } from './i18n';

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
  label: Record<Lang, string>;
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

type Row = [id: string, en: string, ja: string];

const GROUP_ROWS: Record<UserStatusGroup, Row[]> = {
  major: [
    ['student_cs', 'Student (Computer Science)', '学生（情報系・CS）'],
    ['student_data_science', 'Student (Data Science / AI)', '学生（データサイエンス・AI）'],
    ['student_engineering', 'Student (Engineering)', '学生（工学系）'],
    ['student_science', 'Student (Science / Math)', '学生（理学・数学）'],
    ['student_business', 'Student (Business / Economics)', '学生（経営・経済）'],
    ['student_law', 'Student (Law / Policy)', '学生（法学・政策）'],
    ['student_medicine', 'Student (Medicine / Health)', '学生（医学・保健）'],
    ['student_humanities', 'Student (Humanities / Social Sci.)', '学生（人文・社会科学）'],
    ['student_languages', 'Student (Languages / Linguistics)', '学生（語学・言語学）'],
    ['student_design_arts', 'Student (Design / Fine Arts)', '学生（デザイン・芸術）'],
    ['student_architecture', 'Student (Architecture)', '学生（建築）'],
    ['student_other', 'Student (Other)', '学生（その他）'],
  ],
  school: [
    ['exam_prep', 'Entrance Exam Prep', '受験生'],
    ['high_school_student', 'High School Student', '高校生'],
    ['vocational_student', 'Vocational / Technical School', '専門学校生'],
    ['online_degree', 'Online Degree Student', '通信制・オンライン学位'],
    ['mature_student', 'Working Adult Student', '社会人学生'],
    ['bootcamp_self_taught', 'Bootcamp / Self-Taught', 'ブートキャンプ・独学'],
    ['international_student', 'International Student', '留学生'],
    ['exchange_student', 'Exchange / Study Abroad', '交換留学・海外留学中'],
  ],
  research: [
    ['graduate_research', 'Graduate / Researcher', '大学院生・研究者'],
    ['phd_candidate', 'PhD Candidate', '博士課程'],
    ['postdoc', 'Postdoctoral Researcher', 'ポスドク'],
    ['academic_faculty', 'Professor / Faculty', '教員・大学教授'],
    ['industry_rnd', 'Industry R&D', '企業研究・R&D'],
  ],
  tech: [
    ['tech_market', 'Tech Market (Engineer / Dev)', 'テック業界（エンジニア・開発）'],
    ['backend_dev', 'Backend Developer', 'バックエンドエンジニア'],
    ['frontend_dev', 'Frontend Developer', 'フロントエンドエンジニア'],
    ['fullstack_dev', 'Full-Stack Developer', 'フルスタックエンジニア'],
    ['mobile_dev', 'Mobile App Developer', 'モバイルアプリ開発'],
    ['cloud_infra', 'Cloud / Infrastructure', 'クラウド・インフラ'],
    ['devops_sre', 'DevOps / SRE', 'DevOps・SRE'],
    ['security', 'Cybersecurity', 'サイバーセキュリティ'],
    ['embedded_iot', 'Embedded / IoT', '組み込み・IoT'],
    ['game_dev', 'Game Developer', 'ゲーム開発'],
    ['robotics', 'Robotics', 'ロボティクス'],
    ['blockchain_web3', 'Blockchain / Web3', 'ブロックチェーン・Web3'],
    ['product_manager', 'Product Manager', 'プロダクトマネージャー'],
  ],
  data: [
    ['data_ai', 'Data / AI / ML', 'データ・AI・機械学習'],
    ['data_analyst', 'Data Analyst / BI', 'データアナリスト・BI'],
    ['data_engineer', 'Data Engineer', 'データエンジニア'],
    ['ml_engineer', 'ML Engineer / MLOps', 'MLエンジニア・MLOps'],
    ['llm_builder', 'LLM / AI App Builder', 'LLM・生成AIアプリ開発'],
    ['quant', 'Quant / Algorithmic Trading', 'クオンツ・アルゴリズム取引'],
  ],
  business: [
    ['business_corporate', 'Business / Corporate', 'ビジネス・企業勤務'],
    ['sales_bd', 'Sales / Business Development', '営業・事業開発'],
    ['marketing_growth', 'Marketing / Growth', 'マーケティング・グロース'],
    ['finance_consulting', 'Finance / Consulting', '金融・コンサルティング'],
    ['accounting_tax', 'Accounting / Tax', '会計・税務'],
    ['legal', 'Legal / Compliance', '法務・コンプライアンス'],
    ['hr_people', 'HR / Recruiting', '人事・採用'],
    ['operations_supply', 'Operations / Supply Chain', 'オペレーション・SCM'],
    ['real_estate', 'Real Estate', '不動産'],
    ['investor_vc', 'VC / Angel Investor', 'VC・エンジェル投資家'],
    ['individual_investor', 'Individual Investor / Trader', '個人投資家・トレーダー'],
  ],
  independent: [
    ['startup_founder', 'Startup / Founder / CEO', 'スタートアップ・創業者・CEO'],
    ['solo_saas', 'Solo SaaS / Bootstrapper', '個人SaaS・ブートストラップ'],
    ['side_project', 'Side Project / Indie Hacker', '副業・個人開発'],
    ['freelance', 'Freelance / Independent', 'フリーランス・個人事業'],
    ['consultant_coach', 'Independent Consultant / Coach', '独立コンサル・コーチ'],
    ['small_business_owner', 'Small Business Owner', '個人店・中小企業経営'],
    ['content_creator', 'Content Creator', 'コンテンツクリエイター'],
    ['streamer_vtuber', 'Streamer / VTuber', '配信者・VTuber'],
    ['open_source', 'Open Source Maintainer', 'OSSメンテナー'],
    ['digital_nomad', 'Digital Nomad / Remote', 'デジタルノマド・フルリモート'],
  ],
  creative: [
    ['design_creative', 'Design / Creative', 'デザイン・クリエイティブ'],
    ['ux_ui_designer', 'UX / UI Designer', 'UX・UIデザイナー'],
    ['graphic_designer', 'Graphic / Brand Designer', 'グラフィック・ブランドデザイナー'],
    ['illustrator_artist', 'Illustrator / Artist', 'イラストレーター・アーティスト'],
    ['video_film', 'Video / Film', '映像・映画制作'],
    ['music_audio', 'Music / Audio', '音楽・オーディオ'],
    ['photographer', 'Photographer', 'フォトグラファー'],
    ['writer_editor', 'Writer / Editor', 'ライター・編集者'],
    ['architect_interior', 'Architect / Interior', '建築家・インテリア'],
  ],
  industry: [
    ['engineering_trades', 'Engineering / Facility / Trades', '技術職・設備・現場'],
    ['electrician', 'Electrician / Electrical Works', '電気工事・電気設備'],
    ['construction', 'Construction / Civil', '建設・土木'],
    ['manufacturing', 'Manufacturing / Factory', '製造・工場'],
    ['energy_utilities', 'Energy / Utilities', 'エネルギー・インフラ事業'],
    ['logistics_transport', 'Logistics / Transport', '物流・運輸'],
    ['healthcare', 'Healthcare / Medical', '医療・ヘルスケア'],
    ['nurse_care', 'Nursing / Care Work', '看護・介護'],
    ['pharma_biotech', 'Pharma / Biotech', '製薬・バイオ'],
    ['education_teaching', 'Education / Teaching', '教育・講師'],
    ['public_sector', 'Public Sector / Government', '公共・行政'],
    ['ngo_nonprofit', 'NGO / Nonprofit', 'NGO・NPO'],
    ['media_journalism', 'Media / Journalism', 'メディア・報道'],
    ['hospitality_food', 'Hospitality / Food Service', 'ホスピタリティ・飲食'],
    ['retail_service', 'Retail / Service', '小売・サービス'],
    ['agriculture', 'Agriculture / Fisheries', '農業・水産'],
    ['sports_athlete', 'Athlete / Sports Industry', 'アスリート・スポーツ業界'],
  ],
  life: [
    ['job_hunting_grad', 'Graduate Job Hunting', '就職活動中（新卒）'],
    ['first_job', 'First Year at Work', '新社会人'],
    ['job_seeking', 'Job Seeking / Career Change', '就職・転職活動中'],
    ['reskilling', 'Reskilling / Upskilling', 'リスキリング中'],
    ['certification_prep', 'Certification / License Prep', '資格・検定の勉強中'],
    ['language_learner', 'Language Learner', '語学学習中'],
    ['gap_year', 'Gap Year', 'ギャップイヤー'],
    ['working_parent', 'Working Parent', '子育てと両立中'],
    ['career_break', 'Career Break / Caregiving', 'キャリアブレイク・育児介護'],
    ['hobbyist', 'Hobbyist / Learning for Fun', '趣味で学習'],
    ['lifelong_learner', 'Retired / Lifelong Learner', 'リタイア・生涯学習'],
    ['other', 'Other', 'その他'],
  ],
};

export const USER_STATUS_OPTIONS: UserStatusOption[] = USER_STATUS_GROUPS.flatMap((group) =>
  GROUP_ROWS[group].map(([id, en, ja]) => ({ id, group, label: { en, ja } }))
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

/** Case-insensitive match against both language labels and the id. */
export const matchesStatusQuery = (opt: UserStatusOption, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    opt.label.en.toLowerCase().includes(q) || opt.label.ja.toLowerCase().includes(q) || opt.id.includes(q)
  );
};
