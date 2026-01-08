// Path utilities
export {
  getByPath,
  setByPath,
  deleteByPath,
  hasPath,
  getAllPaths,
  parsePath,
  joinPath,
  getParentPath,
  getLastSegment,
  isArrayPath,
  getArrayInfo,
} from './path';

// Error utilities
export {
  validationErrorsToFormErrors,
  formErrorsToValidationErrors,
  getFieldError,
  hasErrors,
  countErrors,
  getErrorPaths,
  mergeErrors,
  clearErrorsAtPaths,
  normalizeFieldError,
} from './errors';

// ID utilities
export { generateId, resetIdCounter, generateFieldId } from './id';

// Comparison utilities
export {
  deepEqual,
  shallowEqual,
  getDirtyPaths,
  getDirtyFields,
} from './compare';
