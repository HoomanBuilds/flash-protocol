export * from './lifi'
export * from './rango'
export * from './rubic'
export * from './symbiosis'
export * from './near-intents'

import { lifiProvider } from './lifi'
import { rangoProvider } from './rango'
import { rubicProvider } from './rubic'
import { symbiosisProvider } from './symbiosis'
import { nearIntentsProvider } from './near-intents'

// Active providers list
export const providers = [
  lifiProvider,
  rangoProvider,
  rubicProvider,
  symbiosisProvider,
  nearIntentsProvider,
]
