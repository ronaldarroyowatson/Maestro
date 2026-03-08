# =====================================================================
# DEPRECATED: Multi-format Pipeline Builder (Legacy Code)
# =====================================================================
# This file is NOT USED. It's kept for reference only.
#
# The current Maestro architecture uses:
# - pipeline_loader.py    → load_default_pipeline() loads XML
# - pipeline_parser.py    → load_pipeline_xml() parses XML to PipelineConfig
# - pipeline_compiler.py  → compile_pipeline() compiles to AutoGen objects
#
# The main.py entry point uses pipeline_loader.load_default_pipeline()
# which directly returns a PipelineConfig, already validated.
#
# This builder was designed to support multiple formats (JSON/YAML)
# and multi-format validation, but was replaced by the simpler
# XML-only pipeline_loader → pipeline_parser → pipeline_compiler chain.
#
# To extend to multiple formats:
# 1. Keep pipeline_parser.py as-is (XML only)
# 2. Create pipeline_parser_json.py, pipeline_parser_yaml.py
# 3. Update pipeline_loader.py to dispatch based on file extension
# 4. Do NOT use this builder - it references non-existent functions
# =====================================================================

from typing import Any, Dict

from .debug import log_debug


def build_pipeline_from_file(path: str) -> Dict[str, Any]:
    """
    DEPRECATED: This function is not used.
    
    Use pipeline_loader.load_default_pipeline() instead,
    which returns a PipelineConfig directly.
    """
    raise NotImplementedError(
        "This function is deprecated. Use pipeline_loader.load_default_pipeline() instead."
    )


def build_pipeline_from_string(raw: str) -> Dict[str, Any]:
    """
    DEPRECATED: This function is not used.
    
    To support dynamic pipelines, extend pipeline_parser.py
    to accept raw XML strings via load_pipeline_xml(xml_string).
    """
    raise NotImplementedError(
        "This function is deprecated. Extend pipeline_parser.py instead."
    )
