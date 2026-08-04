import React, { useState } from 'react';
import { Flashcard } from '../types';
import { FLASHCARDS_DATA } from '../data/knfgData';
import { audioEngine } from '../utils/audio';
import {
  FileText,
  RotateCw,
  CheckCircle,
  XCircle,
  Sparkles,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Award,
} from 'lucide-react';

export const Flashcards: React.FC = () => {
  const [cards, setCards] = useState<Flashcard[]>(FLASHCARDS_DATA);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  const categories = ['All', 'Class D Rules', 'Phraseology', 'KNFG Airfield', 'Emergency & SVFR', 'PAR/ASR GCA', 'LOPs & LOAs'];

  const filteredCards = selectedCategory === 'All'
    ? cards
    : cards.filter((c) => c.category === selectedCategory);

  const currentCard = filteredCards[currentIndex] || filteredCards[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
    audioEngine.playSquelch('press');
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
    audioEngine.playSquelch('press');
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    audioEngine.playSquelch('press');
  };

  const toggleMastered = (id: string) => {
    const next = new Set(masteredIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setMasteredIds(next);
    audioEngine.playSquelch('release');
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">KNFG ATC QUALIFICATION FLASHCARDS</h2>
            <p className="text-xs text-slate-400">FAA JO 7110.65 Standards, KNFG Airfield Data & LOP Rules</p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs flex items-center space-x-3">
          <div>
            <span className="text-slate-500 block text-[10px]">MASTERED</span>
            <span className="text-emerald-400 font-bold text-sm">
              {masteredIds.size} / {cards.length}
            </span>
          </div>
          <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${(masteredIds.size / cards.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Category Filter & Shuffle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-2 rounded-xl border border-slate-800 font-mono text-xs">
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={handleShuffle}
          className="bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 font-bold transition-all"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Shuffle Deck</span>
        </button>
      </div>

      {/* Main Interactive Flashcard Card */}
      {currentCard ? (
        <div className="space-y-4 font-mono">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`w-full min-h-[320px] bg-slate-900 border cursor-pointer rounded-2xl p-8 shadow-2xl flex flex-col justify-between transition-all duration-300 transform hover:scale-[1.01] ${
              isFlipped
                ? 'border-purple-500/60 bg-gradient-to-b from-slate-900 to-purple-950/30'
                : 'border-slate-800 bg-slate-900'
            }`}
          >
            {/* Card Header Tag */}
            <div className="flex items-center justify-between">
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-2.5 py-1 rounded-lg font-bold">
                {currentCard.category}
              </span>

              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span>
                  Card {currentIndex + 1} of {filteredCards.length}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400">{currentCard.difficulty}</span>
              </div>
            </div>

            {/* Main Question / Answer Display */}
            <div className="my-6 text-center px-4">
              {!isFlipped ? (
                <div className="space-y-3">
                  <span className="text-slate-500 text-xs font-bold block uppercase tracking-wider">QUESTION:</span>
                  <p className="text-lg md:text-xl font-bold text-slate-100 leading-relaxed">
                    {currentCard.question}
                  </p>
                  <p className="text-xs text-slate-500 italic mt-4">
                    (Click anywhere on the card to reveal the standard answer & reference)
                  </p>
                </div>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <span className="text-purple-400 text-xs font-bold block uppercase tracking-wider">STANDARD ANSWER:</span>
                  <p className="text-base md:text-lg font-bold text-emerald-300 leading-relaxed">
                    {currentCard.answer}
                  </p>

                  <div className="pt-4 border-t border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block uppercase font-bold">Standard Reference:</span>
                    <span className="text-sky-400 text-xs font-bold">{currentCard.reference}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer Bar */}
            <div className="flex items-center justify-between text-xs pt-4 border-t border-slate-800/80">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMastered(currentCard.id);
                }}
                className={`px-3 py-1.5 rounded-lg border font-bold flex items-center space-x-1.5 transition-all ${
                  masteredIds.has(currentCard.id)
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{masteredIds.has(currentCard.id) ? 'Mastered' : 'Mark Mastered'}</span>
              </button>

              <span className="text-slate-500 text-[11px] flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" /> Click to Flip
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Card</span>
            </button>

            <button
              onClick={handleNext}
              className="bg-purple-600 hover:bg-purple-500 text-slate-950 px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg text-xs"
            >
              <span>Next Card</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500 font-mono text-xs bg-slate-900 rounded-2xl border border-slate-800">
          No flashcards found in this category.
        </div>
      )}
    </div>
  );
};
