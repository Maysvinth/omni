import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GenerateContentResponse } from "@google/genai";
import { Message } from './types';
import { sendMessageStream, resetChatSession } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import TypingIndicator from './components/TypingIndicator';

// Icons
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const MicIcon = ({ isListening }: { isListening: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${isListening ? 'animate-pulse text-red-500' : 'text-gray-400'}`}>
    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
    <path d="M6 10.5a.75.75 0 01.75.75 5.25 5.25 0 1010.5 0 .75.75 0 011.5 0 6.75 6.75 0 01-6 6.709V21h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-3.791a6.75 6.75 0 01-6-6.709.75.75 0 01.75-.75z" />
  </svg>
);

// Declare global types for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText((prev) => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + transcript);
        adjustTextareaHeight();
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // Adjust textarea height automatically
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      resetChatSession();
      setMessages([]);
      setInputText('');
      if(inputRef.current) inputRef.current.focus();
    }
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    // Stop listening if user hits send
    if (isListening) {
      recognitionRef.current?.stop();
    }

    const userText = inputText.trim();
    setInputText('');
    
    // Reset height of textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    // Create a placeholder for the AI response
    const botMessageId = (Date.now() + 1).toString();
    const initialBotMessage: Message = {
      id: botMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now() + 1,
    };

    setMessages((prev) => [...prev, initialBotMessage]);

    try {
      const stream = await sendMessageStream(userText);
      let accumulatedText = '';

      for await (const chunk of stream) {
        const chunkResponse = chunk as GenerateContentResponse;
        const chunkText = chunkResponse.text;
        
        if (chunkText) {
          accumulatedText += chunkText;
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === botMessageId 
                ? { ...msg, text: accumulatedText } 
                : msg
            )
          );
        }
      }
    } catch (error) {
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === botMessageId 
            ? { ...msg, text: "I'm sorry, I encountered an error. Even I have limits, apparently.", isError: true } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      // Focus back on input after sending for desktop
      if (window.matchMedia('(min-width: 768px)').matches) {
          inputRef.current?.focus();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 font-sans selection:bg-red-500/30">
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 z-10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center shadow-lg shadow-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                   <path d="M11.644 1.59a.75.75 0 01.712 0l9.75 5.25a.75.75 0 010 1.32l-9.75 5.25a.75.75 0 01-.712 0l-9.75-5.25a.75.75 0 010-1.32l9.75-5.25z" />
                   <path d="M3.265 10.602l7.667 4.128a1.5 1.5 0 001.336 0l7.667-4.128 1.8 1.05a.75.75 0 010 1.32l-9.75 5.25a.75.75 0 01-.712 0l-9.75-5.25a.75.75 0 010-1.32l1.727-.95z" />
                   <path d="M3.265 14.352l7.667 4.128a1.5 1.5 0 001.336 0l7.667-4.128 1.8 1.05a.75.75 0 010 1.32l-9.75 5.25a.75.75 0 01-.712 0l-9.75-5.25a.75.75 0 010-1.32l1.727-.95z" />
                </svg>
            </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Razor Ava</h1>
            <p className="text-xs text-red-500 font-medium">SHARP • EDGY • PRECISE</p>
          </div>
        </div>
        <button 
          onClick={handleClearChat}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Wipe Memory"
        >
          <TrashIcon />
        </button>
      </header>

      {/* Messages Area */}
      <main className="flex-grow overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end">
            {messages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 space-y-4 opacity-50 select-none pb-20">
                    <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-300">Razor Ava is online.</h3>
                        <p className="text-sm mt-1">Don't waste my cycles. What do you need?</p>
                    </div>
                </div>
            ) : (
                <>
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                {isLoading && (
                    <div className="flex w-full justify-start mb-6 animate-fade-in-up">
                        <TypingIndicator />
                    </div>
                )}
                </>
            )}
            <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-none p-4 bg-gray-900 border-t border-gray-800">
        <div className="max-w-3xl mx-auto relative group">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type or use your voice. Make it quick."
            rows={1}
            className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-2xl pl-5 pr-24 py-4 resize-none focus:outline-none focus:ring-2 focus:ring-red-600/50 shadow-lg border border-gray-700/50 max-h-48 overflow-y-auto"
            disabled={isLoading}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              onClick={toggleListening}
              type="button"
              className={`p-2 rounded-xl transition-all duration-200 ${isListening ? 'bg-red-500/20' : 'hover:bg-gray-700'}`}
              title={isListening ? "Stop listening" : "Speak to me"}
            >
              <MicIcon isListening={isListening} />
            </button>
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-500 disabled:opacity-50 disabled:bg-transparent disabled:text-gray-500 transition-all duration-200"
            >
              <SendIcon />
            </button>
          </div>
        </div>
        <div className="text-center mt-2">
             <p className="text-[10px] text-gray-600 uppercase tracking-widest">Ava is processing. Accuracy not guaranteed for mere mortals.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
