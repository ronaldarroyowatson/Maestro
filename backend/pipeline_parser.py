# =====================================================================
# backend/pipeline_parser.py
# FULL DROP-IN REPLACEMENT: XML → PipelineConfig with rich debug logs.
# =====================================================================

import xml.etree.ElementTree as ET
from pathlib import Path

from .debug import log_debug
from .pipeline_config import (
    PipelineConfig,
    AgentConfig,
    AgentDisplay,
    AgentParameters,
    AgentTool,
    AgentMemory,
    EdgeConfig,
    ExecutionConfig,
)


def _parse_agent_display(agent_el: ET.Element) -> AgentDisplay:
    """
    Parse the <Display> section of an <Agent>.
    """
    display_el = agent_el.find("Display")
    if display_el is None:
        log_debug("pipeline_parser", "Missing <Display> element; using defaults.")
        return AgentDisplay(
            label=agent_el.attrib.get("id", "agent"),
            color="#CCCCCC",
            icon="agent",
            position={"x": 0, "y": 0},
        )

    label = display_el.findtext("Label", default=agent_el.attrib.get("id", "agent"))
    color = display_el.findtext("Color", default="#CCCCCC")
    icon = display_el.findtext("Icon", default="agent")

    position_el = display_el.find("Position")
    if position_el is not None:
        try:
            x = int(position_el.attrib.get("x", "0"))
            y = int(position_el.attrib.get("y", "0"))
        except ValueError:
            log_debug("pipeline_parser", "Invalid Position coordinates; defaulting to (0,0).")
            x, y = 0, 0
    else:
        x, y = 0, 0

    display = AgentDisplay(
        label=label,
        color=color,
        icon=icon,
        position={"x": x, "y": y},
    )
    log_debug("pipeline_parser", f"Parsed AgentDisplay: {display}")
    return display


def _parse_agent_parameters(agent_el: ET.Element) -> AgentParameters:
    """
    Parse the <Parameters> section of an <Agent>.
    """
    params_el = agent_el.find("Parameters")
    if params_el is None:
        log_debug("pipeline_parser", "Missing <Parameters> element; using defaults.")
        return AgentParameters(temperature=0.2, max_tokens=2048)

    try:
        temperature = float(params_el.findtext("Temperature", default="0.2"))
        # BOUNDARY: Temperature must be non-negative
        if temperature < 0.0:
            log_debug("pipeline_parser", f"Invalid Temperature value {temperature}; must be >= 0.0. Defaulting to 0.2.")
            temperature = 0.2
    except ValueError:
        log_debug("pipeline_parser", "Invalid Temperature value; defaulting to 0.2.")
        temperature = 0.2

    try:
        max_tokens = int(params_el.findtext("MaxTokens", default="2048"))
        # BOUNDARY: MaxTokens must be positive
        if max_tokens <= 0:
            log_debug("pipeline_parser", f"Invalid MaxTokens value {max_tokens}; must be > 0. Defaulting to 2048.")
            max_tokens = 2048
    except ValueError:
        log_debug("pipeline_parser", "Invalid MaxTokens value; defaulting to 2048.")
        max_tokens = 2048

    parameters = AgentParameters(temperature=temperature, max_tokens=max_tokens)
    log_debug("pipeline_parser", f"Parsed AgentParameters: {parameters}")
    return parameters


def _parse_agent_tools(agent_el: ET.Element) -> list[AgentTool]:
    """
    Parse the <Tools> section of an <Agent>.
    """
    tools_el = agent_el.find("Tools")
    tools: list[AgentTool] = []

    if tools_el is None:
        log_debug("pipeline_parser", "No <Tools> element found; agent has no tools.")
        return tools

    for tool_el in tools_el.findall("Tool"):
        name = tool_el.attrib.get("name", "").strip()
        enabled_str = tool_el.attrib.get("enabled", "false").lower()
        enabled = enabled_str == "true"

        if not name:
            log_debug("pipeline_parser", "Encountered <Tool> without a name; skipping.")
            continue

        tool = AgentTool(name=name, enabled=enabled)
        tools.append(tool)
        log_debug("pipeline_parser", f"Parsed AgentTool: {tool}")

    return tools


def _parse_agent_memory(agent_el: ET.Element) -> AgentMemory:
    """
    Parse the <Memory> section of an <Agent>.
    """
    memory_el = agent_el.find("Memory")
    if memory_el is None:
        log_debug("pipeline_parser", "Missing <Memory> element; using 'stateless'.")
        return AgentMemory(strategy="stateless")

    strategy = memory_el.findtext("Strategy", default="stateless").strip()
    memory = AgentMemory(strategy=strategy)
    log_debug("pipeline_parser", f"Parsed AgentMemory: {memory}")
    return memory


