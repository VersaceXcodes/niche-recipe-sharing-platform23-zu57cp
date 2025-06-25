import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAppStore } from '@/store/main'; // Assuming Zustand store is exported as useAppStore

// Define API Base URL from environment variables
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- Axios Instance Configuration ---
// Configure axios instance for base URL and default headers if needed globally
// For this specific view, we'll use direct axios calls within the handler,
// but ensure the store's axios instance (if used) is configured correctly.
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
});

// Ensure the Authorization header is set if the user is already authenticated (e.g., from a refresh token)
// This is typically handled by a global interceptor or when the token is initially set in the store.
// For this specific view, we focus on the API call itself for resending.

interface UV_LoginPendingVerificationProps {}

const UV_LoginPendingVerification: React.FC<UV_LoginPendingVerificationProps> = () => {
  const navigate = useNavigate();
  // Access email from route state which might be passed during navigation
  const location = useLocation();
  const userEmailFromState = (location.state as { userEmail?: string })?.userEmail;

  // Global state access (if any needed, e.g., for auth status or showing notifications)
  const { showNotification } = useAppStore((state) => ({
      showNotification: state.showNotification,
  }));

  // --- Component State ---
  const [user_email, setUserEmail] = useState<string>(userEmailFromState || '');
  const [resend_email_sent, setResendEmailSent] = useState<boolean>(false);
  const [is_resending, setIsResending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // --- Effects ---
  // If email is not provided via state, maybe redirect to registration or login?
  // For now, we assume it's provided or will be empty, displaying a generic message.
  useEffect(() => {
    if (!userEmailFromState) {
      // Optionally handle cases where email isn't passed, e.g., redirect back to register/login
      console.warn("User email not provided via route state for UV_LoginPendingVerification.");
    }
  }, [userEmailFromState]); // Added userEmailFromState to dependency array

  // --- Action Handlers ---

  const handle_resend_verification = useCallback(async () => {
    // Basic validation: ensure user_email is not empty
    if (!user_email.trim()) {
      setErrorMessage("Please enter your email address to resend verification.");
      showNotification("Please enter your email address.", "error");
      return;
    }

    setIsResending(true);
    setResendEmailSent(false); // Reset flag on new attempt
    setErrorMessage(''); // Clear previous error

    try {
      // Call the backend API to resend the verification email
      // NOTE: The endpoint /auth/forgot-password is used here based on the initial code. 
      // If a dedicated resend verification endpoint exists, it should be used instead.
      const response = await apiClient.post('/auth/forgot-password', {
        email: user_email,
      });

      setResendEmailSent(true);
      setIsResending(false);
      showNotification(response.data.message || "Verification email resent. Please check your inbox.", "success");

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Failed to resend verification email.";
      setErrorMessage(errorMsg);
      setResendEmailSent(false);
      setIsResending(false);
      showNotification(errorMsg, "error");
    }
  }, [user_email, showNotification]); // Added user_email to useCallback dependency array

  const navigate_to_login = useCallback(() => {
    navigate('/login');
  }, [navigate]); // Added navigate to useCallback dependency array

  // --- Render Logic ---
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] md:min-h-[calc(100vh-200px)] p-4">
        <div className="w-full max-w-md px-6 py-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
            Verify Your Email
          </h2>

          {!errorMessage && resend_email_sent && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6 text-center">
              <span className="block sm:inline">
                Verification email resent successfully. Please check your inbox (and spam folder).
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 text-center">
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          )}

          <p className="text-lg text-center text-gray-600 dark:text-gray-300 mb-6">
            {user_email ? (
              <>
                A verification email has been sent to{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{user_email}</span>.
                <br />
                Please check your inbox and spam folder to complete the verification process.
              </>
            ) : (
              <>
                Please check your email inbox (including spam folder) for a verification link sent during registration.
              </>
            )}
          </p>

          <div className="flex flex-col space-y-4">
            <button
              onClick={handle_resend_verification}
              disabled={is_resending || !user_email.trim()}
              className={`w-full px-4 py-2 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out
                ${is_resending
                  ? 'bg-gray-400 cursor-not-allowed dark:bg-gray-600'
                  : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600'
                }`}
            >
              {is_resending ? 'Sending...' : 'Resend Verification Email'}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already verified?
              <Link
                to="/login"
                onClick={navigate_to_login}
                className="ml-1 font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Go to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_LoginPendingVerification;