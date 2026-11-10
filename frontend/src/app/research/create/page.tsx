'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { disciplinesApi, projectsApi } from '@/lib/api';
import {
  DocumentCategory,
  CitationStyle,
  AcademicDiscipline,
} from '@/types/project';
import { AcademicLevel } from '@/types/auth';
import {
  DOCUMENT_CATEGORIES,
  CATEGORY_SUBTYPES,
  CITATION_STYLES,
  ACADEMIC_LEVELS,
  PREFERRED_LANGUAGES,
} from '@/lib/constants';
import Sidebar from '@/components/Sidebar';
import {
  GraduationCap,
  BookOpen,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Building2,
  Globe,
  Tag,
  Search,
  CheckCircle2,
} from 'lucide-react';

export default function CreateResearchWizardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [disciplines, setDisciplines] = useState<AcademicDiscipline[]>([]);
  const [loadingDisciplines, setLoadingDisciplines] = useState<boolean>(true);
  const [disciplineSearch, setDisciplineSearch] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState<DocumentCategory>('ACADEMIC_PROJECT');
  const [subtype, setSubtype] = useState<string>('PhD Dissertation');
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('PHD');
  const [institution, setInstitution] = useState<string>('');
  const [country, setCountry] = useState<string>('United States');
  const [preferredLanguage, setPreferredLanguage] = useState<string>('English (International)');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA');
  const [methodology, setMethodology] = useState<string>('');
  const [objectives, setObjectives] = useState<string>('');
  const [supervisorRequirements, setSupervisorRequirements] = useState<string>('');
  const [targetWordCount, setTargetWordCount] = useState<string>('30000');
  const [deadline, setDeadline] = useState<string>('');

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Set default academic level from user
  useEffect(() => {
    if (user?.academic_level) {
      setAcademicLevel(user.academic_level);
    }
    if (user?.institution) {
      setInstitution(user.institution);
    }
  }, [user]);

  // Fetch disciplines from backend
  useEffect(() => {
    async function loadDisciplines() {
      try {
        const list = await disciplinesApi.list();
        setDisciplines(list);
        if (list.length > 0 && !selectedDisciplineId) {
          setSelectedDisciplineId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load disciplines', err);
      } finally {
        setLoadingDisciplines(false);
      }
    }
    loadDisciplines();
  }, [selectedDisciplineId]);

  // Update default subtype when category changes
  const handleCategorySelect = (newCat: DocumentCategory) => {
    setCategory(newCat);
    const available = CATEGORY_SUBTYPES[newCat];
    if (available && available.length > 0) {
      setSubtype(available[0]);
    }
  };

  // Step Validations
  const validateStep = (step: number): boolean => {
    setFormError(null);
    if (step === 1) {
      if (!category) {
        setFormError('Please select a document category.');
        return false;
      }
    } else if (step === 2) {
      if (!subtype) {
        setFormError('Please select a document subtype.');
        return false;
      }
    } else if (step === 3) {
      if (!selectedDisciplineId) {
        setFormError('Please select an academic discipline.');
        return false;
      }
    } else if (step === 4) {
      if (!title || title.trim().length < 3) {
        setFormError('Research title must be at least 3 characters long.');
        return false;
      }
      if (!citationStyle) {
        setFormError('Please select a citation style.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setFormError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCreateProject = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        title: title.trim(),
        document_category: category,
        document_subtype: subtype,
        academic_level: academicLevel,
        discipline_id: selectedDisciplineId,
        institution: institution.trim() || undefined,
        country: country.trim() || 'United States',
        preferred_language: preferredLanguage,
        citation_style: citationStyle,
        requirements: {
          research_methodology: methodology.trim() || undefined,
          research_objectives: objectives.trim() || undefined,
          supervisor_requirements: supervisorRequirements.trim() || undefined,
          target_word_count: targetWordCount ? parseInt(targetWordCount, 10) : undefined,
          deadline: deadline || undefined,
        },
      };

      const created = await projectsApi.create(payload);
      router.push(`/research/${created.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Failed to create research project. Please review your entries.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDisciplines = disciplines.filter(
    (d) =>
      d.name.toLowerCase().includes(disciplineSearch.toLowerCase()) ||
      d.category.toLowerCase().includes(disciplineSearch.toLowerCase())
  );

  const selectedDisciplineObj = disciplines.find((d) => d.id === selectedDisciplineId);

  return (
    <div className="flex-1 flex">
      <Sidebar className="hidden md:flex" />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Link href="/dashboard" className="hover:text-navy-900 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-gold-600">Research Setup Wizard</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
              Configure Research Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Follow the 5-step guided wizard to customize your multidisciplinary research project and outline.
            </p>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              {[
                { step: 1, title: 'Category' },
                { step: 2, title: 'Subtype' },
                { step: 3, title: 'Discipline' },
                { step: 4, title: 'Information' },
                { step: 5, title: 'Review & Create' },
              ].map((s, idx) => {
                const isCompleted = currentStep > s.step;
                const isCurrent = currentStep === s.step;

                return (
                  <React.Fragment key={s.step}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-navy-950 text-gold-400 border-2 border-gold-400'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : s.step}
                      </div>
                      <span
                        className={`hidden sm:inline text-xs font-medium ${
                          isCurrent ? 'text-slate-900 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>

                    {idx < 4 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          currentStep > s.step ? 'bg-emerald-400' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {formError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 font-medium">{formError}</div>
            </div>
          )}

          {/* Wizard Step Containers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* STEP 1: Select Document Category */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-bold text-slate-900">
                    Step 1: Select Document Category
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose the primary category for your academic work.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {DOCUMENT_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.value;
                    return (
                      <button
                        type="button"
                        key={cat.value}
                        onClick={() => handleCategorySelect(cat.value)}
                        className={`p-6 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'border-gold-500 bg-gold-50/20 ring-2 ring-gold-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                              isSelected ? 'bg-navy-950 text-gold-400' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cat.value === 'ACADEMIC_PROJECT' && <GraduationCap className="w-5 h-5" />}
                            {cat.value === 'RESEARCH_PAPER' && <FileText className="w-5 h-5" />}
                            {cat.value === 'JOURNAL_ARTICLE' && <BookOpen className="w-5 h-5" />}
                          </div>
                          <h3 className="font-serif font-bold text-slate-900 text-base mb-1">
                            {cat.label}
                          </h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>

                        <div className="mt-6 flex items-center justify-between text-xs font-semibold">
                          <span className={isSelected ? 'text-gold-600' : 'text-slate-400'}>
                            {isSelected ? 'Selected' : 'Select'}
                          </span>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-gold-500 bg-gold-500 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Select Document Subtype */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-bold text-slate-900">
                    Step 2: Select Document Subtype
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select the specific subtype for your {category.replace('_', ' ').toLowerCase()}.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(CATEGORY_SUBTYPES[category] || []).map((sub) => {
                    const isSelected = subtype === sub;
                    return (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => setSubtype(sub)}
                        className={`p-4 rounded-xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'border-gold-500 bg-gold-50/20 ring-2 ring-gold-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-gold-500 bg-gold-500 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{sub}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: Select Academic Discipline */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-bold text-slate-900">
                    Step 3: Select Academic Discipline
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    ScholarForge AI configures the terminology and methodology to your faculty.
                  </p>
                </div>

                {/* Search Discipline */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search disciplines (e.g., Computer Science, Medicine, Law, Economics)..."
                    value={disciplineSearch}
                    onChange={(e) => setDisciplineSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                  />
                </div>

                {loadingDisciplines ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Loading academic disciplines...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                    {filteredDisciplines.map((d) => {
                      const isSelected = selectedDisciplineId === d.id;
                      return (
                        <button
                          type="button"
                          key={d.id}
                          onClick={() => setSelectedDisciplineId(d.id)}
                          className={`p-3.5 rounded-lg border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? 'border-gold-500 bg-gold-50/20 ring-1 ring-gold-500'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-slate-900">{d.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-gold-600 shrink-0" />}
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                              {d.category}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Enter Research Information */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-bold text-slate-900">
                    Step 4: Research Information & Requirements
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Define the core parameters and guidelines for your academic study.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Research Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., An Empirical Evaluation of Zero-Knowledge Proofs in Decentralized Identity Systems"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                    />
                  </div>

                  {/* Academic Level & Institution */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Academic Level <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={academicLevel}
                        onChange={(e) => setAcademicLevel(e.target.value as AcademicLevel)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                      >
                        {ACADEMIC_LEVELS.map((lvl) => (
                          <option key={lvl.value} value={lvl.value}>
                            {lvl.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Institution / University <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="e.g., Stanford University"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Country, Language & Citation Style */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="United States"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Language
                      </label>
                      <select
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                      >
                        {PREFERRED_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Citation Style <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={citationStyle}
                        onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                      >
                        {CITATION_STYLES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Methodology & Objectives */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Research Methodology <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={methodology}
                        onChange={(e) => setMethodology(e.target.value)}
                        placeholder="e.g., Quantitative experimental evaluation on distributed testbeds using statistical ANOVA tests."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Research Objectives <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={objectives}
                        onChange={(e) => setObjectives(e.target.value)}
                        placeholder="e.g., 1. Quantify verification throughput under high concurrency. 2. Compare gas overheads."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Supervisor Requirements & Target Word Count */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Supervisor / Committee Guidelines <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={supervisorRequirements}
                        onChange={(e) => setSupervisorRequirements(e.target.value)}
                        placeholder="e.g., Minimum 60 peer-reviewed journal citations, IEEE template"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Target Word Count <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="number"
                        value={targetWordCount}
                        onChange={(e) => setTargetWordCount(e.target.value)}
                        placeholder="30000"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Review & Create */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-bold text-slate-900">
                    Step 5: Review & Initialize Workspace
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Review your research configuration before initializing the dedicated workspace.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="border-b border-slate-200 pb-4">
                    <span className="text-xs font-bold text-gold-700 uppercase tracking-wider">
                      {category.replace('_', ' ')} • {subtype}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-slate-900 mt-1">
                      {title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Academic Discipline</span>
                      <span className="font-bold text-slate-800">{selectedDisciplineObj?.name || 'Computer Science'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Academic Level</span>
                      <span className="font-bold text-slate-800">{academicLevel}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Citation Style</span>
                      <span className="font-bold text-slate-800">{citationStyle}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Language</span>
                      <span className="font-bold text-slate-800">{preferredLanguage}</span>
                    </div>
                  </div>

                  {institution && (
                    <div className="text-xs pt-2 border-t border-slate-200">
                      <span className="text-slate-400 font-medium">Institution: </span>
                      <span className="font-semibold text-slate-800">{institution} ({country})</span>
                    </div>
                  )}

                  {methodology && (
                    <div className="text-xs pt-2 border-t border-slate-200">
                      <span className="text-slate-400 font-medium">Methodology: </span>
                      <span className="text-slate-700">{methodology}</span>
                    </div>
                  )}

                  {objectives && (
                    <div className="text-xs pt-2 border-t border-slate-200">
                      <span className="text-slate-400 font-medium">Objectives: </span>
                      <span className="text-slate-700">{objectives}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-navy-950 text-white flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-gold-400 shrink-0" />
                  <p className="text-xs text-slate-300">
                    ScholarForge AI will automatically generate your manuscript scaffold and dynamic chapter outline tailored to your discipline and document category.
                  </p>
                </div>
              </div>
            )}

            {/* Stepper Controls */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-5 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-navy-950 text-xs font-bold transition flex items-center gap-2 shadow disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Initialize Research Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

