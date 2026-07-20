"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, User as UserIcon, Plus, Menu } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function ChatWidget({ lessonId, courseId }: { lessonId?: number; courseId?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  const loadSessions = async () => {
    try {
      const data = await api.chatSessions();
      setSessions(data);
      if (data.length > 0 && !activeSession) {
        loadSession(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load chat sessions", err);
    }
  };

  const loadSession = async (id: number) => {
    setSidebarOpen(false);
    try {
      const data = await api.chatSession(id);
      setActiveSession(data);
    } catch (err) {
      console.error("Failed to load chat session", err);
    }
  };

  const createSession = async () => {
    try {
      const newSession = await api.createChatSession({ lesson_id: lessonId, course_id: courseId });
      setSessions([newSession, ...sessions]);
      setActiveSession(newSession);
      setSidebarOpen(false);
    } catch (err) {
      console.error("Failed to create chat session", err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSession || loading) return;

    const messageContent = input.trim();
    setInput("");
    
    // Optimistic UI update
    const optimisticMessage = {
      id: Date.now(),
      role: "user",
      content: messageContent,
      created_at: new Date().toISOString()
    };
    
    setActiveSession((prev: any) => ({
      ...prev,
      messages: [...(prev.messages || []), optimisticMessage]
    }));
    
    setLoading(true);

    try {
      const responseMsg = await api.sendMessage(activeSession.id, { content: messageContent }, lessonId);
      setActiveSession((prev: any) => ({
        ...prev,
        messages: [...(prev.messages || []), responseMsg]
      }));
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-primary text-white rounded-full shadow-xl hover:scale-105 transition-transform z-40"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[400px] h-[600px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-border flex overflow-hidden z-50"
          >
            {/* Sidebar for Sessions */}
            <div className={`absolute inset-y-0 left-0 w-64 bg-secondary/50 border-r border-border transition-transform duration-300 z-10 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-sm">Chat History</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-2 border-b border-border">
                <Button onClick={createSession} variant="default" className="w-full text-xs" size="sm">
                  <Plus className="w-4 h-4 mr-2" /> New Chat
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeSession?.id === s.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-white text-muted-foreground'}`}
                  >
                    <div className="truncate">{s.title}</div>
                    <div className="text-[10px] opacity-70">{new Date(s.updated_at || s.created_at).toLocaleDateString()}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full bg-white relative z-0">
              {/* Header */}
              <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-white">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground">
                    <Menu className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" /> AI Tutor
                    </h3>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {!activeSession && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                    <MessageSquare className="w-12 h-12 mb-3 text-muted-foreground" />
                    <p className="text-sm">Select or create a chat session.</p>
                    <Button onClick={createSession} className="mt-4" size="sm"><Plus className="w-4 h-4 mr-2" /> New Chat</Button>
                  </div>
                )}
                
                {activeSession?.messages?.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                      <Bot className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold mb-2">How can I help you?</h4>
                    <p className="text-sm text-muted-foreground max-w-[250px]">
                      Ask me to explain a concept, summarize the chapter, or test you with a quiz!
                    </p>
                  </div>
                )}

                {activeSession?.messages?.map((msg: any, i: number) => (
                  <div key={msg.id || i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground'}`}>
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-tr-sm' 
                        : 'bg-white border border-border shadow-sm rounded-tl-sm text-foreground prose prose-sm'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                
                <div ref={endOfMessagesRef} />
              </div>

              {/* Input */}
              {activeSession && (
                <div className="p-3 bg-white border-t border-border">
                  <form onSubmit={sendMessage} className="relative flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything..."
                      className="w-full bg-secondary/50 border border-border rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="absolute right-1.5 p-2 bg-primary text-white rounded-full disabled:opacity-50 transition-opacity"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
