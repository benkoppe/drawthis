import type { ReferenceProvider } from '../provider';
import { localReferenceProvider } from './local';

export const referenceProviders = [localReferenceProvider] satisfies readonly ReferenceProvider[];