def _parse_agents(root: ET.Element) -> list[AgentConfig]:
    """
    Parse all <Agent> elements under <Agents>.
    """
    agents_el = root.find("Agents")
    if agents_el is None:
        log_debug("pipeline_parser", "No <Agents> element found in pipeline XML.")
        return []

    agents: list[AgentConfig] = []
    for agent_el in agents_el.findall("Agent"):
        agent_id = agent_el.attrib.get("id", "").strip()
        role = agent_el.attrib.get("role", "").strip()
        model = agent_el.attrib.get("model", "").strip()

        log_debug("pipeline_parser", f"Parsing Agent: id={agent_id}, role={role}, model={model}")

        display = _parse_agent_display(agent_el)
        prompt = agent_el.findtext("Prompt", default="").strip()
        parameters = _parse_agent_parameters(agent_el)
        tools = _parse_agent_tools(agent_el)
        memory = _parse_agent_memory(agent_el)

        agent_config = AgentConfig(
            id=agent_id,
            role=role,
            model=model,
            display=display,
            prompt=prompt,
            parameters=parameters,
            tools=tools,
            memory=memory,
        )
        agents.append(agent_config)
        log_debug("pipeline_parser", f"AgentConfig created: {agent_config}")

    log_debug("pipeline_parser", f"Total agents parsed: {len(agents)}")
    return agents


def _parse_edges(root: ET.Element) -> list[EdgeConfig]:
    """
    Parse all <Edge> elements under <Edges>.
    """
    edges_el = root.find("Edges")
    if edges_el is None:
        log_debug("pipeline_parser", "No <Edges> element found in pipeline XML.")
        return []

    edges: list[EdgeConfig] = []
    for edge_el in edges_el.findall("Edge"):
        source = edge_el.attrib.get("from", "").strip()
        target = edge_el.attrib.get("to", "").strip()
        condition = edge_el.findtext("Condition", default="always").strip()

        edge = EdgeConfig(source=source, target=target, condition=condition)
        edges.append(edge)
        log_debug("pipeline_parser", f"Parsed EdgeConfig: {edge}")

    log_debug("pipeline_parser", f"Total edges parsed: {len(edges)}")
    return edges


def _parse_execution(root: ET.Element) -> ExecutionConfig:
    """
    Parse the <Execution> element.
    """
    exec_el = root.find("Execution")
    if exec_el is None:
        log_debug("pipeline_parser", "No <Execution> element found; using defaults.")
        return ExecutionConfig(mode="round-robin", max_turns=12, stop_on_first_success=False)

    mode = exec_el.findtext("Mode", default="round-robin").strip()

    try:
        max_turns = int(exec_el.findtext("MaxTurns", default="12"))
    except ValueError:
        log_debug("pipeline_parser", "Invalid MaxTurns value; defaulting to 12.")
        max_turns = 12

    stop_str = exec_el.findtext("StopOnFirstSuccess", default="false").lower()
    stop_on_first_success = stop_str == "true"

    execution = ExecutionConfig(
        mode=mode,
        max_turns=max_turns,
        stop_on_first_success=stop_on_first_success,
    )
    log_debug("pipeline_parser", f"Parsed ExecutionConfig: {execution}")
    return execution


def load_pipeline_xml(path: str | Path) -> PipelineConfig:
    """
    Load and parse a pipeline XML file into a PipelineConfig object.
    """
    path = Path(path)
    log_debug("pipeline_parser", f"Loading pipeline XML from: {path}")

    if not path.exists():
        raise FileNotFoundError(f"Pipeline XML not found at: {path}")

    tree = ET.parse(path)
    root = tree.getroot()

    log_debug("pipeline_parser", f"Root element: {root.tag}, attributes: {root.attrib}")

    pipeline_id = root.attrib.get("id", "").strip()
    pipeline_version = root.attrib.get("version", "").strip()

    metadata_el = root.find("Metadata")
    if metadata_el is None:
        log_debug("pipeline_parser", "No <Metadata> element found; using defaults.")
        name = "Unnamed Pipeline"
        description = ""
    else:
        name = metadata_el.findtext("Name", default="Unnamed Pipeline").strip()
        description = metadata_el.findtext("Description", default="").strip()

    log_debug(
        "pipeline_parser",
        f"Parsed Metadata: id={pipeline_id}, version={pipeline_version}, name={name}",
    )

    agents = _parse_agents(root)
    edges = _parse_edges(root)
    execution = _parse_execution(root)

    config = PipelineConfig(
        id=pipeline_id,
        version=pipeline_version,
        name=name,
        description=description,
        agents=agents,
        edges=edges,
        execution=execution,
    )

    log_debug("pipeline_parser", f"PipelineConfig created successfully: {config}")
    return config