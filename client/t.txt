import { createSignal, For, Show } from "solid-js";
import { Base_URL } from "./url";

const ChatApp = () => {
  const [messages, setMessages] = createSignal([]);
  const [inputValue, setInputValue] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pendingPosts, setPendingPosts] = createSignal([]);
  const [isPosting, setIsPosting] = createSignal(false);

  let textareaRef, messagesEndRef;

  const stripMarkdown = (text) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1");

  const addMessage = (text, sender, isError = false, id = Date.now()) => {
    const isAssistant = sender === "assistant";
    setMessages((prev) => [
      ...prev,
      {
        id,
        text,
        sender,
        timestamp: new Date(),
        isError,
        editable: isAssistant,
      },
    ]);
  };

  const updateMessageText = (id, newText) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, text: newText } : msg))
    );
  };

  const generateAIResponse = async (text) => {
    const endpoints = [`${Base_URL}/generate`];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
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

  const confirmAndPost = async (text, id) => {
    setIsPosting(true);
    try {
      const res = await fetch(`${Base_URL}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`Post failed: ${res.status}`);
      addMessage("✅ Tweet posted successfully!", "system");
      setPendingPosts((prev) =>
        prev.map((item) => (item.id === id ? { ...item, posted: true } : item))
      );
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, editable: false } : msg))
      );
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
      const cleanReply = stripMarkdown(aiReply);
      const id = Date.now();
      addMessage(cleanReply, "assistant", false, id);
      setPendingPosts((prev) => [...prev, { id, posted: false }]);
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

  const autoResizeTextarea = (textarea) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    autoResizeTextarea(e.target);
  };

  const getGeneratedPosts = () => {
    return messages().filter(msg => msg.sender === "assistant" && !msg.isError);
  };

  const hasGeneratedPosts = () => getGeneratedPosts().length > 0;

  // Get the current user prompt (latest user message)
  const currentPrompt = () => {
    const userMessages = messages().filter(msg => msg.sender === "user");
    return userMessages.length > 0 ? userMessages[userMessages.length - 1].text : "";
  };

  return (
    <div class="min-h-screen bg-slate-50">
      {/* Error notification */}
      <Show when={error()}>
        <div class="fixed top-5 right-5 z-50 animate-pulse">
          <div class="bg-red-500 text-white px-5 py-3 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-red-500/30">
            <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            Connection Error
          </div>
        </div>
      </Show>

      {/* Header */}
      <header class="bg-white border-b border-slate-200 py-4 shadow-sm">
        <div class="max-w-4xl mx-auto px-4 flex items-center justify-center">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-slate-800">PostCraft AI</h1>
          </div>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-4 py-8">
        {/* Generated Posts Section - Shows above input when posts exist */}
        <Show when={hasGeneratedPosts()}>
          <div class="space-y-6">
            {/* User Prompt Display */}
            <Show when={currentPrompt()}>
              <div class="mb-6">
                <div class="flex items-center gap-2 mb-3">
                  <div class="flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                    </svg>
                    Your Request
                  </div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  {currentPrompt()}
                </div>
              </div>
            </Show>

            {/* Generated Posts Section */}
            <div class="mb-8">
              <div class="text-center mb-6">
                <h2 class="text-xl font-bold text-slate-800">Generated Posts</h2>
              </div>

              <div class="space-y-6">
                <Show when={isLoading()}>
                  <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                    <div class="p-4 pb-0 flex items-center justify-between">
                      <div class="flex items-center gap-2 bg-slate-400 text-white px-3 py-1 rounded-md text-sm font-semibold">
                        <div class="flex gap-1">
                          <div class="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                          <div class="w-1 h-1 bg-white rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                          <div class="w-1 h-1 bg-white rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                        </div>
                        Generating...
                      </div>
                    </div>
                    <div class="p-4">
                      <div class="bg-slate-50 p-4 rounded-lg">
                        <div class="h-3.5 bg-slate-200 rounded mb-2 animate-pulse"></div>
                        <div class="h-3.5 bg-slate-200 rounded mb-2 animate-pulse"></div>
                        <div class="h-3.5 bg-slate-200 rounded w-3/5 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </Show>

                <For each={getGeneratedPosts()}>
                  {(msg) => (
                    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                      <div class="p-4 pb-0 flex items-center justify-between">
                        <div class="flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold">
                          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                          </svg>
                          Generated Post
                        </div>
                        <div class="text-slate-500 text-sm font-medium">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      <div class="p-4">
                        <Show when={msg.editable}>
                          <textarea
                            class="w-full min-h-32 p-4 border-2 border-slate-200 rounded-lg resize-vertical transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10"
                            value={msg.text}
                            onInput={(e) => updateMessageText(msg.id, e.target.value)}
                            placeholder="Your generated post will appear here..."
                          />
                        </Show>
                        <Show when={!msg.editable}>
                          <div class="text-slate-700 leading-relaxed whitespace-pre-wrap p-4 bg-slate-50 rounded-lg border-l-4 border-blue-500">
                            {msg.text}
                          </div>
                        </Show>
                      </div>

                      <Show when={msg.editable && pendingPosts().some((p) => p.id === msg.id && !p.posted)}>
                        <div class="px-4 pb-4 flex justify-end">
                          <button
                            class="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
                            disabled={isPosting()}
                            onClick={() => confirmAndPost(msg.text, msg.id)}
                          >
                            <Show when={isPosting()}>
                              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Publishing...
                            </Show>
                            <Show when={!isPosting()}>
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              Publish Post
                            </Show>
                          </button>
                        </div>
                      </Show>

                      <Show when={!msg.editable}>
                        <div class="px-4 pb-4 flex justify-end">
                          <div class="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md text-sm font-semibold border border-emerald-200">
                            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                            Published
                          </div>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>

        {/* Loading state when no posts exist yet */}
        <Show when={!hasGeneratedPosts() && isLoading()}>
          <section class="mb-8">
            <div class="text-center mb-6">
              <h2 class="text-xl font-bold text-slate-800">Generated Posts</h2>
            </div>

            <div class="space-y-6">
              <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                <div class="p-4 pb-0 flex items-center justify-between">
                  <div class="flex items-center gap-2 bg-slate-400 text-white px-3 py-1 rounded-md text-sm font-semibold">
                    <div class="flex gap-1">
                      <div class="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                      <div class="w-1 h-1 bg-white rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                      <div class="w-1 h-1 bg-white rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    </div>
                    Generating...
                  </div>
                </div>
                <div class="p-4">
                  <div class="bg-slate-50 p-4 rounded-lg">
                    <div class="h-3.5 bg-slate-200 rounded mb-2 animate-pulse"></div>
                    <div class="h-3.5 bg-slate-200 rounded mb-2 animate-pulse"></div>
                    <div class="h-3.5 bg-slate-200 rounded w-3/5 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Show>

        {/* Input Section - Centered when no posts, below posts when they exist */}
      {/* // Replace this section in your component (around line 240-260): */}

{/* Input Section - Centered when no posts, below posts when they exist */}
<section class={`mb-8 transition-all duration-300 ${!hasGeneratedPosts() && !isLoading() ? 'flex justify-center items-center min-h-96' : ''}`}>
  <div class="w-full max-w-2xl mx-auto">
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
        Describe Your Post
      </h2>
      <p class="text-slate-600">Tell us what kind of content you want to create</p>
    </div>
    
    {/* FIXED: Remove the conditional ml-20 class */}
    <form class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 w-full max-w-2xl mx-auto" onSubmit={handleSubmit}>
      <div class="flex flex-col gap-4">
        <textarea
          ref={textareaRef}
          class="w-full min-h-32 p-4 border-2 border-slate-200 rounded-lg resize-vertical transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
          placeholder="E.g., 'Write a motivational post about overcoming challenges'"
          value={inputValue()}
          onInput={handleInputChange}
          onKeyDown={handleKeyDown}
          rows="4"
          disabled={isLoading()}
        />
        <button
          type="submit"
          class="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-12"
          disabled={!inputValue().trim() || isLoading()}
        >
          <Show when={isLoading()}>
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Generating...
          </Show>
          <Show when={!isLoading()}>
            <svg class="w-4 h-4 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Post
          </Show>
        </button>
      </div>
    </form>
  </div>
</section>

        {/* Empty state - only shows when no posts and not loading */}
        <Show when={!hasGeneratedPosts() && !isLoading()}>
          {/* <div class="text-center py-8 text-slate-500"> */}
            {/* <div class="w-15 h-15 mx-auto mb-4 opacity-60">
              <svg class="w-full h-full stroke-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div> */}
            {/* <h3 class="text-xl font-semibold mb-2 text-slate-700">Ready to Create Amazing Content?</h3> */}
            {/* <p class="text-slate-600 max-w-md mx-auto">
              Describe what kind of post you want to create and let AI do the magic!
            </p> */}
          {/* </div> */}
        </Show>
      </main>
    </div>
  );
};

export default ChatApp;