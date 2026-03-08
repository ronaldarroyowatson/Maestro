import unittest
from pathlib import Path

from backend.state import STATE
from backend.pipeline_executor import PipelineExecutor


class FakeAgent:
    def __init__(self, name: str, reply_text: str):
        self.name = name
        self.system_message = f"Fake agent {name}"
        self.llm_config = {"config_list": [{"model": "fake-model"}]}
        self._reply_text = reply_text

    def generate_reply(self, messages, sender=None):
        return self._reply_text


class MaestroSmokeTests(unittest.TestCase):
    def test_backend_imports_app(self):
        from backend.main import app

        self.assertIsNotNone(app)
        self.assertTrue(hasattr(app, "routes"))

    def test_planner_and_scaffolder_respond(self):
        STATE.reset()
        STATE.original_task = "Create a simple script"

        planner = FakeAgent("composer", "Plan: 1) define function 2) print output")
        scaffolder = FakeAgent(
            "coder",
            "```python\ndef square(n):\n    return n * n\n```",
        )

        executor = PipelineExecutor(
            agents_map={"composer": planner, "coder": scaffolder},
            manager=None,
            edges=[{"source": "composer", "target": "coder"}],
            execution_config={"max_turns": 2},
            agents_metadata={
                "composer": {"role": "planner"},
                "coder": {"role": "scaffolder"},
            },
            routing={"strategy": "conditional"},
        )

        ok = executor.run()
        self.assertTrue(ok)

        agents_seen = [m.agent for m in STATE.conversation]
        self.assertIn("composer", agents_seen)
        self.assertIn("coder", agents_seen)

    def test_dashboard_file_loads(self):
        index_path = Path("frontend/index.html")
        self.assertTrue(index_path.exists())

        html = index_path.read_text(encoding="utf-8")
        self.assertIn("id=\"app-container\"", html)


if __name__ == "__main__":
    unittest.main()
