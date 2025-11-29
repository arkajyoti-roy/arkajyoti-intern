import { createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Base_URL } from "./url";

const ChatApp = () => {
  const [messages, setMessages] = createStore([]);
  const [inputValue, setInputValue] = createSignal("");
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [isPublishing, setIsPublishing] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [sessionId, setSessionId] = createSignal(
    localStorage.getItem("tweet_session") || null
  );
  const [image, setImage] = createSignal(null);
  const [tone, setTone] = createSignal("Formal");

  let textareaRef;

  const cleanMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1");
  };

  const addMessage = (text, sender, isError = false) => {
    const newMessage = {
      id: Date.now(),
      text,
      sender,
      timestamp: new Date(),
      isError,
      canEdit: sender === "assistant" && !isError,
      isPublished: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (messageId, newText) => {
    setMessages((message) => message.id === messageId, "text", newText);
  };

  const markAsPublished = (messageId) => {
    setMessages((message) => message.id === messageId, {
      canEdit: false,
      isPublished: true,
    });
  };

  const generateResponse = async (
    userPrompt,
    sessionId,
    history = [],
    generateImage = false,
    tone = ""
  ) => {
    const payload = {
      prompt: userPrompt,
      session_id: sessionId,
      history: history.slice(-10),
      generate_image: generateImage,
      tone,
    };

    const response = await fetch(`${Base_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    return data;
  };

  const publishPost = async (postText, messageId) => {
    setIsPublishing(true);

    try {
      const response = await fetch(`${Base_URL}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: postText }),
      });

      if (!response.ok) {
        throw new Error(`Post failed: ${response.status}`);
      }

      addMessage("✅ Tweet posted successfully!", "system");
      markAsPublished(messageId);
    } catch (error) {
      addMessage(error.message, "assistant", true);
      setErrorMessage(error.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const regenerateImage = async () => {
    const lastUserMessage = messages
      .filter((msg) => msg.sender === "user")
      .slice(-1)[0];

    if (!lastUserMessage) return;

    setIsGenerating(true);
    try {
      const conversationHistory = messages
        .filter((msg) => msg.sender === "user" || msg.sender === "assistant")
        .slice(-20)
        .reduce((acc, msg, i, arr) => {
          if (msg.sender === "user" && arr[i + 1]?.sender === "assistant") {
            acc.push({ prompt: msg.text, tweet: arr[i + 1].text });
          }
          return acc;
        }, []);

      const aiResponse = await generateResponse(
        lastUserMessage.text,
        sessionId(),
        conversationHistory,
        true,
        tone()
      );

      if (aiResponse.image) {
        setImage(`data:image/png;base64,${aiResponse.image}`);
      }
    } catch (error) {
      addMessage(error.message, "assistant", true);
      setErrorMessage(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userInput = inputValue().trim();
    if (!userInput || isGenerating()) return;

    const generateImage = document.getElementById(
      "generateImageCheckbox"
    )?.checked;

    addMessage(userInput, "user");
    setInputValue("");
    setErrorMessage("");

    if (textareaRef) textareaRef.style.height = "auto";

    setIsGenerating(true);
    try {
      const conversationHistory = messages
        .filter((msg) => msg.sender === "user" || msg.sender === "assistant")
        .slice(-20)
        .reduce((acc, msg, i, arr) => {
          if (msg.sender === "user" && arr[i + 1]?.sender === "assistant") {
            acc.push({ prompt: msg.text, tweet: arr[i + 1].text });
          }
          return acc;
        }, []);

      const aiResponse = await generateResponse(
        userInput,
        sessionId(),
        conversationHistory,
        generateImage,
        tone()
      );

      if (!sessionId() && aiResponse.session_id) {
        setSessionId(aiResponse.session_id);
        localStorage.setItem("tweet_session", aiResponse.session_id);
      }

      addMessage(cleanMarkdown(aiResponse.response), "assistant");

      // Handle generated image
      if (aiResponse.image) {
        setImage(`data:image/png;base64,${aiResponse.image}`);
      } else if (!generateImage) {
        // Clear image if not requesting image generation
        setImage(null);
      }
    } catch (error) {
      addMessage(error.message, "assistant", true);
      setErrorMessage(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`; // Updated to match image height (h-44 = 176px)
  };

  const getGeneratedPosts = () => {
    return messages.filter((msg) => msg.sender === "assistant" && !msg.isError);
  };

  const hasGeneratedPosts = () => getGeneratedPosts().length > 0;

  const getCurrentPrompt = () => {
    const userMessages = messages.filter((msg) => msg.sender === "user");
    return userMessages.length > 0
      ? userMessages[userMessages.length - 1].text
      : "";
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div class="min-h-screen bg-slate-50">
      <Show when={errorMessage()}>
        <div class="fixed top-5 right-5 z-50 animate-pulse">
          <div class="bg-red-500 text-white px-5 py-3 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-red-500/30">
            <svg
              class="w-5 h-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <title>Error</title>
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            Connection Error
          </div>
        </div>
      </Show>

      <header class="bg-white border-b border-slate-200 py-4 shadow-sm">
        <div class="max-w-4xl mx-auto px-4 flex items-center justify-center">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg
                class="w-5 h-5 text-white stroke-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>PostCraft AI Logo</title>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-slate-800">PostCraft AI</h1>
          </div>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-4 py-8">
        {/* Generated Posts Section */}
        <Show when={hasGeneratedPosts()}>
          <div class="space-y-6">
            {/* User Prompt Display */}
            <Show when={getCurrentPrompt()}>
              <div class="mb-6">
                <div class="flex items-center gap-2 mb-3">
                  <div class="flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold">
                    <svg
                      class="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <title>Information</title>
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    Your Request
                  </div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  {getCurrentPrompt()}
                </div>
              </div>
            </Show>

            {/* Generated Posts */}
            <div class="mb-8">
              <div class="text-center mb-6">
                <h2 class="text-xl font-bold text-slate-800">
                  Generated Posts
                </h2>
              </div>

              <div class="space-y-6">
                {/* Loading State */}
                <Show when={isGenerating()}>
                  <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                    <div class="p-4 pb-0 flex items-center justify-between">
                      <div class="flex items-center gap-2 bg-slate-400 text-white px-3 py-1 rounded-md text-sm font-semibold">
                        <div class="flex gap-1">
                          <div class="w-1 h-1 bg-white rounded-full animate-bounce" />
                          <div
                            class="w-1 h-1 bg-white rounded-full animate-bounce"
                            style="animation-delay: 0.1s"
                          />
                          <div
                            class="w-1 h-1 bg-white rounded-full animate-bounce"
                            style="animation-delay: 0.2s"
                          />
                        </div>
                        Generating...
                      </div>
                    </div>
                    <div class="p-4">
                      <div class="bg-slate-50 p-4 rounded-lg">
                        <div class="h-3.5 bg-slate-200 rounded mb-2 animate-pulse" />
                        <div class="h-3.5 bg-slate-200 rounded mb-2 animate-pulse" />
                        <div class="h-3.5 bg-slate-200 rounded w-3/5 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Generated Post Cards */}
                <For each={getGeneratedPosts()}>
                  {(message) => (
                    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                      {/* Post Header */}
                      <div class="p-4 pb-0 flex items-center justify-between">
                        <div class="flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold">
                          <svg
                            class="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <title>Generated Post</title>
                            <path
                              fill-rule="evenodd"
                              d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z"
                              clip-rule="evenodd"
                            />
                          </svg>
                          Generated Post
                        </div>
                        <div class="text-slate-500 text-sm font-medium">
                          {formatTime(message.timestamp)}
                        </div>
                      </div>

                      {/* Post Content */}
                      <div class="p-4">
                        <div class="flex flex-col lg:flex-row gap-4">
                          {/* Text Content */}
                          <div class="flex-1">
                            <Show when={message.canEdit}>
                              <textarea
                                class="w-full h-44 p-4 border-2 border-slate-200 rounded-lg resize-vertical transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10"
                                value={message.text}
                                onInput={(e) =>
                                  updateMessage(message.id, e.target.value)
                                }
                                placeholder="Your generated post will appear here..."
                              />
                            </Show>
                            <Show when={!message.canEdit}>
                              <div class="text-slate-700 leading-relaxed whitespace-pre-wrap p-4 bg-slate-50 rounded-lg border-l-4 border-blue-500">
                                {message.text}
                              </div>
                            </Show>
                          </div>

                          {/* Generated Image */}
                          <Show when={image()}>
                            <div class="flex-shrink-0">
                              <div class="relative">
                                <img
                                  src={image()}
                                  alt="Generated visual"
                                  class="w-80 h-48 lg:w-72 lg:h-44 object-cover rounded-lg border border-slate-300 shadow-sm mx-auto lg:mx-0"
                                />
                                <button
                                  onClick={() => setImage(null)}
                                  class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200"
                                  title="Remove image"
                                >
                                  ×
                                </button>
                              </div>
                              <div class="flex items-center justify-center gap-3 mt-3">
                                <button
                                  onClick={regenerateImage}
                                  disabled={isGenerating()}
                                  class="text-sm text-blue-500 hover:text-blue-600 disabled:text-slate-400 hover:underline disabled:hover:no-underline disabled:cursor-not-allowed flex items-center gap-1 px-2 py-1"
                                >
                                  <Show when={isGenerating()}>
                                    <div class="w-3 h-3 border border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                    Regenerating...
                                  </Show>
                                  <Show when={!isGenerating()}>
                                    🔁 Regenerate Image
                                  </Show>
                                </button>
                              </div>
                            </div>
                          </Show>
                        </div>
                      </div>

                      {/* Post Actions */}
                      <Show when={message.canEdit}>
                        <div class="px-4 pb-4 flex justify-end">
                          <button
                            type="button"
                            class="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
                            disabled={isPublishing()}
                            onClick={() =>
                              publishPost(message.text, message.id)
                            }
                          >
                            <Show when={isPublishing()}>
                              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Publishing...
                            </Show>
                            <Show when={!isPublishing()}>
                              <svg
                                class="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <title>Publish</title>
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                />
                              </svg>
                              Publish Post
                            </Show>
                          </button>
                        </div>
                      </Show>

                      <Show when={message.isPublished}>
                        <div class="px-4 pb-4 flex justify-end">
                          <div class="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md text-sm font-semibold border border-emerald-200">
                            <svg
                              class="w-3.5 h-3.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <title>Published</title>
                              <path
                                fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clip-rule="evenodd"
                              />
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

        {/* Loading State (when no posts exist yet) */}
        <Show when={!hasGeneratedPosts() && isGenerating()}>
          <section class="mb-8">
            <div class="text-center mb-6">
              <h2 class="text-xl font-bold text-slate-800">Generated Posts</h2>
            </div>
            <div class="space-y-6">
              <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                <div class="p-4 pb-0 flex items-center justify-between">
                  <div class="flex items-center gap-2 bg-slate-400 text-white px-3 py-1 rounded-md text-sm font-semibold">
                    <div class="flex gap-1">
                      <div class="w-1 h-1 bg-white rounded-full animate-bounce" />
                      <div
                        class="w-1 h-1 bg-white rounded-full animate-bounce"
                        style="animation-delay: 0.1s"
                      />
                      <div
                        class="w-1 h-1 bg-white rounded-full animate-bounce"
                        style="animation-delay: 0.2s"
                      />
                    </div>
                    Generating...
                  </div>
                </div>
                <div class="p-4">
                  <div class="bg-slate-50 p-4 rounded-lg">
                    <div class="h-3.5 bg-slate-200 rounded mb-2 animate-pulse" />
                    <div class="h-3.5 bg-slate-200 rounded mb-2 animate-pulse" />
                    <div class="h-3.5 bg-slate-200 rounded w-3/5 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Show>

        {/* Input Section */}
        <section
          class={`mb-8 transition-all duration-300 ${
            !hasGeneratedPosts() && !isGenerating()
              ? "flex justify-center items-center min-h-96"
              : ""
          }`}
        >
          <div class="w-full max-w-2xl mx-auto">
            <div class="text-center mb-6">
              <h2 class="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                Describe Your Post
              </h2>
              <p class="text-slate-600">
                Tell us what kind of content you want to create
              </p>
            </div>

            <form
              class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 w-full max-w-2xl mx-auto"
              onSubmit={handleSubmit}
            >
              <div class="flex flex-col gap-4">
                <textarea
                  ref={textareaRef}
                  class="w-full h-44 p-4 border-2 border-slate-200 rounded-lg resize-vertical transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                  placeholder="E.g., 'Write a motivational post about overcoming challenges'"
                  value={inputValue()}
                  onInput={handleInputChange}
                  onKeyDown={handleKeyDown}
                  rows="4"
                  disabled={isGenerating()}
                />

                <div className="flex flex-row justify-between items-center">
                  <label class="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <input
                      type="checkbox"
                      id="generateImageCheckbox"
                      class="accent-blue-500 h-4 w-4 rounded"
                    />
                    Also generate an image 🎨
                  </label>
                  <div className="flex flex-row gap-2.5">
                    <label class="flex items-center gap-2 text-sm font-medium text-slate-600" for="toneSelect">
                      Tone
                    </label>
                    <select
                      name="tone"
                      id="toneSelect"
                      value={tone()}
                      onInput={(e) => setTone(e.target.value)}
                      disabled={isGenerating()}
                      class="border rounded px-2 py-1 text-sm bg-white"
                    >
                      <option value="Formal">Formal</option>
                      <option value="Casual">Casual</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  class="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-12"
                  disabled={!inputValue().trim() || isGenerating()}
                >
                  <Show when={isGenerating()}>
                    <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </Show>
                  <Show when={!isGenerating()}>
                    <svg
                      class="w-4 h-4 stroke-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <title>Generate</title>
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Generate Post
                  </Show>
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ChatApp;
