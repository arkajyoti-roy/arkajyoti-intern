import { createSignal, createEffect, For, Show } from 'solid-js';
import './ChatApp.css';

const ChatApp = () => {
  const [messages, setMessages] = createSignal([]);
  const [inputValue, setInputValue] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);

  let messagesEndRef;
  let textareaRef;

  const scrollToBottom = () => {
    messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
  };

  createEffect(() => {
    if (messages().length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  });

  const generateAIResponse = (userMessage) => {
    const responses = [
      "That's a fascinating question! Let me share some insights on this topic that might help you understand it better.",
      "I appreciate you bringing this up. Here's what I think about your question, along with some additional context.",
      "Great point! This is definitely something worth exploring. Let me break down my thoughts on this for you.",
      "I find this topic really interesting. Based on what you've asked, here are some key considerations to keep in mind.",
      "Thanks for asking! This gives me a chance to dive into a subject I think you'll find valuable to understand.",
      "I'm glad you're curious about this. Let me provide you with a comprehensive perspective on what you've asked.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const message = inputValue().trim();
    if (!message || isLoading()) return;

    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef) {
      textareaRef.style.height = 'auto';
    }

    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        text: generateAIResponse(message),
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 800 + Math.random() * 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef) {
      textareaRef.style.height = 'auto';
      textareaRef.style.height = Math.min(textareaRef.scrollHeight, 150) + 'px';
    }
  };

  const clearChat = () => {
    setMessages([]);
    textareaRef?.focus();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <div class="chat-app">
      {/* Header */}
      <div class="chat-header">
        <div class="header-content">
          <div class="app-title">
            <div class="app-icon">✨</div>
            <h1>AI Assistant</h1>
          </div>
          <Show when={messages().length > 0}>
            <button class="clear-btn" onClick={clearChat}>
              Clear Chat
            </button>
          </Show>
        </div>
      </div>

      {/* Messages Area */}
      <div class="messages-area">
        <Show when={messages().length === 0}>
          <div class="welcome-container">
            <div class="welcome-content">
              <div class="welcome-icon">💬</div>
              <h2>How can I help you today?</h2>
              <p>Start a conversation by typing a message below. I'm here to assist you with questions, tasks, or just have a friendly chat!</p>
              
              <div class="suggestion-chips">
                <button 
                  class="suggestion-chip" 
                  onClick={() => setInputValue("What's the weather like today?")}
                >
                  Ask about weather
                </button>
                <button 
                  class="suggestion-chip"
                  onClick={() => setInputValue("Help me plan my day")}
                >
                  Plan my day
                </button>
                <button 
                  class="suggestion-chip"
                  onClick={() => setInputValue("Tell me a fun fact")}
                >
                  Tell me a fun fact
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={messages().length > 0}>
          <div class="messages-container">
            <For each={messages()}>
              {(message) => (
                <div class={`message-wrapper ${message.sender}`}>
                  <div class="message-bubble">
                    <div class="message-content">{message.text}</div>
                    <div class="message-time">{formatTime(message.timestamp)}</div>
                  </div>
                </div>
              )}
            </For>
            
            <Show when={isLoading()}>
              <div class="message-wrapper assistant">
                <div class="message-bubble loading">
                  <div class="typing-animation">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                  </div>
                </div>
              </div>
            </Show>
            
            <div ref={messagesEndRef}></div>
          </div>
        </Show>
      </div>

      {/* Input Area */}
      <div class="input-area">
        <form class="input-form" onSubmit={handleSubmit}>
          <div class="input-container">
            <textarea
              ref={textareaRef}
              class="message-input"
              placeholder="Type your message..."
              value={inputValue()}
              onInput={(e) => {
                setInputValue(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              rows="1"
              disabled={isLoading()}
            />
            <button 
              type="submit" 
              class="send-button"
              disabled={!inputValue().trim() || isLoading()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatApp;