import { createSignal, createEffect, For, Show } from "solid-js";
import "./ChatApp.css";

const ChatApp = () => {
  const [messages, setMessages] = createSignal([]);
  const [inputValue, setInputValue] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  let messagesEndRef;
  let textareaRef;

  const scrollToBottom = () => {
    messagesEndRef?.scrollIntoView({ behavior: "smooth" });
  };

  createEffect(() => {
    if (messages().length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  });

  const generateAIResponse = async (userMessage) => {
    const endpoints = [
      "http://127.0.0.1:8000/generate",
      "http://localhost:8000/generate",
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          mode: "cors",
          body: JSON.stringify({
            prompt: userMessage,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Server error: ${response.status} - ${response.statusText}`
          );
        }
        const data = await response.json();

        console.log("Success with endpoint:", endpoint);
        return data.response || "Sorry, empty response from Gemini.";
      } catch (error) {
        console.log(`Failed with ${endpoint}:`, error.message);
        continue;
      }
    }

    throw new Error(
      "Cannot connect to server. Please check:\n1. Server is running\n2. Server allows CORS\n3. Server is on port 8000 or 5000"
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const message = inputValue().trim();
    if (!message || isLoading()) return;

    const userMessage = {
      id: Date.now(),
      text: message,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError("");

    if (textareaRef) {
      textareaRef.style.height = "auto";
    }

    try {
      const aiResponseText = await generateAIResponse(message);
      const aiMessage = {
        id: Date.now() + 1,
        text: aiResponseText,
        sender: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: error.message,
        sender: "assistant",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef) {
      textareaRef.style.height = "auto";
      textareaRef.style.height = Math.min(textareaRef.scrollHeight, 150) + "px";
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
    textareaRef?.focus();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const retryLastMessage = () => {
    const lastUserMessage = messages()
      .filter((m) => m.sender === "user")
      .pop();
    if (lastUserMessage) {
      setInputValue(lastUserMessage.text);
      setMessages((prev) =>
        prev.filter(
          (m) => !m.isError || m.id !== messages()[messages().length - 1].id
        )
      );
    }
  };

  return (
    <div class="chat-app">
      <div class="chat-header">
        <div class="header-content">
          <div class="app-title">
            <div class="app-icon">✨</div>
            <h1>AI Assistant</h1>
          </div>
          <div class="header-actions">
            <Show when={error()}>
              <div class="connection-status error">⚠️ Connection Error</div>
            </Show>
            <Show when={messages().length > 0}>
              <button class="clear-btn" onClick={clearChat}>
                Clear Chat
              </button>
            </Show>
          </div>
        </div>
      </div>

      <div class="messages-area">
        <Show when={messages().length === 0}>
          <div class="welcome-container">
            <div class="welcome-content">
              <div class="welcome-icon">💬</div>
              <h2>How can I help you today?</h2>
              <p>
                Start a conversation by typing a message below. I'm here to
                assist you with questions, tasks, or just have a friendly chat!
              </p>

              <div class="suggestion-chips">
                <button
                  class="suggestion-chip"
                  onClick={() =>
                    setInputValue("What's the weather like today?")
                  }
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
                <div
                  class={`message-wrapper ${message.sender} ${
                    message.isError ? "error" : ""
                  }`}
                >
                  <div class="message-bubble">
                    <div class="message-content">{message.text}</div>
                    <div class="message-actions">
                      <div class="message-time">
                        {formatTime(message.timestamp)}
                      </div>
                      <Show when={message.isError}>
                        <button class="retry-btn" onClick={retryLastMessage}>
                          🔄 Retry
                        </button>
                      </Show>
                    </div>
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
              <Show when={isLoading()}>
                <div class="button-spinner"></div>
              </Show>
              <Show when={!isLoading()}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </Show>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatApp;
