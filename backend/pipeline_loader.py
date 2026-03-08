# =====================================================================
# backend/pipeline_loader.py
# Single-responsibility loader for the default system pipeline.
# =====================================================================

from pathlib import Path
from .debug import log_debug
from .pipeline_parser import load_pipeline_xml
from .pipeline_config import PipelineConfig   # <-- THIS WAS MISSING

DEFAULT_PIPELINE_PATH = Path("pipelines/system/default.xml")

def load_default_pipeline() -> PipelineConfig:
    """
    Load the default system pipeline configuration.
    """
    log_debug("pipeline_loader", f"Loading default pipeline from: {DEFAULT_PIPELINE_PATH}")
    config = load_pipeline_xml(DEFAULT_PIPELINE_PATH)
    log_debug("pipeline_loader", "Default pipeline loaded successfully.")
    return config


# =====================================================================
# NOTE FOR INTEGRATION (no code changes here, just guidance as comments):
#
# - main.py:
#     - Import `load_default_pipeline` and call it once at startup.
#     - Store the resulting PipelineConfig in a global or app state object.
#
# - maestro_runner.py:
#     - Accept a PipelineConfig instance and use it to construct AutoGen agents
#       and the GroupChatManager, instead of hard-coding the 4-agent pipeline.
#
# This keeps responsibilities clean:
#   * pipeline_parser.py  → XML → PipelineConfig (with rich debug logs)
#   * pipeline_loader.py  → chooses which XML to load (system/user)
#   * main.py             → application startup and wiring
#   * maestro_runner.py   → execution of the pipeline described by PipelineConfig
# =====================================================================