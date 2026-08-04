import React, { useState } from 'react';
import { ControlPosition, ExamQuestion } from '../types';
import { EXAM_QUESTIONS_DATA } from '../data/knfgData';
import { audioEngine } from '../utils/audio';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ShieldCheck,
  FileCheck,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface QualificationChecklistProps {
  activePosition: ControlPosition;
  onPositionChange: (pos: ControlPosition) => void;
}

export const QualificationChecklist: React.FC<QualificationChecklistProps> = ({
  activePosition,
  onPositionChange,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({});
  const [isExamSubmitted, setIsExamSubmitted] = useState<boolean>(false);

  // Position requirements checklist
  const positionChecklist = [
    { id: 'req-1', title: 'FAA JO 7110.65 Standard Phraseology Mastery', status: true },
    { id: 'req-2', title: 'KNFG Airspace & Class D 2,500\' MSL Boundaries', status: true },
    { id: 'req-3', title: 'Special VFR (SVFR) Coastal Fog Operating Minimums', status: true },
    { id: 'req-4', title: 'Carrier Aircraft Landing Area (CALA) Deck Rules', status: true },
    { id: 'req-5', title: 'Camp Pendleton BEARMAT Range R-2503 Coordination', status: true },
  ];

  const filteredQuestions = EXAM_QUESTIONS_DATA.filter(
    (q) => q.position === activePosition || activePosition === 'tower'
  );

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (isExamSubmitted) return;
    setSelectedAnswers({ ...selectedAnswers, [questionId]: optionIdx });
    audioEngine.playSquelch('press');
  };

  const calculateScore = () => {
    let correct = 0;
    filteredQuestions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctIndex) {
        correct++;
      }
    });
    return {
      correct,
      total: filteredQuestions.length,
      percentage: Math.round((correct / (filteredQuestions.length || 1)) * 100),
    };
  };

  const scoreInfo = calculateScore();

  const handleResetExam = () => {
    setSelectedAnswers({});
    setIsExamSubmitted(false);
    audioEngine.playSquelch('press');
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 font-mono">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">KNFG ATC POSITION QUALIFICATION CHECKOUT</h2>
            <p className="text-xs text-slate-400">MCAS Camp Pendleton Air Traffic Control Specialist Certification Exam</p>
          </div>
        </div>

        {/* Position Switcher */}
        <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex items-center space-x-1 text-xs">
          {(['tower', 'ground', 'flight_data', 'par_asr'] as ControlPosition[]).map((pos) => (
            <button
              key={pos}
              onClick={() => {
                onPositionChange(pos);
                handleResetExam();
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activePosition === pos ? 'bg-rose-500 text-slate-950 shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {pos === 'tower' && 'Tower'}
              {pos === 'ground' && 'Ground'}
              {pos === 'flight_data' && 'Clearance'}
              {pos === 'par_asr' && 'PAR/ASR'}
            </button>
          ))}
        </div>
      </div>

      {/* Position Qualification Requirements Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm text-slate-100 uppercase">
            POSITION CHECKOUT PREREQUISITES ({activePosition.toUpperCase()})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {positionChecklist.map((req) => (
            <div
              key={req.id}
              className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2.5 text-slate-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{req.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Exam Paper */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-rose-400" />
              PRACTICE QUALIFICATION EXAM
            </h3>
            <p className="text-xs text-slate-400">Answer all questions based on FAA JO 7110.65 & KNFG LOP 3710.1</p>
          </div>

          {isExamSubmitted && (
            <div
              className={`px-4 py-2 rounded-xl font-bold border text-sm flex items-center space-x-2 ${
                scoreInfo.percentage >= 80
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              <Award className="w-5 h-5" />
              <span>
                SCORE: {scoreInfo.percentage}% ({scoreInfo.percentage >= 80 ? 'PASSED QUALIFICATION' : 'FAILED - RETAKE REQUIRED'})
              </span>
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {filteredQuestions.map((q, qIdx) => {
            const isAnswered = selectedAnswers[q.id] !== undefined;
            const isCorrect = selectedAnswers[q.id] === q.correctIndex;

            return (
              <div
                key={q.id}
                className="bg-slate-950 p-5 rounded-2xl border border-slate-800/90 space-y-3"
              >
                <div className="flex items-start justify-between gap-2 text-xs">
                  <span className="font-bold text-sky-400 text-sm">
                    Q{qIdx + 1}. {q.question}
                  </span>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono shrink-0">
                    {q.reference}
                  </span>
                </div>

                {/* Options List */}
                <div className="space-y-2 text-xs">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[q.id] === optIdx;
                    let optStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';

                    if (isExamSubmitted) {
                      if (optIdx === q.correctIndex) {
                        optStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold';
                      } else if (isSelected && !isCorrect) {
                        optStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-300';
                      }
                    } else if (isSelected) {
                      optStyle = 'bg-rose-500/10 border-rose-500/50 text-rose-300 font-bold';
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center space-x-3 ${optStyle}`}
                      >
                        <span className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Box after Exam Submission */}
                {isExamSubmitted && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                    <span className="text-amber-400 font-bold block text-[10px] uppercase">Official Standard Explanation:</span>
                    <p>{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={handleResetExam}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Exam</span>
          </button>

          {!isExamSubmitted && (
            <button
              onClick={() => {
                setIsExamSubmitted(true);
                audioEngine.playSquelch('release');
              }}
              disabled={Object.keys(selectedAnswers).length < filteredQuestions.length}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 shadow-lg ${
                Object.keys(selectedAnswers).length < filteredQuestions.length
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/20 font-bold'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Submit Exam for Qualification</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
