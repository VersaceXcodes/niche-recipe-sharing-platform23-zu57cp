import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore, AuthState } from '@/store/main'; // Assuming the Zustand store is exported like this

// --- Define Interfaces ---
interface LoginFormState {
  email: string;
  password: string;
}

interface FormErrors {
  general: string | null;
}

const UV_Login: React.FC = () => {
  const navigate = useNavigate();
  // Correctly type the Zustand hook
  const { login, is_authenticated, auth_error } = useAppStore((state: AuthState) => ({
    login: state.login,
    is_authenticated: state.is_authenticated,
    auth_error: state.auth_error, // Access auth_error from the store
  }));

  const [login_form_data, set_login_form_data] = useState<LoginFormState>({
    email: '',
    password: '',
  });
  // Initialize form_errors with null, but will be updated based on store state or validation
  const [form_errors, set_form_errors] = useState<FormErrors>({
    general: null
  });
  const [is_submitting, set_is_submitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null); // Ref for focusing email input

  // Redirect if already authenticated
  useEffect(() => {
    if (is_authenticated) {
      navigate('/');
    }
  }, [is_authenticated, navigate]);

  // Update form_errors when auth_error from the store changes after a failed login attempt
  useEffect(() => {
    if (!is_authenticated && auth_error) {
      set_form_errors({ general: auth_error });
    } else {
      // Clear general error if the user is authenticated or store error is cleared
      set_form_errors({ general: null });
    }
  // We only want to react to changes in auth_error from the store, avoid setting form_errors if the component is just rendering initially without auth_error
  }, [auth_error, is_authenticated]);

  /**
   * Validates the login form inputs.
   * Returns true if validation passes, false otherwise.
   */
  const validate_login_input = (): boolean => {
    let errors: FormErrors = { general: null };
    let isValid = true;

    if (!login_form_data.email.trim()) {
      errors.general = 'Email is required.';
      isValid = false;
    } else if (!/^[\\S]+@[\\S]+\\.[\\S]+$/.test(login_form_data.email)) {
      errors.general = 'Email address is invalid.';
      isValid = false;
    }

    // Perform password validation only if email is valid or if it's the first error encountered
    if (!login_form_data.password.trim()) {
      // If email already has an error, we combine messages or prioritize
      if (errors.general) {
         errors.general += ' and Password is required.';
      } else {
         errors.general = 'Password is required.';
      }
      isValid = false;
    }

    set_form_errors(errors);
    return isValid;
  };

  /**
   * Handles the login process by calling the global store's login action.
   */
  const handle_login = async () => {
    if (validate_login_input()) {
      set_is_submitting(true);
      try {
        const success = await login(
          login_form_data.email,
          login_form_data.password,
        );
        if (!success) {
          // The store's login action should have updated auth_error.
          // We rely on the useEffect above to update form_errors based on that.
          // If the store's login action guarantees setting auth_error on failure,
          // this manual setting might be redundant but could serve as a fallback.
          // However, it's cleaner to let the useEffect handle based on store state.
          // As a safety net, if the useEffect doesn't catch it, we can attempt:
          const currentAuthError = useAppStore.getState().auth_error;
          if (currentAuthError) {
            set_form_errors({ general: currentAuthError });
          } else {
            // Fallback error message if store doesn't provide one
            set_form_errors({ general: 'Login failed. Please try again.' });
          }
        }
      } catch (error) {
        // Handle potential network or other exceptions during login API call
        console.error('Login API Call Error:', error);
        set_form_errors({ general: 'An unexpected error occurred. Please try again.' });
      } finally {
        set_is_submitting(false);
      }
    } else {
        // Focus email input if it's empty or invalid on submit attempt
        if (!login_form_data.email.trim() || !/^[\\S]+@[\\S]+\\.[\\S]+$/.test(login_form_data.email)) {
             emailInputRef.current?.focus();
        } else if (!login_form_data.password.trim()) {
            // Optionally focus password if email is valid but password is not
            // This might require managing focus state more granularly
        }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    set_login_form_data((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear the general error only if the input is currently valid and was previously invalid
    // This approach is less aggressive and prevents premature clearing.
    let newErrors = { ...form_errors };
    let needsErrorUpdate = false;

    if (name === 'email') {
      if (value.trim() && form_errors.general && form_errors.general.includes('Email')) {
        // If email becomes valid, check password.
        // If password is also invalid, keep the error.
        if(!login_form_data.password.trim()){
           // Keep general error about password or combine them
        } else {
            newErrors.general = null;
            needsErrorUpdate = true;
        }
      }
    } else if (name === 'password') {
      if (value.trim() && form_errors.general && form_errors.general.includes('Password')) {
        // If password becomes valid, re-evaluate email error.
        if(!login_form_data.email.trim() || !/^[\\S]+@[\\S]+\\.[\\S]+$/.test(login_form_data.email)){
            // Keep general error about email or combine them
        } else {
            newErrors.general = null;
            needsErrorUpdate = true;
        }
      }
    }

    // If specific conditions met for clearing or updating error, apply it.
    // This refactored approach avoids directly setting `general: null` blindly.
    // A more robust solution would be to re-run validation on input change for immediate feedback,
    // or to only clear the error if the specific problematic field is now valid.
    // For now, we clear if specific invalidating text is removed.
    if (needsErrorUpdate && newErrors.general === null) {
      set_form_errors({ general: null });
    } else if (newErrors.general !== form_errors.general) {
      // This ensures if we decided NOT to clear, we don't introduce a bug.
      // If a different error state is reached due to dependency on other field, update it.
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default form submission behavior
      handle_login();
    }
  };

  // If already authenticated, navigation is handled by useEffect, but this prevents rendering the form.
  if (is_authenticated) {
    return null; // Or a loading spinner, but null is cleaner as useEffect handles redirect.
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[-webkit-calc(100vh-theme(spacing.16))] min-h-screen-nav py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
              Or{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                create a new account
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  ref={emailInputRef}
                  value={login_form_data.email}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={login_form_data.password}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="Password"
                />
              </div>
            </div>

            {/* Display general error from form validation or backend API call */}
            {form_errors.general && (
              <p className="text-red-600 text-sm text-center dark:text-red-400">
                {form_errors.general}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Add Remember Me checkbox if required, currently not in PRD */}
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="button" // Changed from submit to button to prevent default refresh when using onSubmit={(e) => e.preventDefault()}
                onClick={handle_login}
                disabled={is_submitting}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white
                  focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out
                  ${
                    is_submitting
                      ? 'bg-primary-400 dark:bg-primary-600 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600'
                  }`}
              >
                {is_submitting ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M12 2a10 10 0 00-10 10 10 10 0 0010 10 10 10 0 0010-10 10 10 0 00-10-10zM13 13a1 1 0 01-2 0v-2a1 1 0 112 0v2z"
                    ></path>
                  </svg>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_Login;