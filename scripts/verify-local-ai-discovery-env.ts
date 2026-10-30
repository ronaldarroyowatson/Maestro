import { DEFAULT_LOCAL_AI_TEST_ENVIRONMENT } from '../features/local-ai-discovery/services/test-environment/index.js';

const plan = DEFAULT_LOCAL_AI_TEST_ENVIRONMENT.buildPlan();

console.log(JSON.stringify({
  runtime: plan.runtime,
  starterModels: plan.starterModels,
  installSteps: plan.installSteps,
  verificationSteps: plan.verificationSteps
}, null, 2));
