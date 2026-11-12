"""Text generation behind one interface, backed by Claude or Gemini.

The provider comes from LLM_PROVIDER ("claude" or "gemini"). If that isn't
set, whichever of ANTHROPIC_API_KEY / GEMINI_API_KEY is present is used,
preferring Claude.
"""
import os

from dotenv import load_dotenv

load_dotenv()

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-5")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

# Claude's server-side loop limit is hit when a research turn runs many
# searches; the API then returns stop_reason "pause_turn" and we resend to
# let it resume.
MAX_CONTINUATIONS = 5

CLAUDE_WEB_SEARCH_TOOL = {"type": "web_search_20260209", "name": "web_search", "max_uses": 5}


class LLMError(Exception):
    """A provider call failed. `status` is the HTTP status to return."""

    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status = status
        self.detail = detail


def provider() -> str | None:
    chosen = os.getenv("LLM_PROVIDER", "").strip().lower()
    if chosen in ("claude", "gemini"):
        return chosen
    if os.getenv("ANTHROPIC_API_KEY"):
        return "claude"
    if os.getenv("GEMINI_API_KEY"):
        return "gemini"
    return None


def status() -> dict:
    name = provider()
    key = {"claude": "ANTHROPIC_API_KEY", "gemini": "GEMINI_API_KEY"}.get(name)
    return {
        "provider": name,
        "configured": bool(key and os.getenv(key)),
        "model": {"claude": CLAUDE_MODEL, "gemini": GEMINI_MODEL}.get(name),
    }


def generate(system_prompt: str, user_prompt: str, web_search: bool = False) -> str:
    """Returns the model's text reply. Raises LLMError (503 if unconfigured)."""
    name = provider()
    if name == "claude":
        return _claude(system_prompt, user_prompt, web_search)
    if name == "gemini":
        return _gemini(system_prompt, user_prompt, web_search)
    raise LLMError(503, "No AI provider configured — set GEMINI_API_KEY or ANTHROPIC_API_KEY in backend/.env")


# ── Claude ───────────────────────────────────────────────────────────────────

_claude_client = None


def _claude(system_prompt: str, user_prompt: str, web_search: bool) -> str:
    try:
        from anthropic import Anthropic, APIStatusError, APIConnectionError
    except ImportError as e:
        raise LLMError(503, "anthropic is not installed — run: pip install -r requirements.txt") from e

    global _claude_client
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise LLMError(503, "ANTHROPIC_API_KEY is not set in backend/.env")
    if _claude_client is None:
        _claude_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    messages = [{"role": "user", "content": user_prompt}]
    tools = [CLAUDE_WEB_SEARCH_TOOL] if web_search else []

    try:
        for _ in range(MAX_CONTINUATIONS + 1):
            message = _claude_client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=16000,
                system=system_prompt,
                messages=messages,
                **({"tools": tools} if tools else {}),
            )
            if message.stop_reason != "pause_turn":
                break
            messages = [messages[0], {"role": "assistant", "content": message.content}]
    except APIStatusError as e:
        raise LLMError(e.status_code, str(e.message)) from e
    except APIConnectionError as e:
        raise LLMError(502, str(e)) from e

    if message.stop_reason == "refusal":
        raise LLMError(422, "Claude declined this request")

    return "".join(block.text for block in message.content if block.type == "text")


# ── Gemini ───────────────────────────────────────────────────────────────────

_gemini_client = None


def _gemini(system_prompt: str, user_prompt: str, web_search: bool) -> str:
    try:
        from google import genai
        from google.genai import errors, types
    except ImportError as e:
        raise LLMError(503, "google-genai is not installed — run: pip install -r requirements.txt") from e

    global _gemini_client
    if not os.getenv("GEMINI_API_KEY"):
        raise LLMError(503, "GEMINI_API_KEY is not set in backend/.env")
    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    def call(with_search: bool, search_unavailable: bool = False):
        system = system_prompt
        if search_unavailable:
            # A prompt that asks for web search makes the model try to call a
            # search tool even when none is attached, which ends the turn with
            # MALFORMED_FUNCTION_CALL and no text. Say plainly it isn't there.
            system += NO_SEARCH_NOTE
        config = types.GenerateContentConfig(
            system_instruction=system,
            tools=[types.Tool(google_search=types.GoogleSearch())] if with_search else None,
        )
        return _gemini_client.models.generate_content(
            model=GEMINI_MODEL, contents=user_prompt, config=config
        )

    try:
        try:
            response = call(web_search)
        except errors.ClientError:
            # Free-tier keys have a separate, smaller quota for Google Search
            # grounding. Retry without search rather than failing the account;
            # if the problem was something else (e.g. a bad key) it recurs.
            if not web_search:
                raise
            response = call(False, search_unavailable=True)

        if not response.text and _finish_reason(response) == "MALFORMED_FUNCTION_CALL":
            response = call(False, search_unavailable=True)
    except errors.APIError as e:
        raise LLMError(e.code or 502, e.message or str(e)) from e

    if not response.text:
        reason = _finish_reason(response) or "unknown"
        raise LLMError(422, f"Gemini returned an empty response (finish reason: {reason})")

    return response.text


NO_SEARCH_NOTE = (
    "\n\nWeb search is not available for this request and you have no tools. "
    "Do not attempt to search or call any function. Answer directly from your "
    "own knowledge and the details provided; where you are unsure about the "
    "account, infer sensibly from its industry and the contact's role."
)


def _finish_reason(response) -> str | None:
    candidates = getattr(response, "candidates", None) or []
    if not candidates or candidates[0].finish_reason is None:
        return None
    reason = candidates[0].finish_reason
    return getattr(reason, "name", str(reason))
