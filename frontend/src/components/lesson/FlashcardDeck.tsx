"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Lightbulb, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Flashcard } from "@/types";

export function FlashcardDeck({ flashcards }: { flashcards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!flashcards || flashcards.length === 0) return null;

  const current = flashcards[currentIndex];

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % flashcards.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((i) => (i - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Knowledge Check
        </h3>
        <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
          {currentIndex + 1} / {flashcards.length}
        </span>
      </div>

      <div className="relative h-64 sm:h-80 w-full perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex + (isFlipped ? "-back" : "-front")}
            initial={{ rotateX: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
            className={`absolute inset-0 w-full h-full rounded-2xl cursor-pointer p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-lg border ${
              isFlipped 
                ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" 
                : "bg-background border-border hover:shadow-xl transition-shadow"
            }`}
          >
            {!isFlipped ? (
              <>
                <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4">Question</p>
                <h4 className="text-xl sm:text-2xl font-medium text-foreground balance-text">
                  {current.question}
                </h4>
                <p className="absolute bottom-4 sm:bottom-6 text-sm text-muted-foreground animate-pulse">
                  Click to flip
                </p>
              </>
            ) : (
              <>
                <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-4">Answer</p>
                <p className="text-lg sm:text-xl text-foreground font-medium mb-4">
                  {current.answer}
                </p>
                
                {(current.memory_tricks || current.quick_notes) && (
                  <div className="mt-4 p-4 bg-background/60 rounded-xl border border-primary/10 w-full max-w-md">
                    {current.memory_tricks && (
                      <div className="flex items-start gap-2 text-sm text-left">
                        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground"><strong className="text-foreground">Trick:</strong> {current.memory_tricks}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <Button variant="outline" size="icon" onClick={prevCard} className="rounded-full w-12 h-12">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={nextCard} className="rounded-full w-12 h-12">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
