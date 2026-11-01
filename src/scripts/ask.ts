const CLIENT_TIMEOUT_MS = 30_000;

export function initializeAsk(): void {
  const form = document.querySelector<HTMLFormElement>("#ask-form");
  const question = document.querySelector<HTMLTextAreaElement>("#ask-question");
  const submit = form?.querySelector<HTMLButtonElement>('[type="submit"]');
  const reset = form?.querySelector<HTMLButtonElement>('[type="reset"]');
  const status = document.querySelector<HTMLElement>("#ask-status");
  const answer = document.querySelector<HTMLElement>("#ask-answer");
  const heading = document.querySelector<HTMLElement>("#ask-answer-heading");
  const sources = document.querySelector<HTMLElement>("#ask-sources");
  if (
    !form ||
    !question ||
    !submit ||
    !reset ||
    !status ||
    !answer ||
    !heading ||
    !sources
  )
    throw new Error("Ask prototype markup is incomplete.");
  const endpoint = form.dataset["endpoint"];
  if (!endpoint) throw new Error("Ask prototype endpoint is missing.");

  // Request and answer live only in the DOM/memory; no persistence or history.
  let pending = false;
  let cancelPending: (() => void) | undefined;
  const clear = () => {
    answer.textContent = "";
    sources.textContent = "";
    heading.hidden = true;
    status.textContent = "";
  };
  form.addEventListener("reset", () => {
    cancelPending?.();
    clear();
  });
  form.reset();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pending) return;
    const value = question.value.trim();
    if (!value || question.value.length > 4000) {
      status.textContent = "Enter a question of 1 to 4000 characters.";
      return;
    }
    clear();
    pending = true;
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    status.textContent = "Asking Parkinson's Insights…";
    const controller = new AbortController();
    let resetRequest = false;
    cancelPending = () => {
      resetRequest = true;
      controller.abort();
    };
    const timeout = window.setTimeout(
      () => controller.abort(),
      CLIENT_TIMEOUT_MS,
    );
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
      });
      if (resetRequest) return;
      // Server errors (including non-JSON gateway errors) stay generic.
      if (response.status !== 200) {
        status.textContent =
          response.status === 429
            ? "Too many requests. Please wait a minute and retry."
            : "The research tool could not answer. Please retry later.";
        return;
      }
      const data: unknown = await response.json();
      if (resetRequest) return;
      if (
        !data ||
        typeof data !== "object" ||
        !("answer" in data) ||
        typeof data.answer !== "string" ||
        !data.answer.trim() ||
        !("sources" in data) ||
        !Array.isArray(data.sources) ||
        !("requestId" in data) ||
        typeof data.requestId !== "string"
      ) {
        status.textContent = "No readable answer was received. Please retry.";
        return;
      }
      heading.hidden = false;
      answer.textContent = data.answer;
      sources.textContent =
        "No verified sources are attached to this prototype answer. Check research claims independently.";
      status.textContent = "Answer received.";
    } catch {
      if (resetRequest) return;
      status.textContent = controller.signal.aborted
        ? "The request timed out. Please retry."
        : "The research tool could not connect. Check the emulator and retry.";
    } finally {
      window.clearTimeout(timeout);
      pending = false;
      cancelPending = undefined;
      submit.disabled = false;
      form.removeAttribute("aria-busy");
    }
  });
}
