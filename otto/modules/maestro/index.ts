export const MAESTRO_OTTO_MODULE = {
  moduleId: 'maestro',
  displayName: 'Maestro',
  version: '0.2.0',
  runtime: 'maestro',
  entryRoute: '/maestro/install-status',
  commandServiceLayer: 'otto-command-service',
  ownsCommandSurface: false,
  entryPoint: 'otto/modules/maestro/index.ts'
} as const;

export function getMaestroOttoModule() {
  return { ...MAESTRO_OTTO_MODULE };
}
