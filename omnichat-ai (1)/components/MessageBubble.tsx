import React from 'react';
import { Message } from '../types';
import MarkdownText from './MarkdownText';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div
      className={`flex w-full animate-fade-in-up ${
        isUser ? 'justify-end' : 'justify-start'
      } mb-6`}
    >
      <div
        className={`flex max-w-[90%] md:max-w-[75%] lg:max-w-[60%] flex-col ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div className={`text-xs text-gray-500 mb-1 px-1 font-mono uppercase tracking-tighter`}>
            {isUser ? 'Client' : 'Razor Ava'}
        </div>
        <div
          className={`relative px-5 py-3.5 rounded-2xl shadow-sm ${
            isUser
              ? 'bg-red-700 text-white rounded-br-none'
              : isError
              ? 'bg-red-900/50 border border-red-700 text-red-100 rounded-bl-none'
              : 'bg-gray-800 border border-gray-700/50 text-gray-100 rounded-bl-none'
          }`}
        >
          {isUser ? (
             <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
          ) : (
             <MarkdownText content={message.text} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
