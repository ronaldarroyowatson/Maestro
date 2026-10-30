import { spawnSync } from 'node:child_process';

import type { DetectedResource } from '../../index.js';

export interface TestModelDefinition {
  id: string;
  name: string;
  command: string;
  description: string;
  expectedExtensions: string[];
}

export interface RuntimeDetectionResult {
  installed: boolean;
  status: 'available' | 'missing';
  runtime: 'ollama';
  version?: string;
  source?: 'binary' | 'endpoint';
  details?: string;
}

export interface LocalAiDiscoveryEnvironmentPlan {
  runtime: RuntimeDetectionResult;
  starterModels: TestModelDefinition[];
  installSteps: string[];
  verificationSteps: string[];
}

export class LocalAiTestEnvironment {
  static readonly starterModels: TestModelDefinition[] = [
    {
      id: 'tinyllama',
      name: 'TinyLlama',
      command: 'ollama pull tinyllama',
      description: 'Small development model for local discovery and runtime validation.',
      expectedExtensions: ['.gguf']
    },
    {
      id: 'phi',
      name: 'Phi',
      command: 'ollama pull phi',
      description: 'Lightweight local reasoning model suitable for dev workflows.',
      expectedExtensions: ['.gguf']
    },
    {
      id: 'gemma',
      name: 'Gemma',
      command: 'ollama pull gemma',
      description: 'Compact local model for metadata and runtime detection checks.',
      expectedExtensions: ['.gguf']
    }
  ];

  detectRuntime(): RuntimeDetectionResult {
    const binaryName = process.platform === 'win32' ? 'ollama.exe' : 'ollama';
    const binaryCheck = spawnSync(binaryName, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    if (!binaryCheck.error && binaryCheck.stdout) {
      const output = binaryCheck.stdout.toString().trim();
      return {
        installed: true,
        status: 'available',
        runtime: 'ollama',
        version: output || 'unknown',
        source: 'binary',
        details: 'Ollama binary detected on the local machine.'
      };
    }

    const envHost = process.env.OLLAMA_HOST ?? process.env.OLLAMA_BASE_URL;
    if (envHost) {
      return {
        installed: true,
        status: 'available',
        runtime: 'ollama',
        source: 'endpoint',
        details: `Ollama endpoint is configured at ${envHost}.`
      };
    }

    return {
      installed: false,
      status: 'missing',
      runtime: 'ollama',
      details: 'Ollama is not installed or not on PATH. Use the install steps below.'
    };
  }

  buildInstallSteps(): string[] {
    if (process.platform === 'win32') {
      return [
        'winget install Ollama.Ollama',
        'ollama serve',
        'ollama pull tinyllama',
        'ollama list'
      ];
    }

    if (process.platform === 'darwin') {
      return [
        'brew install ollama',
        'ollama serve',
        'ollama pull tinyllama',
        'ollama list'
      ];
    }

    return [
      'curl -fsSL https://ollama.com/install.sh | sh',
      'ollama serve',
      'ollama pull tinyllama',
      'ollama list'
    ];
  }

  buildValidationChecklist(): string[] {
    return [
      'Verify the Ollama runtime is reachable via the CLI or configured endpoint.',
      'Download a lightweight starter model such as TinyLlama or Phi.',
      'Ensure the discovery engine detects the runtime and local model files.',
      'Confirm that model metadata includes name, path, extension, and file size.',
      'Confirm that duplicate detection and stale-resource detection are working.'
    ];
  }

  verifyModelMetadata(resource: DetectedResource): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const fileExtension = String(resource.metadata.fileExtension ?? '');
    const fileName = String(resource.metadata.fileName ?? resource.name ?? '');
    const sizeBytes = Number(resource.metadata.sizeBytes ?? 0);

    if (resource.type !== 'model') {
      return { valid: true, warnings: [] };
    }

    if (!fileExtension) {
      warnings.push('Model resource is missing a file extension.');
    }

    if (!fileName) {
      warnings.push('Model resource is missing a file name.');
    }

    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      warnings.push('Model resource is missing a valid size in bytes.');
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  buildPlan(): LocalAiDiscoveryEnvironmentPlan {
    return {
      runtime: this.detectRuntime(),
      starterModels: LocalAiTestEnvironment.starterModels,
      installSteps: this.buildInstallSteps(),
      verificationSteps: this.buildValidationChecklist()
    };
  }
}

export const DEFAULT_LOCAL_AI_TEST_ENVIRONMENT = new LocalAiTestEnvironment();
