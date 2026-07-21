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
            className="fixed bottom-24 right-6 w-[420px] h-[650px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 flex overflow-hidden z-50 ring-1 ring-black/5"
          >
            {/* Sidebar for Sessions */}
            <div className={`absolute inset-y-0 left-0 w-64 bg-slate-50/95 backdrop-blur-md border-r border-border transition-transform duration-300 z-20 flex flex-col ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
              <div className="p-4 border-b border-border flex items-center justify-between bg-background/50">
                <span className="font-semibold text-sm text-foreground">Chat History</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-200 rounded-md transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="p-3 border-b border-border">
                <Button onClick={createSession} variant="default" className="w-full text-xs shadow-sm" size="sm">
                  <Plus className="w-4 h-4 mr-2" /> New Chat
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${activeSession?.id === s.id ? 'bg-primary text-white shadow-md font-medium' : 'hover:bg-slate-200/70 text-muted-foreground'}`}
                  >
                    <div className="truncate">{s.title || "New Conversation"}</div>
                    <div className={`text-[10px] mt-0.5 ${activeSession?.id === s.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {new Date(s.updated_at || s.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full bg-transparent relative z-10">
              {/* Header */}
              <div className="h-16 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur-md shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-xl text-muted-foreground transition-colors">
                    <Menu className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground leading-tight">AI Tutor</h3>
                      <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                      </p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gradient-to-b from-slate-50/50 to-white scroll-smooth">
                {!activeSession && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                    <MessageSquare className="w-12 h-12 mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Select or create a chat session.</p>
                    <Button onClick={createSession} className="mt-4 shadow-sm" size="sm"><Plus className="w-4 h-4 mr-2" /> New Chat</Button>
                  </div>
                )}
                
                {activeSession?.messages?.length === 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 text-primary rounded-2xl flex items-center justify-center mb-5 shadow-sm transform rotate-3">
                      <Bot className="w-8 h-8 -rotate-3" />
                    </div>
                    <h4 className="font-bold mb-2 text-foreground text-lg">How can I help you?</h4>
                    <p className="text-sm text-muted-foreground max-w-[250px] leading-relaxed">
                      Ask me to explain a concept, summarize the chapter, or test you with a quiz!
                    </p>
                  </motion.div>
                )}

                {activeSession?.messages?.map((msg: any, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    key={msg.id || i} 
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-background border border-border text-primary'}`}>
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`px-4 py-3 max-w-[82%] text-sm shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-background border border-border rounded-2xl rounded-tl-sm text-foreground prose prose-sm prose-p:leading-relaxed prose-pre:bg-secondary prose-pre:text-foreground'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-background border border-border text-primary flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-background border border-border shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                
                <div ref={endOfMessagesRef} />
              </div>

              {/* Input */}
              {activeSession && (
                <div className="p-4 bg-background border-t border-border">
                  <form onSubmit={sendMessage} className="relative flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything..."
                      className="w-full bg-slate-50 border border-border hover:border-border rounded-full pl-5 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all shadow-inner"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="absolute right-1.5 p-2.5 bg-primary text-white rounded-full shadow-md disabled:opacity-50 disabled:shadow-none hover:bg-primary/90 transition-all"
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
