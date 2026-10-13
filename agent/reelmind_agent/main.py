"""ReelMind companion agent — entry point.

Run locally (default, real AI on Amazon Bedrock):
    python -m reelmind_agent.main

Run in DEMO MODE (no AWS, deterministic canned answers — for TV dev):
    DEMO_MODE=1 python -m reelmind_agent.main

Run on Amazon Bedrock AgentCore:
    AGENTCORE=1 python -m reelmind_agent.main
    (uses tv_agent_kit.agentcore; see README for the deploy walk-through)

Environment:
    REGION              AWS region for Bedrock (default: AWS config)
    MODEL               reasoning model id (default: anthropic.claude-sonnet-4-5)
    FAST_MODEL          fast-structured model id (default: anthropic.claude-haiku-4-5)
    COMPANION_API_KEY   if set, /chat requires X-API-Key header
    STATE_FILE          memory file path (default: reelmind-state.json)
    PORT                HTTP port (default: 8000)
    DEMO_MODE           "1" → offline demo (canned DemoLLMClient, simple mode)
    AGENTCORE           "1" to run via Amazon Bedrock AgentCore instead
"""

from __future__ import annotations

import os

from tv_agent_kit import (
    BedrockLLMClient,
    LocalMemoryStore,
    create_app,
    create_companion_agent,
)
from tv_agent_kit.llm import DEFAULT_FAST_MODEL, DEFAULT_REASONING_MODEL

from .prompts import SYSTEM_PROMPT
from .tools import build_tools


def build_agent(region: str | None = None, llm=None, memory=None, fast_model: str | None = None,
                simple: bool = False):
    """Construct the ReelMind agent + memory. Used by main() and tests."""
    memory = memory or LocalMemoryStore(os.environ.get("STATE_FILE", "reelmind-state.json"))
    llm = llm or BedrockLLMClient(region=region)
    agent = create_companion_agent(
        system_prompt=SYSTEM_PROMPT,
        tools=build_tools(memory, llm, fast_model=fast_model) if not simple else [],
        name="reelmind-companion",
        model=os.environ.get("MODEL", DEFAULT_REASONING_MODEL),
        fast_model=os.environ.get("FAST_MODEL", DEFAULT_FAST_MODEL),
        llm=llm,
        simple=simple,
    )
    return agent, memory


def main() -> None:
    region = os.environ.get("REGION") or None
    demo = os.environ.get("DEMO_MODE") == "1"

    if demo:
        from .demo import DemoLLMClient

        print("⚠  DEMO MODE: canned offline answers (no AWS). For real AI, unset DEMO_MODE.")
        agent, memory = build_agent(llm=DemoLLMClient(), simple=True)
    else:
        agent, memory = build_agent(region=region)

    if os.environ.get("AGENTCORE") == "1":
        from tv_agent_kit.agentcore import to_agentcore

        runtime = to_agentcore(agent, name="reelmind-companion", region=region)
        runtime.deploy()
        print("Deployed reelmind-companion to Amazon Bedrock AgentCore.")
        return

    import uvicorn

    app = create_app(
        agent,
        memory,
        api_key=os.environ.get("COMPANION_API_KEY"),
        title="ReelMind Companion Agent",
    )
    port = int(os.environ.get("PORT", "8000"))
    mode = "DEMO" if demo else "Bedrock"
    print(f"ReelMind companion agent [{mode}] listening on 0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
