import { useState } from 'react';
import { z } from 'zod';
import {
  useUniversalForm,
  Form,
  Field,
  FieldArray,
} from '@samithahansaka/formless-react';
import { zodBridge } from '@samithahansaka/formless-zod';
import { rhfAdapter } from '@samithahansaka/formless-react-hook-form';

// ═══════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════

const userSchema = z
  .object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    profile: z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      bio: z
        .string()
        .max(200, 'Bio must be less than 200 characters')
        .optional(),
    }),
    tags: z
      .array(
        z.object({
          name: z.string().min(1, 'Tag name is required'),
        })
      )
      .min(1, 'Add at least one tag'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type UserFormData = z.infer<typeof userSchema>;

// ═══════════════════════════════════════════════════════════════
// APP COMPONENT
// ═══════════════════════════════════════════════════════════════

function App() {
  const [submittedData, setSubmittedData] = useState<UserFormData | null>(null);

  // Create form with Universal Form Adapter
  const form = useUniversalForm({
    schema: zodBridge(userSchema),
    adapter: rhfAdapter(),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      profile: {
        firstName: '',
        lastName: '',
        bio: '',
      },
      tags: [{ name: '' }],
    },
  });

  const handleSubmit = (data: UserFormData) => {
    console.log('Form submitted:', data);
    setSubmittedData(data);
  };

  return (
    <div>
      <h1>Universal Form Adapter</h1>
      <p className="subtitle">
        One API, any form engine. Currently using:{' '}
        <strong>React Hook Form</strong>
      </p>

      <div className="form-card">
        <Form form={form} onSubmit={handleSubmit}>
          <h2>Create Account</h2>

          {/* Basic Fields */}
          <Field
            name="email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
          />

          <Field
            name="password"
            label="Password"
            type="password"
            placeholder="Enter password"
          />

          <Field
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Confirm password"
          />

          {/* Nested Object Fields */}
          <h3>Profile</h3>

          <Field
            name="profile.firstName"
            label="First Name"
            placeholder="John"
          />

          <Field name="profile.lastName" label="Last Name" placeholder="Doe" />

          <Field
            name="profile.bio"
            label="Bio"
            as="textarea"
            placeholder="Tell us about yourself..."
            helperText="Max 200 characters"
          />

          {/* Field Array */}
          <h3>Tags</h3>

          <FieldArray name="tags">
            {({ fields, append, remove }) => (
              <div>
                {fields.map((field, index) => (
                  <div key={field.id} className="field-array-item">
                    <Field
                      name={`tags.${index}.name`}
                      placeholder={`Tag ${index + 1}`}
                    />
                    {fields.length > 1 && (
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => remove(index)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => append({ name: '' })}>
                  + Add Tag
                </button>
              </div>
            )}
          </FieldArray>

          {/* Submit */}
          <div className="button-group">
            <button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? 'Submitting...' : 'Create Account'}
            </button>
            <button type="button" onClick={() => form.reset()}>
              Reset
            </button>
          </div>
        </Form>
      </div>

      {/* Output */}
      {submittedData && (
        <div className="form-card">
          <h3>Submitted Data</h3>
          <pre className="output">{JSON.stringify(submittedData, null, 2)}</pre>
        </div>
      )}

      {/* Debug */}
      <div className="form-card">
        <h3>Form State (Debug)</h3>
        <pre className="output">
          {JSON.stringify(
            {
              isValid: form.isValid,
              isDirty: form.isDirty,
              isSubmitting: form.isSubmitting,
              errors: form.errors,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}

export default App;
