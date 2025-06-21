import { createSignal, createEffect, For, Show } from "solid-js";
import "./ChatApp.css";

const ChatApp = () => {
  const [messages, setMessages] = createSignal([]);
  const [inputValue, setInputValue] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pendingPost, setPendingPost] = createSignal("");
  const [isPosting, setIsPosting] = createSignal(false);

  let textareaRef, messagesEndRef;

  const addMessage = (text, sender, isError = false) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text, sender, timestamp: new Date(), isError },
    ]);
  };

  const generateAIResponse = async (text) => {
    const endpoints = ["http://127.0.0.1:8000/generate", "http://localhost:8000/generate"];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          mode: "cors",
          body: JSON.stringify({ prompt: text }),
        });
        if (res.ok) {
          const { response } = await res.json();
          return response || "Sorry, empty response.";
        }
        throw new Error(`Server error: ${res.status}`);
      } catch (err) {
        console.log(`Failed on ${url}:`, err.message);
      }
    }
    throw new Error("Server connection issue.");
  };

  const confirmAndPost = async () => {
    setIsPosting(true);
    try {
      const res = await fetch("http://localhost:8000/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pendingPost() }),
      });

      if (!res.ok) throw new Error(`Post failed: ${res.status}`);
      addMessage("✅ Tweet posted successfully!", "system");
      setPendingPost("");
    } catch (err) {
      addMessage(err.message, "assistant", true);
      setError(err.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = inputValue().trim();
    if (!msg || isLoading()) return;

    addMessage(msg, "user");
    setInputValue("");
    setIsLoading(true);
    setError("");
    if (textareaRef) textareaRef.style.height = "auto";

    try {
      const aiReply = await generateAIResponse(msg);
      addMessage(aiReply, "assistant");
      setPendingPost(aiReply);
    } catch (err) {
      addMessage(err.message, "assistant", true);
      setError(err.message);
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

  const clearChat = () => {
    setMessages([]);
    setError("");
    setPendingPost("");
    textareaRef?.focus();
  };

  const retryLastMessage = () => {
    const lastUser = [...messages()].reverse().find((m) => m.sender === "user");
    if (lastUser) {
      setInputValue(lastUser.text);
      setMessages((prev) => prev.filter((m) => !m.isError || m.id !== prev.at(-1).id));
    }
  };

  const formatTime = (d) => d.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true
  });

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
              <div class="connection-status error">Connection Error</div>
            </Show>
            <Show when={messages().length}>
              <button class="clear-btn" onClick={clearChat}>Clear Chat</button>
            </Show>
          </div>
        </div>
      </div>

      <div class="messages-area">
        <Show when={!messages().length}>
          <div class="welcome-container">
            <div class="welcome-content">
              <div class="welcome-icon">💬</div>
              <h2>How can I help you today?</h2>
              <p>Start a conversation below. I'm here to assist with questions, tasks, or friendly chats!</p>
              <div class="suggestion-chips">
                {["Suggest some load testing tools for APIs.", "Tell me a joke or a pun.", "Recommend a movie or series.", "Tell me a fun fact"].map((msg) => (
                  <button class="suggestion-chip" onClick={() => setInputValue(msg)}>{msg}</button>
                ))}
              </div>
            </div>
          </div>
        </Show>

        <Show when={messages().length}>
          <div class="messages-container">
            <For each={messages()}>
              {(msg) => (
                <div class={`message-wrapper ${msg.sender} ${msg.isError ? "error" : ""}`}>
                  <div class="message-bubble">
                    <div class="message-content">{msg.text}</div>
                    <div class="message-actions">
                      <div class="message-time">{formatTime(msg.timestamp)}</div>
                      <Show when={msg.isError}>
                        <button class="retry-btn" onClick={retryLastMessage}>Retry</button>
                      </Show>
                    </div>
                    <Show when={msg.text === pendingPost() && msg.sender === "assistant"}>
                      <div class="confirm-section">
                        <button class="post-btn" disabled={isPosting()} onClick={confirmAndPost}>
                          {isPosting() ? "Posting..." : "Post"}
                        </button>
                      </div>
                    </Show>
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
              onInput={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows="1"
              disabled={isLoading()}
            />
            <button type="submit" class="send-button" disabled={!inputValue().trim() || isLoading()}>
              <Show when={isLoading()}>
                <div class="button-spinner"></div>
              </Show>
              <Show when={!isLoading()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
