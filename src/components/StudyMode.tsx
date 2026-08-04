import React, { useState } from 'react';
import { STUDY_TOPICS_DATA } from '../data/studyData';
import { StudyTopic, StudyQuizQuestion } from '../types';
import { audioEngine } from '../utils/audio';
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Award,
  Radio,
  PlaneTakeoff,
  PlaneLanding,
  ShieldAlert,
  CloudFog,
  MapPin,
  Activity,
  ArrowRight,
  RotateCcw,
  Volume2,
  Sparkles,
  Zap,
} from 'lucide-react';

export const StudyMode: React.FC = () => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>('topic-departure');
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [userScore, setUserScore] = useState<number>(0);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  const activeTopic = STUDY_TOPICS_DATA.find((t) => t.id === selectedTopicId) || STUDY_TOPICS_DATA[0];

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'PlaneTakeoff':
        return <PlaneTakeoff className="w-5 h-5 text-emerald-400" />;
      case 'PlaneLanding':
        return <PlaneLanding className="w-5 h-5 text-sky-400" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case 'CloudFog':
        return <CloudFog className="w-5 h-5 text-amber-400" />;
      case 'MapPin':
        return <MapPin className="w-5 h-5 text-purple-400" />;
      case 'Activity':
        return <Activity className="w-5 h-5 text-indigo-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-emerald-400" />;
    }
  };

  const handleStartQuiz = () => {
    setQuizActive(true);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setUserScore(0);
    setAnsweredCount(0);
    setQuizFinished(false);
    audioEngine.playSquelch('press');
  };

  const handleOptionSelect = (index: number) => {
    if (showExplanation) return; // Locked once answered
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;

    const currentQ = activeTopic.quizQuestions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQ.correctIndex;

    if (isCorrect) {
      setUserScore((prev) => prev + 1);
      audioEngine.playRogerBeep();
    } else {
      audioEngine.playSquelch('release');
    }

    setAnsweredCount((prev) => prev + 1);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < activeTopic.quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handlePlayAudio = (text: string) => {
    audioEngine.speak(text);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Sleek Header & Hero Section */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-1">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>KNFG ATC QUALIFICATION AID • STUDY & KNOWLEDGE MODULE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              AIRSPACE & PHRASEOLOGY STUDY CENTER
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Master FAA JO 7110.65 regulations, Camp Pendleton local operating procedures (LOPs), emergency protocols, and mandatory radio phraseology.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="start-category-quiz-btn"
              onClick={handleStartQuiz}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2 text-sm"
            >
              <Award className="w-4 h-4" />
              <span>Quiz Category ({activeTopic.quizQuestions.length} Qs)</span>
            </button>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STUDY_TOPICS_DATA.map((topic) => {
            const isSelected = topic.id === selectedTopicId;
            return (
              <button
                key={topic.id}
                id={`study-topic-${topic.id}`}
                onClick={() => {
                  setSelectedTopicId(topic.id);
                  setQuizActive(false);
                  audioEngine.playSquelch('press');
                }}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
                <div className="flex items-center space-x-2 mb-1.5">
                  {getCategoryIcon(topic.iconName)}
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                    {topic.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-100 line-clamp-1">
                  {topic.title}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  {topic.quizQuestions.length} Exam Questions
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area: Topic Detail OR Quiz View */}
      {!quizActive ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Key Points & Overview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900/80 border-l-4 border-l-emerald-500 border-y border-r border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    {getCategoryIcon(activeTopic.iconName)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 font-mono">
                      {activeTopic.title}
                    </h3>
                    <span className="text-xs text-emerald-400 font-mono">
                      REF: {activeTopic.reference}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeTopic.summary}
                </p>
              </div>

              {/* Key Rules Checklist */}
              <div>
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Mandatory Rules & Procedures</span>
                </h4>
                <div className="space-y-2.5">
                  {activeTopic.keyPoints.map((point, index) => (
                    <div
                      key={index}
                      className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-start space-x-3 text-xs text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                        {index + 1}
                      </span>
                      <span className="leading-normal">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Standard Phraseology Examples */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/80 border-l-4 border-l-sky-500 border-y border-r border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Radio className="w-5 h-5 text-sky-400" />
                  <h3 className="font-bold text-slate-100 font-mono text-sm uppercase">
                    Mandatory Phraseology Cheat Sheet
                  </h3>
                </div>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono border border-sky-500/30">
                  FAA 7110.65
                </span>
              </div>

              <div className="space-y-3">
                {activeTopic.phraseologyExamples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-amber-400 font-mono font-bold">
                      <span>{ex.scenario}</span>
                      <button
                        onClick={() => handlePlayAudio(ex.atcCall)}
                        title="Listen to ATC Call"
                        className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
                      <p className="text-emerald-400 font-semibold">
                        <span className="text-slate-500">ATC:</span> "{ex.atcCall}"
                      </p>
                      <p className="text-slate-300 italic">
                        <span className="text-slate-500">PILOT:</span> "{ex.pilotReadback}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Start Quiz Banner */}
              <div className="bg-gradient-to-r from-emerald-950/40 to-slate-950 border border-emerald-500/30 p-4 rounded-xl text-center space-y-3">
                <p className="text-xs text-slate-300 font-mono">
                  Ready to test your knowledge on <strong className="text-emerald-400">{activeTopic.title}</strong>?
                </p>
                <button
                  id="quiz-start-cta-btn"
                  onClick={handleStartQuiz}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 text-xs uppercase font-mono"
                >
                  <Award className="w-4 h-4" />
                  <span>Launch Practice Quiz</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Quiz Interface */
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-4xl mx-auto space-y-6">
          {!quizFinished ? (
            <div>
              {/* Quiz Header & Progress */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                    Category Quiz: {activeTopic.title}
                  </span>
                  <h3 className="text-lg font-bold text-slate-100 font-mono mt-0.5">
                    Question {currentQuestionIndex + 1} of {activeTopic.quizQuestions.length}
                  </h3>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 text-slate-300">
                    Score: <strong className="text-emerald-400">{userScore}</strong> / {answeredCount}
                  </span>
                  <button
                    onClick={() => setQuizActive(false)}
                    className="text-slate-400 hover:text-white underline text-xs font-mono"
                  >
                    Exit Quiz
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / activeTopic.quizQuestions.length) * 100}%`,
                  }}
                />
              </div>

              {/* Question Text */}
              <div className="mt-6 space-y-4">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-slate-100 font-medium text-base leading-relaxed">
                  {activeTopic.quizQuestions[currentQuestionIndex].question}
                </div>

                {/* Options List */}
                <div className="space-y-3">
                  {activeTopic.quizQuestions[currentQuestionIndex].options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === activeTopic.quizQuestions[currentQuestionIndex].correctIndex;

                    let btnStyle = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/50';

                    if (showExplanation) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold';
                      } else {
                        btnStyle = 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-60';
                      }
                    } else if (isSelected) {
                      btnStyle = 'bg-sky-500/20 border-sky-500 text-sky-200 font-bold';
                    }

                    return (
                      <button
                        key={idx}
                        id={`quiz-opt-${idx}`}
                        disabled={showExplanation}
                        onClick={() => handleOptionSelect(idx)}
                        className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${btnStyle}`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-full border border-current text-xs font-mono font-bold flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {showExplanation && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Submit / Next Controls */}
                <div className="pt-4 flex items-center justify-end">
                  {!showExplanation ? (
                    <button
                      id="submit-quiz-answer-btn"
                      disabled={selectedOption === null}
                      onClick={handleSubmitAnswer}
                      className="bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all text-sm font-mono uppercase"
                    >
                      Confirm Answer
                    </button>
                  ) : (
                    <button
                      id="next-quiz-q-btn"
                      onClick={handleNextQuestion}
                      className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all text-sm font-mono uppercase flex items-center space-x-2"
                    >
                      <span>
                        {currentQuestionIndex < activeTopic.quizQuestions.length - 1
                          ? 'Next Question'
                          : 'View Results'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Explanation Card */}
                {showExplanation && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold">
                      <HelpCircle className="w-4 h-4" />
                      <span>EXPLANATION & REFERENCE</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {activeTopic.quizQuestions[currentQuestionIndex].explanation}
                    </p>
                    <p className="text-emerald-400 font-mono text-[11px] pt-1">
                      CITATION: {activeTopic.quizQuestions[currentQuestionIndex].reference}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Quiz Completed View */
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <Award className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-bold font-mono text-white">
                  Quiz Completed!
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Category: <strong className="text-slate-200">{activeTopic.title}</strong>
                </p>
              </div>

              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 max-w-sm mx-auto space-y-2">
                <div className="text-4xl font-extrabold font-mono text-emerald-400">
                  {Math.round((userScore / activeTopic.quizQuestions.length) * 100)}%
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  {userScore} out of {activeTopic.quizQuestions.length} correct
                </p>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handleStartQuiz}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2.5 rounded-xl border border-slate-700 transition-all text-xs font-mono flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake Quiz</span>
                </button>

                <button
                  onClick={() => setQuizActive(false)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all text-xs font-mono"
                >
                  Return to Study Material
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
