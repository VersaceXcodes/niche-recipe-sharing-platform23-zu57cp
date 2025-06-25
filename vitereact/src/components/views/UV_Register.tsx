import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main.tsx'; // Assuming Zustand store is available at this path

/*
  Interface definitions based on the analysis and OpenAPI spec
*/
interface RegistrationFormData {
  username: string;
  email: string;
  password: string;
  first_name: string | null;
  last_name: string | null;
}

interface FormErrors {
  username: string | null;
  email: string | null;
  password: string | null;
}

// Regular expression for basic email format validation
const EMAIL_REGEX = /^[^\u00A0-\\ud800\\udc00\\s@]{1,64}@([a-zA-Z\\d-]+\\.)+[a-zA-Z]{2,}$/;
// Password must be at least 8 characters long and contain at least one letter, one number, and one special character.
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

const UV_Register: React.FC = () => {
  // --- Global State ---
  const is_authenticated = useAppStore((state) => state.is_authenticated);
  // const auth_error = useAppStore((state) => state.auth_error); // ISSUE-005: Unused variable
  const loading_auth = useAppStore((state) => state.loading_auth);
  const register = useAppStore((state) => state.register);
  const showNotification = useAppStore((state) => state.showNotification);

  // --- Local Component State ---
  const [registration_form_data, set_registration_form_data] = useState<RegistrationFormData>({
    username: '',
    email: '',
    password: '',
    first_name: null, // ISSUE-003: Initialize optional fields to null
    last_name: null,  // ISSUE-003: Initialize optional fields to null
  });

  const [form_errors, set_form_errors] = useState<FormErrors>({
    username: null,
    email: null,
    password: null,
  });

  const [is_submitting, set_is_submitting] = useState<boolean>(false);

  const navigate = useNavigate();

  // --- Effects ---

  // Redirect if already authenticated
  useEffect(() => {
    if (is_authenticated) {
      navigate('/'); // Redirect to homepage if already logged in
    }
  }, [is_authenticated, navigate]); // ISSUE-001: Moved redirection logic here

  // --- Event Handlers ---

  const handle_input_change = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    set_registration_form_data((prev_data) => ({
      ...prev_data,
      [name]: value === '' ? null : value, // Ensure empty strings from input are converted to null for optional fields
    }));

    // Perform validation on input change for immediate feedback
    validate_form_field(name as keyof RegistrationFormData, value);
  };

  // --- Validation Logic ---
  const validate_form_field = (fieldName: keyof RegistrationFormData, value: string): boolean => {
      let error: string | null = null;

      switch (fieldName) {
          case 'email':
              // Added check for empty value before testing regex, as empty email is not necessarily an error if the field is optional or handled differently during submit.
              // However, for registration, email is required, so the check in validate_form is more critical.
              if (value && !EMAIL_REGEX.test(value)) {
                  error = 'Please enter a valid email address.';
              }
              break;
          case 'password':
              if (value && !PASSWORD_REGEX.test(value)) {
                  error = 'Password must be at least 8 characters long and contain one letter, one number, and one special character.';
              }
              break;
          case 'username':
              if (!value) {
                  error = 'Username is required.';
              }
              break;
          case 'first_name':
          case 'last_name':
              // Optional fields: No client-side validation needed beyond presence if required. 
              // Conversion to null for empty strings handled in handle_input_change.
              break;
          default:
              break;
      }

      // Only update errors for fields that are tracked in `form_errors` interface
      if (fieldName in form_errors) {
          set_form_errors((prev_errors) => ({
              ...prev_errors,
              [fieldName]: error,
          }));
      }
      return error === null;
  };

  const validate_form = (): boolean => {
      let is_valid = true;
      let new_errors: FormErrors = { username: null, email: null, password: null };

      // Username validation
      if (!registration_form_data.username) {
          new_errors.username = 'Username is required.';
          is_valid = false;
      }

      // Email validation
      if (!registration_form_data.email) {
          new_errors.email = 'Email is required.';
          is_valid = false;
      } else if (!EMAIL_REGEX.test(registration_form_data.email)) {
          new_errors.email = 'Please enter a valid email address.';
          is_valid = false;
      }

      // Password validation
      if (!registration_form_data.password) {
          new_errors.password = 'Password is required.';
          is_valid = false;
      } else if (!PASSWORD_REGEX.test(registration_form_data.password)) {
          new_errors.password = 'Password must be at least 8 characters long and contain one letter, one number, and one special character.';
          is_valid = false;
      }

      set_form_errors(new_errors);
      return is_valid;
  };

  const handle_register_submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (validate_form()) {
      set_is_submitting(true);
      
      // Prepare data for API, ensuring optional fields are handled correctly
      const payload = {
        ...registration_form_data,
        // If first_name or last_name are empty strings from state, convert them to null for the API payload.
        first_name: registration_form_data.first_name === '' ? null : registration_form_data.first_name,
        last_name: registration_form_data.last_name === '' ? null : registration_form_data.last_name,
      };

      const success = await register(payload);
      set_is_submitting(false);

      if (success) {
        // If registration was successful, navigate to the verification pending page.
        navigate('/verify-email'); // ISSUE-002: Correctly placed inside success block
      } else {
        // Registration failed, error is already set in global state by the action.
        // Display the error from global state using a notification.
        // Note: auth_error is assumed to be populated by the register action when it fails.
        const current_auth_error = useAppStore.getState().auth_error; // Safely get error from store
        if (current_auth_error) {
          showNotification(current_auth_error, 'error');
        }
      }
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Register for KetoAthlete Eats
      </h2>

      <form onSubmit={handle_register_submit} noValidate>
        {/* Username Input */}
        <div className="mb-5">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={registration_form_data.username}
            onChange={handle_input_change}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              form_errors.username ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            required
            aria-invalid={form_errors.username ? 'true' : 'false'}
            aria-describedby={form_errors.username ? 'username-error' : undefined}
          />
          {form_errors.username && (
            <p id="username-error" className="text-sm text-red-500 mt-1">
              {form_errors.username}
            </p>
          )}
        </div>

        {/* Email Input */}
        <div className="mb-5">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={registration_form_data.email}
            onChange={handle_input_change}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              form_errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            required
            aria-invalid={form_errors.email ? 'true' : 'false'}
            aria-describedby={form_errors.email ? 'email-error' : undefined}
          />
          {form_errors.email && (
            <p id="email-error" className="text-sm text-red-500 mt-1">
              {form_errors.email}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div className="mb-5">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={registration_form_data.password}
            onChange={handle_input_change}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              form_errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            required
            aria-invalid={form_errors.password ? 'true' : 'false'}
            aria-describedby={form_errors.password ? 'password-error' : undefined}
          />
          {form_errors.password && (
            <p id="password-error" className="text-sm text-red-500 mt-1">
              {form_errors.password}
            </p>
          )}
        </div>

        {/* First Name Input (Optional) */}
        <div className="mb-5">
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            First Name (Optional)
          </label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            value={registration_form_data.first_name ?? ''} // ISSUE-003: Handle null for controlled input
            onChange={handle_input_change}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Last Name Input (Optional) */}
        <div className="mb-5">
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name (Optional)
          </label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            value={registration_form_data.last_name ?? ''} // ISSUE-003: Handle null for controlled input
            onChange={handle_input_change}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={is_submitting || loading_auth} // ISSUE-006: Added loading_auth to disabled condition
          className={`w-full py-2 px-4 rounded-md font-semibold text-white transition duration-300
            ${is_submitting || loading_auth
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
            }`}
        >
          {is_submitting || loading_auth ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 text-white mr-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V4C6.477 4 4 6.477 4 9v1M12 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z"></path>
              </svg>
              <span>Registering...</span>
            </div>
          ) : (
            'Sign Up'
          )}
        </button>
      </form>

      <p className="text-sm text-center text-gray-600 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 hover:underline font-medium">
          Log In
        </Link>
      </p>
    </div>
  );
};

export default UV_Register;