import { DocumentCategory, CitationStyle } from '@/types/project';
import { AcademicLevel } from '@/types/auth';

export const ACADEMIC_LEVELS: { value: AcademicLevel; label: string }[] = [
  { value: 'UNDERGRADUATE', label: 'Undergraduate' },
  { value: 'MASTERS', label: "Master's" },
  { value: 'PHD', label: 'PhD' },
  { value: 'FACULTY', label: 'Lecturer / Faculty' },
  { value: 'INDEPENDENT', label: 'Independent Researcher' },
];

export const DOCUMENT_CATEGORIES: {
  value: DocumentCategory;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'ACADEMIC_PROJECT',
    label: 'Academic Project',
    description: 'Degree theses, dissertations, and capstone research projects with structured defenses.',
    icon: 'GraduationCap',
  },
  {
    value: 'RESEARCH_PAPER',
    label: 'Research Paper',
    description: 'Original empirical studies, theoretical investigations, literature reviews, and seminar papers.',
    icon: 'FileText',
  },
  {
    value: 'JOURNAL_ARTICLE',
    label: 'Journal Article',
    description: 'Manuscripts formatted for peer-reviewed academic journals, reviews, and short communications.',
    icon: 'BookOpen',
  },
];

export const CATEGORY_SUBTYPES: Record<DocumentCategory, string[]> = {
  ACADEMIC_PROJECT: [
    'Undergraduate Academic Project',
    'Honours Research Thesis',
    "Master's Thesis",
    'PhD Dissertation',
    'Postdoctoral Research Monograph',
    'Capstone Project Report',
  ],
  RESEARCH_PAPER: [
    'Empirical Research Paper',
    'Conceptual Research Paper',
    'Theoretical Research Paper',
    'Literature Review',
    'Systematic Review',
    'Research Proposal',
    'Seminar Paper',
    'Conference Paper',
  ],
  JOURNAL_ARTICLE: [
    'Original Research Article',
    'Review Article / Meta-Analysis',
    'Short Communication / Brief Note',
    'Case Study Report',
    'Methodology Article',
  ],
};

export const CITATION_STYLES: { value: CitationStyle; label: string; field: string }[] = [
  { value: 'APA', label: 'APA 7th edition', field: 'Social Sciences, Education, Psychology' },
  { value: 'MLA', label: 'MLA 9th edition', field: 'Humanities, Literature, Arts' },
  { value: 'CHICAGO', label: 'Chicago 17th edition', field: 'History, Humanities, Social Sciences' },
  { value: 'HARVARD', label: 'Harvard Style', field: 'Business, Economics, Life Sciences' },
  { value: 'IEEE', label: 'IEEE', field: 'Computer Science, Engineering, Tech' },
  { value: 'VANCOUVER', label: 'Vancouver', field: 'Medicine, Nursing, Health Sciences' },
];

export const PREFERRED_LANGUAGES = [
  'English (US)',
  'English (UK)',
  'English (International)',
  'French',
  'German',
  'Spanish',
  'Portuguese',
  'Arabic',
  'Chinese (Mandarin)',
  'Japanese',
];

