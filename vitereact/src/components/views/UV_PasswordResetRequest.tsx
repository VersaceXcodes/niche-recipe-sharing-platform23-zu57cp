import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAppStore } from '@/store/main'; // Assuming Zustand store is at this path

// Define the API base URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Interface for the component's state
interface PasswordResetRequestState {
  reset_request_data: {
    email: string;
  };
  form_error: string;
  success_message: string;
  is_requesting: boolean;
}

const UV_PasswordResetRequest: React.FC = () => {
  const navigate = useNavigate();
  const { is_authenticated, showNotification } = useAppStore();

  // Local state for the form
  const [state, setState] = useState<PasswordResetRequestState>({
    reset_request_data: {
      email: '',
    },
    form_error: '',
    success_message: '',
    is_requesting: false,
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (is_authenticated) {
      navigate('/'); // Redirect to homepage if already logged in
    }
  }, [is_authenticated, navigate]);

  // --- Helper Functions ---

  // Validate email input format and update state
  const validateEmailInput = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setState((prevState) => ({
        ...prevState,
        form_error: 'Email is required.',
        success_message: '',
      }));
      return false;
    }
    if (!emailRegex.test(email)) {
      setState((prevState) => ({
        ...prevState,
        form_error: 'Please enter a valid email address.',
        success_message: '',
      }));
      return false;
    }
    // Clear specific email validation error if valid, allows for other general form errors
    return true;
  };

  // Handle input change for the email field
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setState((prevState) => ({
      ...prevState,
      reset_request_data: { ...prevState.reset_request_data, email: value },
      // Clear form_error that is specific to email validation on change, 
      // but keep general errors if they exist (though this view doesn't have others)
      form_error: 
        prevState.form_error === 'Email is required.' || 
        prevState.form_error === 'Please enter a valid email address.'
        ? ''
        : prevState.form_error,
      success_message: '', // Clear success message on input change
    }));
  };

  // Handle the password reset request submission
  const handlePasswordResetRequest = async (e?: FormEvent) => {
    // Always prevent default form submission behavior if an event is passed
    if (e) {
      e.preventDefault();
    }

    const { email } = state.reset_request_data;

    // Clear previous errors and success messages at the start of a new request attempt
    setState((prevState) => ({
      ...prevState,
      form_error: '',
      success_message: '',
      is_requesting: true,
    }));

    // Validate email before proceeding with API call
    const isEmailValid = validateEmailInput(email);
    if (!isEmailValid) {
      setState((prevState) => ({ ...prevState, is_requesting: false }));
      return;
    }

    // Check authentication status again before making the request
    if (is_authenticated) {
      navigate('/');
      return;
    }

    try {
      const response = await axios.post<{ message: string }>( // API response schema only has 'message' on success
        `${API_BASE_URL}/auth/forgot-password`,
        { email },
      );

      // API call successful, display generic success message
      setState((prevState) => ({
        ...prevState,
        // Use the message from API response or a default one, ensure it's not an error string
        success_message: response.data.message || 'If an account with that email exists, a password reset link has been sent.',
        form_error: '', // Ensure error is cleared on success
        is_requesting: false,
      }));
      // Optionally show a global notification as well
      showNotification(response.data.message || 'Password reset email sent.', 'success');

    } catch (error: any) {
      // Handle API errors
      let errorMessage = 'An unknown error occurred. Please try again.';
      if (error.response && typeof error.response.data?.error === 'string') {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState((prevState) => ({
        ...prevState,
        form_error: errorMessage,
        success_message: '', // Ensure success message is cleared on error
        is_requesting: false,
      }));
      // Show global notification for errors too
      showNotification(errorMessage, 'error');
    }
  };

  // Determine if the email input has a specific validation error
  const hasEmailValidationError = (
    state.form_error && 
    (state.form_error === 'Email is required.' || 
     state.form_error === 'Please enter a valid email address.')
  );

  return (
    <>
      <div className="max-w-md mx-auto p-6 border border-gray-200 rounded-lg shadow-md bg-white">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Reset Your Password
        </h2>

        {state.success_message && (
          <div
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6"
            role="alert"
          >
            <span className="block sm:inline">{state.success_message}</span>
          </div>
        )}

        {state.form_error && !state.success_message && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6"
            role="alert"
          >
            <span className="block sm:inline">{state.form_error}</span>
          </div>
        )}

        <form onSubmit={handlePasswordResetRequest}>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={state.reset_request_data.email}
              onChange={handleEmailChange}
              onBlur={() => validateEmailInput(state.reset_request_data.email)} // Validate on blur as well
              placeholder="Enter your email"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${hasEmailValidationError ? 'border-red-500' : ''}`}
              required
              aria-invalid={hasEmailValidationError ? 'true' : 'false'}
              aria-describedby={hasEmailValidationError ? 'email-error' : undefined}
            />
             {/* Error message display tied to input */}
            {hasEmailValidationError && (
                <p className="text-red-500 text-xs mt-1" id="email-error">
                 {state.form_error}
                </p>
            )}
          </div>

          <button
            type="submit"
            // Button should be enabled if not requesting, regardless of success_message state
            // so user can try again. Error state also mentioned for completeness.
            disabled={state.is_requesting}
            className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.is_requesting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Remember your password?{' '}
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default UV_PasswordResetRequest;