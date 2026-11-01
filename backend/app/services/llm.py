"""One wrapper for every Claude call. Only the server talks to Claude.

- Structured output: pass a Pydantic model, get a validated instance back.
- The system prompt (instructions + knowledge pack) is prompt-cached.
- Server-side refusal fallback is on ("default" routing by refusal category).
"""

import time
from functools import cache

import anthropic

from app import config

FALLBACK_BETA = "server-side-fallback-2026-07-01"


class LLMError(Exception):
    """Claude could not produce a usable answer (refusal, truncation, API error)."""


@cache
def _client():
    if not config.ANTHROPIC_API_KEY:
        raise LLMError("ANTHROPIC_API_KEY is not set (add it to the repo-root .env)")
    return anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)


def parse(system_text, user_text, output_model, effort="medium", max_tokens=16000):
    """Ask Claude for an `output_model` instance. Returns (parsed, usage dict)."""
    started = time.monotonic()
    try:
        response = _client().beta.messages.parse(
            model=config.CLAUDE_MODEL,
            max_tokens=max_tokens,
            system=[{"type": "text", "text": system_text, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_text}],
            output_config={"effort": effort},
            output_format=output_model,
            betas=[FALLBACK_BETA],
            fallbacks="default",
        )
    except anthropic.RateLimitError as err:
        raise LLMError(f"Rate limited by the Claude API: {err.message}") from err
    except anthropic.APIStatusError as err:
        raise LLMError(f"Claude API error {err.status_code}: {err.message}") from err
    except anthropic.APIConnectionError as err:
        raise LLMError("Could not reach the Claude API") from err

    if response.stop_reason == "refusal":
        category = response.stop_details.category if response.stop_details else None
        raise LLMError(f"Claude declined the request (category: {category})")
    if response.stop_reason == "max_tokens":
        raise LLMError("Claude's answer was cut off (max_tokens)")
    if response.parsed_output is None:
        raise LLMError("Claude's answer did not match the expected format")

    usage = response.usage
    return response.parsed_output, {
        "model": response.model,
        "request_id": response._request_id,
        "input_tokens": usage.input_tokens,
        "output_tokens": usage.output_tokens,
        "cache_read_input_tokens": usage.cache_read_input_tokens or 0,
        "cache_creation_input_tokens": usage.cache_creation_input_tokens or 0,
        "seconds": round(time.monotonic() - started, 1),
    }
