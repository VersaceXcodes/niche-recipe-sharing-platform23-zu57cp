import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';

// --- Password Validation Helper ---
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const MIN_PASSWORD_LENGTH = 8;

// --- API Base URL ---
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- Interfaces ---
interface PasswordResetData {
  new_password: '';
  confirm_password: '';
}

interface FormErrors {
  new_password: '' | string;
  confirm_password: '' | string;
  general: '' | string;
}

// --- API Call Function ---
const resetPasswordApi = async ({
  reset_token,
  new_password,
}: {
  reset_token: string;
  new_password: string;
}): Promise<{ message: string }> => {
  const { data } = await axios.post(
    `${API_BASE_URL}/auth/reset-password`,
    {
      reset_token,
      new_password,
      confirm_password: new_password, // Backend expects confirm_password as well based on schema
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  return data;
};

// --- View Component ---
const UV_PasswordReset: React.FC = () => {
  const navigate = useNavigate();
  // Using URLSearchParams to get the token as it's a query parameter (?token=...)
  const params = new URLSearchParams(window.location.search);
  const reset_token = params.get('reset_token');

  const [password_reset_data, set_password_reset_data] = useState<PasswordResetData>({
    new_password: '',
    confirm_password: '',
  });
  const [form_errors, set_form_errors] = useState<FormErrors>({
    new_password: '',
    confirm_password: '',
    general: '',
  });
  const [is_token_valid, set_is_token_valid] = useState<boolean>(true); // Assume valid until proven otherwise or backend check

  // --- Password Validation Helper ---
  const validate_password_inputs = useCallback((data: PasswordResetData): boolean => {
    let isValid = true;
    const errors: FormErrors = {
      new_password: '',
      confirm_password: '',
      general: '',
    };

    // New Password Validation
    if (!data.new_password) {
      errors.new_password = 'Password is required.';
      isValid = false;
    } else if (data.new_password.length < MIN_PASSWORD_LENGTH) {
      errors.new_password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
      isValid = false;
    } else if (!PASSWORD_REGEX.test(data.new_password)) {
      errors.new_password = 'Password must contain uppercase, lowercase, number, and special character.';
      isValid = false;
    }

    // Confirmation Password Validation
    if (!data.confirm_password) {
      errors.confirm_password = 'Password confirmation is required.';
      isValid = false;
    } else if (data.new_password !== data.confirm_password) {
      errors.confirm_password = 'Passwords do not match.';
      isValid = false;
    }

    set_form_errors(errors);
    return isValid;
  }, []);

  // --- Mutation hook for password reset ---
  const passwordResetMutation = useMutation({
    mutationFn: ({ token, password }) => resetPasswordApi({ reset_token: token, new_password: password }),
    onSuccess: (data) => {
      // Success message is usually handled by a global notification system or displayed directly
      // For this view, we'll just navigate and let the next page show success
      navigate('/login?resetSuccess=true'); // Redirect to login with a query param if needed for success message
    },
    onError: (error: unknown) => {
      const axiosError = error as (typeof axios)['AxiosError']; // Type assertion for axios error
      const errorMessage = axiosError?.response?.data?.error || axiosError?.message || 'An unexpected error occurred. Please try again.';
      set_form_errors({ ...form_errors, general: errorMessage });
      // If the error is about an invalid token, we can disable the form or redirect
      if (
        axiosError?.response?.status === 400 &&
        (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('expired'))
      ) {
        set_is_token_valid(false);
        set_form_errors({ ...form_errors, general: 'The password reset link is invalid or has expired. Please request a new one.' });
      }
    },
  });

  // --- Handle Form Input Changes ---
  const handle_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    set_password_reset_data((prev_data) => ({
      ...prev_data,
      [name]: value,
    }));
    // Clear specific field error on input change
    set_form_errors((prev_errors) => ({ ...prev_errors, [name]: '' }));
  };

  // --- Handle Form Submission ---
  const handle_submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!reset_token) {
      set_form_errors({ ...form_errors, general: 'Invalid request: Missing reset token.' });
      set_is_token_valid(false);
      return;
    }

    const is_form_valid = validate_password_inputs(password_reset_data);
    if (is_form_valid && is_token_valid) {
      passwordResetMutation.mutate({ token: reset_token, password: password_reset_data.new_password });
    }
  };

  // Effect to potentially validate token on mount or redirect if no token
  useEffect(() => {
    if (!reset_token) {
      set_is_token_valid(false);
      set_form_errors({ ...form_errors, general: 'Invalid request: Missing reset token.' });
      // Optional: Automatically redirect to login if token is missing from the start
      // setTimeout(() => navigate('/login'), 3000);
    }
  }, [reset_token, navigate, form_errors]);

  // --- Render Logic ---
  return (
    <>
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg mx-auto">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>

        {/* Display general errors from API or token validation */}
        {form_errors.general && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{form_errors.general}</span>
          </div>
        )}

        {/* Display success message IF mutation was successful (before redirect) */}
        {passwordResetMutation.isSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Success!</strong>
            <span className="block sm:inline ml-2">Password reset successfully. You will be redirected to the login page shortly.</span>
          </div>
        )}

        {/* Only render form if token is valid and password reset is not already successful */}
        {is_token_valid && !passwordResetMutation.isSuccess && (
          <form className="mt-8 space-y-6" onSubmit={handle_submit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="new_password" className="sr-only">
                  New Password
                </label>
                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="New Password"
                  value={password_reset_data.new_password}
                  onChange={handle_change}
                  aria-invalid={!!form_errors.new_password}
                  aria-describedby="new-password-error"
                />
                {form_errors.new_password && (
                  <p id="new-password-error" className="mt-2 text-sm text-red-600">
                    {form_errors.new_password}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <label htmlFor="confirm_password" className="sr-only">
                  Confirm New Password
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm New Password"
                  value={password_reset_data.confirm_password}
                  onChange={handle_change}
                  aria-invalid={!!form_errors.confirm_password}
                  aria-describedby="confirm-password-error"
                />
                {form_errors.confirm_password && (
                  <p id="confirm-password-error" className="mt-2 text-sm text-red-600">
                    {form_errors.confirm_password}
                  </p>
                )}
              </div>
            </div>

            {/* General Server/Validation Error */}
            {form_errors.general && !passwordResetMutation.isError && !passwordResetMutation.isSuccess && (
              <p className="text-sm text-red-600 text-center">{form_errors.general}</p>
            )}

            <div>
              <button
                type="submit"
                disabled={
                  passwordResetMutation.isLoading ||
                  !password_reset_data.new_password ||
                  !password_reset_data.confirm_password ||
                  !!form_errors.new_password ||
                  !!form_errors.confirm_password ||
                  !is_token_valid
                }
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordResetMutation.isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>

            <div className="text-center text-sm text-gray-600">
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </>
  );
};

export default UV_PasswordReset;