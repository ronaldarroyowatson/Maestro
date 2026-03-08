# =====================================================================
# backend/maestro_runner.py
# Orchestrates pipeline execution: compiles config, manages task threading,
# and coordinates with the executor layer and state management.
# =====================================================================

from threading import Thread
from typing import Any, Dict

from .debug import log_debug
from .pipeline_config import PipelineConfig
from .pipeline_compiler import compile_pipeline
from .state import STATE


class MaestroRunner:
    """
    Orchestrates a single Maestro pipeline run.
    Responsibilities:
    - Compile pipeline once at startup
    - Accept user tasks and spawn execution threads
    - Coordinate state transitions with executor
    - Handle compilation failures gracefully
    """

    def __init__(self, pipeline_config: PipelineConfig):
        self.pipeline_config = pipeline_config
        self.compiled: Dict[str, Any] | None = None
        self.running = False
        log_debug("maestro_runner", f"Initialized with pipeline: {pipeline_config.id}")

    # =====================================================================
    # Pipeline compilation (one-time at startup)
    # =====================================================================

    def initialize(self) -> bool:
        """Compile pipeline config into runtime objects. Returns success status."""
        try:
            log_debug("maestro_runner", f"Compiling pipeline: {self.pipeline_config.id}")
            self.compiled = compile_pipeline(self.pipeline_config)
            log_debug("maestro_runner", "Pipeline compilation successful")
            return True
        except Exception as e:
            log_debug("maestro_runner", f"Pipeline compilation failed: {e}")
            return False

    # =====================================================================
    # Task execution entry point
    # =====================================================================

    def run_task(self, user_task: str) -> None:
        """
        Spawn a background thread to execute the pipeline with the given task.
        Assumes STATE.original_task is already set by caller (usually main.py).
        """
        # Compile if not already compiled
        if self.compiled is None:
            log_debug("maestro_runner", "Pipeline not compiled; compiling now")
            if not self.initialize():
                STATE.add_message("error", "system", "Pipeline compilation failed")
                STATE.set_running(False)
                return

        # Verify state initialization (should have been done by caller)
        if not STATE.original_task:
            log_debug("maestro_runner", f"WARNING: STATE.original_task not set; using parameter: {user_task}")
            STATE.original_task = user_task

        log_debug("maestro_runner", f"Task enqueued: {user_task}, spawning executor thread")

        # Spawn background thread for execution
        thread = Thread(
            target=self._execute_in_thread,
            args=(self.compiled, user_task),
            daemon=True,
        )
        thread.start()

    # =====================================================================
    # Background execution thread
    # =====================================================================

    def _execute_in_thread(self, compiled: Dict[str, Any], user_task: str) -> None:
        """
        Runs in background thread: orchestrates executor and manages state transitions.
        """
        try:
            log_debug("maestro_runner", "=== EXECUTION THREAD START ===")
            log_debug("maestro_runner", f"Task: {user_task}, Original task in STATE: {STATE.original_task}")

            # Verify state is consistent
            if STATE.original_task != user_task:
                log_debug("maestro_runner", f"WARNING: Task mismatch - parameter={user_task}, STATE={STATE.original_task}")

            # Import executor here to avoid circular imports
            from .pipeline_executor import execute_pipeline

            # Add initial marker to conversation
            STATE.add_message("system", "system", f"Executor starting for task: {user_task}")
            log_debug("maestro_runner", "Calling pipeline executor")

            # Execute the pipeline (this runs turn-by-turn in the thread)
            success = execute_pipeline(compiled)

            # Handle completion
            if success:
                log_debug("maestro_runner", "Executor completed successfully")
                STATE.add_message("system", "system", "Pipeline execution completed successfully")
            else:
                log_debug("maestro_runner", "Executor failed or was interrupted")
                STATE.add_message("error", "system", "Pipeline execution failed")

        except Exception as e:
            error_msg = f"Execution error: {e}"
            log_debug("maestro_runner", error_msg)
            STATE.add_message("error", "system", error_msg)

        finally:
            # Ensure state is clean on exit
            if STATE.running:
                STATE.set_running(False)
            log_debug("maestro_runner", "=== EXECUTION THREAD COMPLETE ===")
