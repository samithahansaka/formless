# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of Formless
- `@universal-form/core` - Core types, utilities, and interfaces
- `@universal-form/react` - React hooks (`useUniversalForm`, `useField`, `useFieldArray`) and components (`Field`)
- `@universal-form/react-hook-form` - React Hook Form adapter
- `@universal-form/formik` - Formik adapter
- `@universal-form/tanstack-form` - TanStack Form adapter
- `@universal-form/zod` - Zod schema bridge
- Full TypeScript support
- Field array support with stable keys
- Validation modes: `onSubmit`, `onBlur`, `onChange`, `onTouched`, `all`

## [0.1.0] - 2025-01-08

### Added

- Initial project setup
- Monorepo structure with Turborepo
- Core adapter architecture
- React Hook Form, Formik, and TanStack Form adapters
- Zod schema bridge for validation
- Comprehensive test suite (339 tests)
- Documentation and examples

[Unreleased]: https://github.com/samithahansaka/formless/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/samithahansaka/formless/releases/tag/v0.1.0
