// User status / market tags shown on the profile (multi-select, max 5).
// Ids must stay in sync with USER_STATUS_IDS in backend/tracker/serializers.py.
import type { Lang } from './i18n';

export const MAX_USER_STATUSES = 5;

export type UserStatusGroup = 'study' | 'work' | 'independent' | 'life';

export interface UserStatusOption {
  id: string;
  group: UserStatusGroup;
  label: Record<Lang, string>;
}

export const USER_STATUS_GROUPS: UserStatusGroup[] = ['study', 'work', 'independent', 'life'];

export const USER_STATUS_OPTIONS: UserStatusOption[] = [
  { id: 'student_cs', group: 'study', label: { en: 'Student (Computer Science)', ja: '学生（情報系・CS）' } },
  { id: 'student_engineering', group: 'study', label: { en: 'Student (Engineering)', ja: '学生（工学系）' } },
  { id: 'student_science', group: 'study', label: { en: 'Student (Science / Math)', ja: '学生（理学・数学）' } },
  { id: 'student_business', group: 'study', label: { en: 'Student (Business / Economics)', ja: '学生（経営・経済）' } },
  { id: 'student_humanities', group: 'study', label: { en: 'Student (Humanities / Social Sci.)', ja: '学生（人文・社会科学）' } },
  { id: 'student_other', group: 'study', label: { en: 'Student (Other)', ja: '学生（その他）' } },
  { id: 'graduate_research', group: 'study', label: { en: 'Graduate / Researcher', ja: '大学院生・研究者' } },
  { id: 'bootcamp_self_taught', group: 'study', label: { en: 'Bootcamp / Self-Taught', ja: 'ブートキャンプ・独学' } },

  { id: 'tech_market', group: 'work', label: { en: 'Tech Market (Engineer / Dev)', ja: 'テック業界（エンジニア・開発）' } },
  { id: 'data_ai', group: 'work', label: { en: 'Data / AI / ML', ja: 'データ・AI・機械学習' } },
  { id: 'design_creative', group: 'work', label: { en: 'Design / Creative', ja: 'デザイン・クリエイティブ' } },
  { id: 'business_corporate', group: 'work', label: { en: 'Business / Corporate', ja: 'ビジネス・企業勤務' } },
  { id: 'finance_consulting', group: 'work', label: { en: 'Finance / Consulting', ja: '金融・コンサルティング' } },
  { id: 'engineering_trades', group: 'work', label: { en: 'Engineering / Facility / Trades', ja: '技術職・設備・現場' } },
  { id: 'healthcare', group: 'work', label: { en: 'Healthcare / Medical', ja: '医療・ヘルスケア' } },
  { id: 'education_teaching', group: 'work', label: { en: 'Education / Teaching', ja: '教育・講師' } },
  { id: 'public_sector', group: 'work', label: { en: 'Public Sector / Government', ja: '公共・行政' } },

  { id: 'startup_founder', group: 'independent', label: { en: 'Startup / Founder / CEO', ja: 'スタートアップ・創業者・CEO' } },
  { id: 'freelance', group: 'independent', label: { en: 'Freelance / Independent', ja: 'フリーランス・個人事業' } },
  { id: 'content_creator', group: 'independent', label: { en: 'Content Creator', ja: 'コンテンツクリエイター' } },
  { id: 'side_project', group: 'independent', label: { en: 'Side Project / Indie Hacker', ja: '副業・個人開発' } },

  { id: 'gap_year', group: 'life', label: { en: 'Gap Year', ja: 'ギャップイヤー' } },
  { id: 'job_seeking', group: 'life', label: { en: 'Job Seeking / Career Change', ja: '就職・転職活動中' } },
  { id: 'career_break', group: 'life', label: { en: 'Career Break / Caregiving', ja: 'キャリアブレイク・育児介護' } },
  { id: 'lifelong_learner', group: 'life', label: { en: 'Retired / Lifelong Learner', ja: 'リタイア・生涯学習' } },
  { id: 'other', group: 'life', label: { en: 'Other', ja: 'その他' } },
];

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
