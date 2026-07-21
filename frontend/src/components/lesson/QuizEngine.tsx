"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, HelpCircle, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { QuizQuestion } from "@/types";

export function QuizEngine({ questions, onComplete }: { questions: QuizQuestion[], onComplete?: (score: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!questions || questions.length === 0) return null;

  const current = questions[currentIndex];
  
  // Format options: it could be a dict like {"A": "Option 1", "B": "Option 2"}
  // Or it could be a list of strings like ["Option 1", "Option 2"]
  // Or it could be null (for True/False questions)
  let optionsList: { key: string, val: string }[] = [];
  if (current.options) {
    if (Array.isArray(current.options)) {
      optionsList = current.options.map((val, i) => ({ key: String.fromCharCode(65 + i), val: String(val) }));
    } else {
      optionsList = Object.entries(current.options).map(([key, val]) => ({ key, val: String(val) }));
    }
  } else {
    optionsList = [
      { key: "True", val: "True" },
      { key: "False", val: "False" }
    ];
  }

  const handleSelect = (key: string) => {
    if (isRevealed) return;
    setSelectedAnswer(key);
  };

  const checkAnswer = () => {
    if (!selectedAnswer) return;
    
    // Sometimes the correct_answer is just "A", sometimes it's the full text. 
    // We check if the selected key matches, or if the value matches.
    const selectedOption = optionsList.find(opt => opt.key === selectedAnswer);
    const isCorrect = 
      selectedAnswer === current.correct_answer || 
      (selectedOption && selectedOption.val === current.correct_answer);
      
    if (isCorrect) {
      setScore(s => s + 1);
    }
    setIsRevealed(true);
  };

  const nextQuestion = () => {
    if (currentIndex === questions.length - 1) {
      setIsFinished(true);
      if (onComplete) {
        onComplete(Math.round((score / questions.length) * 100));
      }
    } else {
      setSelectedAnswer(null);
      setIsRevealed(false);
      setCurrentIndex(i => i + 1);
    }
  };

  const restart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setScore(0);
    setIsFinished(false);
  };

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="w-full max-w-2xl mx-auto my-12 p-8 bg-background border border-border rounded-2xl shadow-sm text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Quiz Completed!</h3>
        <p className="text-muted-foreground mb-6">You scored {score} out of {questions.length}</p>
        
        <div className="w-full bg-secondary rounded-full h-4 mb-8 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${percentage >= 70 ? 'bg-emerald-500' : percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
          />
        </div>
        
        <Button onClick={restart} size="lg" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    );
  }

  const selectedOption = optionsList.find(opt => opt.key === selectedAnswer);
  const isCorrect = isRevealed && (
    selectedAnswer === current.correct_answer || 
    (selectedOption && selectedOption.val === current.correct_answer)
  );

  return (
    <div className="w-full max-w-3xl mx-auto my-12">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Test Your Understanding
        </h3>
        <span className="text-sm font-medium text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </span>
      </div>
      
      <Progress value={((currentIndex) / questions.length) * 100} className="mb-8 h-1.5" />

      <div className="bg-background rounded-2xl border border-border shadow-sm p-6 sm:p-8">
        {current.difficulty && (
          <span className="inline-block px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            {current.difficulty}
          </span>
        )}
        <h4 className="text-lg sm:text-xl font-medium text-foreground mb-8">
          {current.question}
        </h4>

        <div className="space-y-3">
          {optionsList.map(({ key, val }) => {
            const isSelected = selectedAnswer === key;
            const isActuallyCorrect = key === current.correct_answer || val === current.correct_answer;
            
            let buttonClass = "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 ";
            
            if (!isRevealed) {
              buttonClass += isSelected 
                ? "border-primary bg-primary/5 ring-1 ring-primary" 
                : "border-border hover:border-primary/50 hover:bg-secondary/50";
            } else {
              if (isActuallyCorrect) {
                buttonClass += "border-emerald-500 bg-emerald-50 text-emerald-900";
              } else if (isSelected && !isActuallyCorrect) {
                buttonClass += "border-red-500 bg-red-50 text-red-900";
              } else {
                buttonClass += "border-border opacity-50";
              }
            }

            return (
              <button 
                key={key} 
                onClick={() => handleSelect(key)}
                disabled={isRevealed}
                className={buttonClass}
              >
                <div className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center mt-0.5 text-xs font-bold
                  ${isRevealed && isActuallyCorrect ? "bg-emerald-500 border-emerald-500 text-white" : 
                    isRevealed && isSelected && !isActuallyCorrect ? "bg-red-500 border-red-500 text-white" : 
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"}
                `}>
                  {key}
                </div>
                <span className="text-base font-medium leading-relaxed">{val}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {isRevealed && (
            <motion.div 
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}
            >
              {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold mb-1">{isCorrect ? 'Correct!' : 'Not quite right.'}</p>
                {current.explanation && <p className="text-sm opacity-90">{current.explanation}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex justify-end">
          {!isRevealed ? (
            <Button onClick={checkAnswer} disabled={!selectedAnswer} size="lg">
              Check Answer
            </Button>
          ) : (
            <Button onClick={nextQuestion} size="lg" className="gap-2">
              {currentIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"} <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
