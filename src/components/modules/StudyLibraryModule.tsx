import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  HelpCircle,
  Bookmark,
  Search,
  Star,
  Trash2,
  ExternalLink,
  RotateCw,
  Plus,
  Sparkles,
  Download,
  Printer,
  CheckCircle2,
  Layers,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import {
  StudySummary,
  ConceptNote,
  Quiz,
  Flashcard,
  StudyMaterial,
  UserPreferences,
} from '../../types';
import {
  loadSummaries,
  saveSummaries,
  loadConcepts,
  saveConcepts,
  loadQuizzes,
  saveQuizzes,
  loadFlashcards,
  saveFlashcards,
  loadMaterials,
  saveMaterials,
  logActivity,
} from '../../data/storage';
import { exportSummaryToMarkdown, exportContentAsFile, printContent } from '../../utils/exporter';

interface StudyLibraryModuleProps {
  preferences: UserPreferences;
  onNavigateTab?: (tab: string, itemData?: any) => void;
}

export const StudyLibraryModule: React.FC<StudyLibraryModuleProps> = ({
  preferences,
  onNavigateTab,
}) => {
  const [activeTab, setActiveTab] = useState<'summaries' | 'concepts' | 'quizzes' | 'flashcards' | 'materials'>('summaries');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Data states
  const [summaries, setSummaries] = useState<StudySummary[]>([]);
  const [concepts, setConcepts] = useState<ConceptNote[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);

  // Flashcard review session state
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [newFlashcardModal, setNewFlashcardModal] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newCardSubject, setNewCardSubject] = useState(preferences.currentSubjects[0] || 'Giải phẫu học');

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setSummaries(loadSummaries());
    setConcepts(loadConcepts());
    setQuizzes(loadQuizzes());
    setFlashcards(loadFlashcards());
    setMaterials(loadMaterials());
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Toggle favorites
  const toggleFavoriteSummary = (id: string) => {
    const updated = summaries.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
    setSummaries(updated);
    saveSummaries(updated);
  };

  const toggleFavoriteConcept = (id: string) => {
    const updated = concepts.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c));
    setConcepts(updated);
    saveConcepts(updated);
  };

  // Delete items
  const handleDeleteSummary = (id: string) => {
    if (window.confirm('Xóa bản tóm tắt này?')) {
      const updated = summaries.filter((s) => s.id !== id);
      setSummaries(updated);
      saveSummaries(updated);
      showToast('Đã xóa tóm tắt.');
    }
  };

  const handleDeleteConcept = (id: string) => {
    if (window.confirm('Xóa ghi chú khái niệm này?')) {
      const updated = concepts.filter((c) => c.id !== id);
      setConcepts(updated);
      saveConcepts(updated);
      showToast('Đã xóa ghi chú.');
    }
  };

  const handleDeleteQuiz = (id: string) => {
    if (window.confirm('Xóa bộ câu hỏi này?')) {
      const updated = quizzes.filter((q) => q.id !== id);
      setQuizzes(updated);
      saveQuizzes(updated);
      showToast('Đã xóa quiz.');
    }
  };

  const handleDeleteFlashcard = (id: string) => {
    const updated = flashcards.filter((f) => f.id !== id);
    setFlashcards(updated);
    saveFlashcards(updated);
    if (currentCardIdx >= updated.length) setCurrentCardIdx(Math.max(0, updated.length - 1));
    showToast('Đã xóa flashcard.');
  };

  // Flashcard review logic
  const handleRateFlashcard = (remembered: boolean) => {
    if (flashcards.length === 0) return;
    const card = flashcards[currentCardIdx];
    const newInterval = remembered ? (card.intervalDays || 1) * 2 : 1;
    const nextDate = new Date(Date.now() + 86400000 * newInterval).toISOString().split('T')[0];

    const updated = flashcards.map((f, i) =>
      i === currentCardIdx
        ? {
            ...f,
            intervalDays: newInterval,
            repetitionCount: (f.repetitionCount || 0) + 1,
            nextReviewDate: nextDate,
          }
        : f
    );

    setFlashcards(updated);
    saveFlashcards(updated);
    setIsCardFlipped(false);

    if (currentCardIdx < flashcards.length - 1) {
      setCurrentCardIdx((prev) => prev + 1);
    } else {
      showToast('Đã hoàn thành vòng ôn tập Flashcards!');
      setCurrentCardIdx(0);
    }
  };

  // Add flashcard
  const handleCreateFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const newCard: Flashcard = {
      id: `fc-${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
      subject: newCardSubject,
      tags: ['Tự tạo'],
      nextReviewDate: new Date().toISOString().split('T')[0],
      intervalDays: 1,
      repetitionCount: 0,
    };

    const updated = [newCard, ...flashcards];
    setFlashcards(updated);
    saveFlashcards(updated);
    setNewFlashcardModal(false);
    setNewFront('');
    setNewBack('');
    showToast('Đã tạo thẻ ghi nhớ mới!');
  };

  // Filtering
  const filteredSummaries = summaries.filter((s) => {
    if (onlyFavorites && !s.isFavorite) return false;
    if (selectedSubject !== 'all' && s.subject !== selectedSubject) return false;
    if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase()) && !s.overview.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredConcepts = concepts.filter((c) => {
    if (onlyFavorites && !c.isFavorite) return false;
    if (selectedSubject !== 'all' && c.subject !== selectedSubject) return false;
    if (searchQuery && !c.topic.toLowerCase().includes(searchQuery.toLowerCase()) && !c.explanation.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredQuizzes = quizzes.filter((q) => {
    if (selectedSubject !== 'all' && q.subject !== selectedSubject) return false;
    if (searchQuery && !q.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredFlashcards = flashcards.filter((f) => {
    if (selectedSubject !== 'all' && f.subject !== selectedSubject) return false;
    if (searchQuery && !f.front.toLowerCase().includes(searchQuery.toLowerCase()) && !f.back.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 animate-fade-in flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          {notification}
        </div>
      )}

      {/* Header and Search */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              <BookOpen className="w-4 h-4" />
              <span>Kho lưu trữ kiến thức học thuật</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Thư viện tài liệu cá nhân
            </h2>
          </div>

          {activeTab === 'flashcards' && (
            <button
              type="button"
              onClick={() => setNewFlashcardModal(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Tạo Flashcard mới
            </button>
          )}
        </div>

        {/* Search & Subject Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tiêu đề, thuật ngữ, cơ chế hoặc nội dung..."
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
            >
              <option value="all">Tất cả môn học</option>
              {preferences.currentSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              title="Chỉ xem mục yêu thích"
              className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                onlyFavorites
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Star className={`w-4 h-4 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          {[
            { id: 'summaries', label: `Tóm tắt bài giảng (${summaries.length})`, icon: FileText },
            { id: 'concepts', label: `Khái niệm & Cơ chế (${concepts.length})`, icon: Sparkles },
            { id: 'quizzes', label: `Bộ câu hỏi Quiz (${quizzes.length})`, icon: HelpCircle },
            { id: 'flashcards', label: `Thẻ Flashcards (${flashcards.length})`, icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Summaries */}
      {activeTab === 'summaries' && (
        <div className="space-y-4">
          {filteredSummaries.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-10 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              Không tìm thấy bản tóm tắt nào phù hợp.
            </div>
          ) : (
            filteredSummaries.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      <span>{s.subject}</span>
                      <span>•</span>
                      <span className="capitalize">{s.detailLevel}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {s.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleFavoriteSummary(s.id)}
                      className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <Star className={`w-4 h-4 ${s.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const md = exportSummaryToMarkdown(s);
                        exportContentAsFile(`${s.title}.md`, md, 'text/markdown');
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="Tải Markdown"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => printContent(exportSummaryToMarkdown(s), s.title)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="In tài liệu"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSummary(s.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {s.overview}
                </p>

                {/* Key Points Preview */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Ý chính cốt lõi:</p>
                  {s.keyPoints.slice(0, 2).map((kp, idx) => (
                    <div key={idx} className="text-slate-600 dark:text-slate-400 line-clamp-1">
                      • {kp}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.tags?.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateTab) {
                        onNavigateTab('quiz', { initialTopic: s.title, initialContent: s.overview });
                      }
                    }}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Tạo Quiz từ bài này <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Concepts */}
      {activeTab === 'concepts' && (
        <div className="space-y-4">
          {filteredConcepts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-10 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              Không tìm thấy ghi chú khái niệm nào.
            </div>
          ) : (
            filteredConcepts.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      {c.subject} • {c.mode.toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {c.topic}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleFavoriteConcept(c.id)}
                      className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <Star className={`w-4 h-4 ${c.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteConcept(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/40 rounded-lg text-xs text-purple-950 dark:text-purple-200">
                  <strong>Định nghĩa cốt lõi:</strong> {c.coreDefinition}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                  {c.explanation}
                </p>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateTab) {
                        onNavigateTab('explainer', { topic: c.topic, subject: c.subject });
                      }
                    }}
                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    Xem phân tích đa sắc thái <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Quizzes */}
      {activeTab === 'quizzes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuizzes.length === 0 ? (
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl p-10 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              Không có bộ đề thi nào.
            </div>
          ) : (
            filteredQuizzes.map((q) => (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{q.subject}</span>
                    <span className="capitalize">{q.difficulty}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {q.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {q.questions.length} câu hỏi • Dạng: {q.questionType.toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleDeleteQuiz(q.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateTab) {
                        onNavigateTab('quiz', { initialTopic: q.title });
                      }
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    Làm bài kiểm tra <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Interactive Flashcards Review */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          {flashcards.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-10 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Layers className="w-10 h-10 text-purple-500 mx-auto opacity-70" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Chưa có thẻ ghi nhớ nào!
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Nhấn &quot;Tạo Flashcard mới&quot; hoặc sinh tự động từ những câu hỏi làm sai trong bài kiểm tra.
              </p>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-5">
              {/* Progress counter */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Thẻ {currentCardIdx + 1} / {flashcards.length}
                </span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {flashcards[currentCardIdx]?.subject}
                </span>
              </div>

              {/* The Flip Card */}
              <div
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className="w-full min-h-[260px] bg-white dark:bg-slate-900 rounded-2xl p-8 border-2 border-blue-500/30 dark:border-blue-500/20 shadow-md hover:shadow-lg transition-all flex flex-col justify-between cursor-pointer select-none relative group"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>{isCardFlipped ? 'Mặt sau — Câu trả lời & Giải thích' : 'Mặt trước — Câu hỏi / Khái niệm'}</span>
                  <RotateCw className="w-4 h-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
                </div>

                <div className="my-auto py-4 text-center">
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                    {isCardFlipped ? flashcards[currentCardIdx]?.back : flashcards[currentCardIdx]?.front}
                  </p>
                </div>

                <div className="text-center text-[11px] text-slate-400">
                  Nhấn vào thẻ để lật mặt
                </div>
              </div>

              {/* Response Rating Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleRateFlashcard(false)}
                  className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/40"
                >
                  Chưa nhớ (Ôn lại ngày mai)
                </button>
                <button
                  type="button"
                  onClick={() => handleRateFlashcard(true)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Đã nhớ vững (Tăng khoảng cách)
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteFlashcard(flashcards[currentCardIdx]?.id)}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa thẻ này
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Flashcard Modal */}
      {newFlashcardModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tạo thẻ ghi nhớ Flashcard mới
            </h3>

            <form onSubmit={handleCreateFlashcard} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Môn học
                </label>
                <select
                  value={newCardSubject}
                  onChange={(e) => setNewCardSubject(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  {preferences.currentSubjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mặt trước (Câu hỏi hoặc Thuật ngữ)
                </label>
                <textarea
                  rows={3}
                  required
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="Ví dụ: Chỉ định hàng đầu của Thuốc ức chế men chuyển là gì?"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mặt sau (Câu trả lời & Cơ chế)
                </label>
                <textarea
                  rows={4}
                  required
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="Ví dụ: Suy tim có phân suất tống máu giảm (HFrEF) và tăng huyết áp kèm đái tháo đường..."
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewFlashcardModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
                >
                  Lưu thẻ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
