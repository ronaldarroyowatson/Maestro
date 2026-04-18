import unittest
from pathlib import Path
from backend.pipeline_parser import _parse_agent_parameters
from backend.pipeline_config import AgentParameters
import xml.etree.ElementTree as ET


class PipelineParserTests(unittest.TestCase):
    
    def test_valid_parameters_parsing(self):
        """Test that valid Temperature and MaxTokens parse correctly."""
        xml_str = """
        <Agent id="test">
            <Parameters>
                <Temperature>0.7</Temperature>
                <MaxTokens>1024</MaxTokens>
            </Parameters>
        </Agent>
        """
        agent_el = ET.fromstring(xml_str)
        params = _parse_agent_parameters(agent_el)
        
        self.assertEqual(params.temperature, 0.7)
        self.assertEqual(params.max_tokens, 1024)

    def test_negative_temperature_rejected(self):
        # FAIL-FIRST: This test documents that negative temperature values should be rejected.
        # Currently the parser accepts any float, including negative values.
        # EDGE-CASE: Negative temperature is physically meaningless in LLM configuration.
        # BOUNDARY: Temperature must be >= 0.0 and typically <= 2.0.
        # FAILURE-MODE: Accepting negative temperature can cause undefined LLM behavior.
        
        xml_str = """
        <Agent id="test">
            <Parameters>
                <Temperature>-0.5</Temperature>
                <MaxTokens>1024</MaxTokens>
            </Parameters>
        </Agent>
        """
        agent_el = ET.fromstring(xml_str)
        params = _parse_agent_parameters(agent_el)
        
        # After fix, negative temperature should default to 0.2 (not be accepted as -0.5)
        self.assertEqual(params.temperature, 0.2, 
                        "Negative temperature should be rejected and default to 0.2")

    def test_negative_max_tokens_rejected(self):
        # FAIL-FIRST: This test documents that negative max_tokens values should be rejected.
        # EDGE-CASE: Negative token count is meaningless and breaks token budgeting.
        # BOUNDARY: MaxTokens must be > 0 and reasonable (e.g., <= 32768).
        # FAILURE-MODE: Negative max_tokens can break token counting and cause LLM errors.
        
        xml_str = """
        <Agent id="test">
            <Parameters>
                <Temperature>0.7</Temperature>
                <MaxTokens>-512</MaxTokens>
            </Parameters>
        </Agent>
        """
        agent_el = ET.fromstring(xml_str)
        params = _parse_agent_parameters(agent_el)
        
        # After fix, negative max_tokens should default to 2048 (not be accepted as -512)
        self.assertEqual(params.max_tokens, 2048, 
                        "Negative max_tokens should be rejected and default to 2048")

    def test_zero_max_tokens_rejected(self):
        # EDGE-CASE: Zero max_tokens is meaningless (no tokens allowed).
        # BOUNDARY: MaxTokens must be > 0.
        # FAILURE-MODE: Zero tokens will cause LLM to produce no output.
        
        xml_str = """
        <Agent id="test">
            <Parameters>
                <Temperature>0.7</Temperature>
                <MaxTokens>0</MaxTokens>
            </Parameters>
        </Agent>
        """
        agent_el = ET.fromstring(xml_str)
        params = _parse_agent_parameters(agent_el)
        
        # After fix, zero max_tokens should default to 2048
        self.assertEqual(params.max_tokens, 2048, 
                        "Zero max_tokens should be rejected and default to 2048")


if __name__ == "__main__":
    unittest.main()
