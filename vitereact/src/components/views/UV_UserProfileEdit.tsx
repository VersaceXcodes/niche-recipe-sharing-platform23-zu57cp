import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main'; // Assuming the zustand store is correctly exported

// --- API Base URL ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- Type Definitions ---

// Re-using types from the global store for consistency
import type { UserProfile, UserSummary, Notification } from '@/store/main';

interface ProfileFormState {
  username: string;
  first_name: string | null;
  last_name: string | null;
  current_password?: string; // Make optional as it's only needed for password change
  new_password?: string;     // Make optional
}

interface FormErrors {
  username?: string;
  current_password?: string;
  new_password?: string;
  general?: string;
}

// Interface for the profile data fetched from API
interface FetchUserProfileResponse extends UserProfile {}

// Interface for the response of updating user profile details
interface UpdateUserProfileResponse {
  message: string;
  user: UserSummary; // Returns updated summary
}

// Interface for the response of uploading profile picture
interface UploadProfilePictureResponse {
  message: string;
  profile_picture_url: string;
}

// --- Axios Instance (for type safety and base URL configuration) ---
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

const UV_UserProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    current_user_profile,
    user_profile_summary,
    loadUserProfile, // Action to fetch current user's full profile
    updateUserProfile,
    uploadProfilePicture,
    showNotification,
    logout
   } = useAppStore();

  const [profile_data, set_profile_data] = useState<ProfileFormState>({
    username: '',
    first_name: null,
    last_name: null,
    current_password: '',
    new_password: '',
  });
  const [profile_picture_file, set_profile_picture_file] = useState<File | null>(null);
  const [profile_picture_preview, set_profile_picture_preview] = useState<string | null>(null);
  const [form_errors, set_form_errors] = useState<FormErrors>({});
  const [is_saving, set_is_saving] = useState<boolean>(false);
  const [password_section_visible, set_password_section_visible] = useState<boolean>(false);
  const [has_password_changed, set_has_password_changed] = useState<boolean>(false);

  // Ref to hold the preview URL for cleanup
  const previewBlobUrl = useRef<string | null>(null);

   // --- Query for fetching current user profile ---
  const {
    data: fetched_profile,
    isLoading: is_profile_loading,
    error: profile_fetch_error,
   } = useQuery<FetchUserProfileResponse, Error>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      // Use the global store action to load profile, which handles auth headers
      // and potential logout on expired token.
      await loadUserProfile(); // This updates current_user_profile in Zustand store
      // Return the data from the store for useQuery's convenience
      const userProfile = useAppStore.getState().current_user_profile;
      if (!userProfile) {
          // Trigger an error suitable for useQuery's error handling.
          throw new Error('Failed to load user profile from store.');
      }
      return userProfile;
    },
    // Only fetch if not authenticated or profile data is not readily available in store
    // Note: This might fetch even if store has data, to ensure it's fresh from API.
    // A more optimized approach would check store first. For R/W component, fetching is safer.
    enabled: !!useAppStore.getState().access_token, // Only enable if authenticated
    staleTime: 1000 * 60 * 5, // Refresh profile every 5 minutes
    retry: false, // Prevent retries on auth errors, handle redirection in onError
   });

  // --- Effect to populate form data when profile is loaded ---
  useEffect(() => {
    const currentUser = useAppStore.getState().current_user_profile;
    if (currentUser) {
      set_profile_data({
        username: currentUser.username || '',
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        current_password: '',
        new_password: '',
      });
      if (currentUser.profile_picture_url) {
        set_profile_picture_preview(currentUser.profile_picture_url);
      }
    } else if (profile_fetch_error) {
        // Handle error case, e.g., redirect to login if profile fetch fails due to auth
        if (profile_fetch_error.message.includes('401') || profile_fetch_error.message.includes('Failed to load user profile')) {
            showNotification('Session expired or authentication failed. Please log in again.', 'error');
            logout();
            navigate('/login');
        } else {
            // Display other profile fetch errors
            showNotification(`Error loading profile: ${profile_fetch_error.message}`, 'error');
        }
    }
    // Cleanup function for the blob URL
    return () => {
      if (previewBlobUrl.current) {
        URL.revokeObjectURL(previewBlobUrl.current);
      }
    };
  }, [current_user_profile, profile_fetch_error, navigate, showNotification, logout]);

  // --- Mutation for updating profile details (names, passwords) ---
  const profileUpdateMutation = useMutation<
    UpdateUserProfileResponse,
    Error,
    Partial<ProfileFormState> // Only send fields that might change
  >({
    mutationFn: async (dataToUpdate) => {
      // Filter out undefined/null values and password fields if not intended for update
      const payload: Partial<ProfileFormState> = {};
      if (dataToUpdate.username !== undefined) payload.username = dataToUpdate.username;
      if (dataToUpdate.first_name !== undefined) payload.first_name = dataToUpdate.first_name;
      if (dataToUpdate.last_name !== undefined) payload.last_name = dataToUpdate.last_name;

      // Conditionally add password fields if the section is visible and fields are provided
      if (password_section_visible && dataToUpdate.current_password && dataToUpdate.new_password) {
          payload.current_password = dataToUpdate.current_password;
          payload.new_password = dataToUpdate.new_password;
      }

      // If only password fields were intended and provided, but other details were not, still allow update.
      // If payload is empty, it means no valid fields were passed for update (e.g., just toggled visibility).
      // For profile details, empty payload is an error if user tried to save.
      // However, if user only changed picture, this mutation might not be called.
      if (Object.keys(payload).length === 0) {
          // This check might be too strict if only profile picture is changing.
          // For profile details, empty payload is an error if user tried to save.
          // However, if user only changed picture, this mutation might not be called.
          throw new Error('No valid profile fields to update.');
      }

      return axiosInstance.put<UpdateUserProfileResponse>('/users/me', payload, {
         headers: {
            Authorization: `Bearer ${useAppStore.getState().access_token}`,
          },
      });
    },
    onMutate: () => {
      set_is_saving(true);
      set_form_errors({ username: '', current_password: '', new_password: '' }); // Clear previous specific errors
    },
    onSuccess: (response) => {
      showNotification(response.data.message || 'Profile updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] }); // Invalidate cache to refetch updated data
      set_is_saving(false);
      set_has_password_changed(false); // Reset password change flag
      set_password_section_visible(false); // Hide password section after successful update
      // Reset password fields in local state after successful update
      set_profile_data(prev => ({ ...prev, current_password: '', new_password: '' }));
      // Clear any general errors that might have been set
      set_form_errors(prev => ({ ...prev, general: '' }));
    },
    onError: (error) => {
      set_is_saving(false);
      const apiError = error as any;
      const errorMessage = apiError.response?.data?.error || apiError.message || 'An error occurred';
      
      // Check if it's a validation error that can be mapped to fields
      if (apiError.response?.status === 400 && typeof apiError.response.data.error === 'object') {
           // Assuming backend returns an object of field errors
           const fieldErrors = apiError.response.data.error as FormErrors;
           set_form_errors({
             username: fieldErrors.username,
             current_password: fieldErrors.current_password,
             new_password: fieldErrors.new_password,
             general: fieldErrors.general, // Include general errors if any
           });
           // Also show a toast for any general error from the backend
           if (fieldErrors.general) {
               showNotification(fieldErrors.general, 'error');
           }
      } else {
          // General error message
          set_form_errors({ general: errorMessage });
          showNotification(errorMessage, 'error');
      }
    },
  });

  // --- Mutation for uploading profile picture ---
  const profilePictureMutation = useMutation<
    UploadProfilePictureResponse,
    Error
  >({
    mutationFn: async () => {
      if (!profile_picture_file) {
        throw new Error('No profile picture file selected.');
      }
      const formData = new FormData();
      formData.append('profile_picture', profile_picture_file);

      return axiosInstance.post<UploadProfilePictureResponse>(
        '/users/me/profile-picture',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${useAppStore.getState().access_token}`,
          },
        },
      );
    },
    onMutate: () => {
      set_is_saving(true);
      set_form_errors(prev => ({ ...prev, general: '' })); // Clear general errors
    },
    onSuccess: (response) => {
      showNotification(response.data.message || 'Profile picture updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] }); // Refetch to update profile picture URL
      set_profile_picture_file(null); // Clear the selected file
      // Update preview immediately to avoid flicker and reflect the new URL
      set_profile_picture_preview(response.data.profile_picture_url);
      if (previewBlobUrl.current) {
        URL.revokeObjectURL(previewBlobUrl.current);
        previewBlobUrl.current = null;
      }
      set_is_saving(false);
    },
    onError: (error: any) => {
       set_is_saving(false);
       const errorMessage = error.response?.data?.error || error.message || 'Failed to upload profile picture';
       set_form_errors({ general: errorMessage }); // Use general error for picture upload issues
       showNotification(errorMessage, 'error');
       // If an error occurs, clear the selected file to allow user to re-select
       set_profile_picture_file(null);
       if (previewBlobUrl.current) {
         URL.revokeObjectURL(previewBlobUrl.current);
         previewBlobUrl.current = null;
       }
       // Restore previous preview or reset if failed to upload
       set_profile_picture_preview(useAppStore.getState().current_user_profile?.profile_picture_url || null);
    },
  });

  // --- Handlers ---
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    set_profile_data((prev_data) => ({
      ...prev_data,
      [name]: value,
    }));
     // Clear specific field error when user starts typing in it
     if (form_errors[name as keyof FormErrors]) {
       set_form_errors((prev_errors) => ({
            ...prev_errors,
              [name]: undefined, // Use undefined to remove the key or set empty string
           }));
      }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    // Clear previous general errors related to file selection
    set_form_errors(prev => ({ ...prev, general: undefined }));

    if (files && files[0]) {
      const file = files[0];
      // Basic validation for file type
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        set_form_errors((prev) => ({ ...prev, general: 'Only PNG and JPEG files are allowed.' }));
        set_profile_picture_file(null);
        // Revoke previous blob URL if any
        if (previewBlobUrl.current) {
          URL.revokeObjectURL(previewBlobUrl.current);
          previewBlobUrl.current = null;
        }
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // Max 5MB
          set_form_errors((prev) => ({ ...prev, general: 'File size exceeds 5MB limit.' }));
          set_profile_picture_file(null);
          // Revoke previous blob URL if any
          if (previewBlobUrl.current) {
            URL.revokeObjectURL(previewBlobUrl.current);
            previewBlobUrl.current = null;
          }
           return;
      }

      set_profile_picture_file(file);
      // Revoke previous blob URL before creating new one
      if (previewBlobUrl.current) {
        URL.revokeObjectURL(previewBlobUrl.current);
      }
      const newBlobUrl = URL.createObjectURL(file);
      set_profile_picture_preview(newBlobUrl);
      previewBlobUrl.current = newBlobUrl;
    }
  };

 const handleSaveProfileDetails = () => {
    const { username, first_name, last_name, current_password, new_password } = profile_data;

     // Basic client-side validation
     const errors: FormErrors = {};
     if (!username) {
       errors.username = 'Username is required.';
     } else if (username.length < 3) {
       errors.username = 'Username must be at least 3 characters long.';
     }
     // Add more username validation if needed (e.g., allowed characters) based on backend constraints.

     let attemptingPasswordChange = false;
     // Password change validation
     if (password_section_visible) {
         // Check if user is trying to change password by providing any password field
         if (current_password || new_password) {
            attemptingPasswordChange = true;
            if (!current_password) {
                errors.current_password = 'Current password is required to change password.';
            }
            if (!new_password) {
                errors.new_password = 'New password is required.';
            } else if (new_password.length < 8) {
                errors.new_password = 'New password must be at least 8 characters long.';
            } else if (new_password === current_password) {
                errors.new_password = 'New password cannot be the same as the current password.';
            }
            // If both current and new passwords are provided, check for match.
            if (current_password && new_password && current_password !== new_password) {
                 errors.new_password = 'Passwords do not match.';
            }
         }
     }

     set_form_errors(errors);

     if (Object.keys(errors).length === 0) {
       // Prepare data for profile update mutation
       const profileUpdatePayload: Partial<ProfileFormState> = {
            username,
            first_name,
            last_name,
       };

       // Only include password fields if a password change attempt was detected and validation passed
       if (attemptingPasswordChange && !errors.current_password && !errors.new_password) {
           profileUpdatePayload.current_password = current_password;
           profileUpdatePayload.new_password = new_password;
           set_has_password_changed(true);
       }

       // If the payload is empty, it means nothing was changed or intended to be changed
       // (e.g., only toggled password section but didn't enter fields, or no errors but no changes). 
       // For details update, we should proceed if payload has username/names.
       const hasDetailsChanged = profileUpdatePayload.username !== (useAppStore.getState().current_user_profile?.username || '') || 
                                profileUpdatePayload.first_name !== useAppStore.getState().current_user_profile?.first_name || 
                                profileUpdatePayload.last_name !== useAppStore.getState().current_user_profile?.last_name;

       // If attempting password change or details have changed, mutate.
       if (attemptingPasswordChange || hasDetailsChanged) {
            profileUpdateMutation.mutate(profileUpdatePayload);
       } else {
           // No changes to save for details, and password section visible but not attempted
           if (password_section_visible) {
               // If password section is visible but no change was intended, maybe hide it
               // Or just inform user nothing to save.
               showNotification('No changes to save.', 'info');
           } else {
               showNotification('No changes to save.', 'info');
           }
       }
     }
  };

  const handleSaveButtonClick = () => {
      // This composite save handles both profile details and password changes.
      // Picture upload is handled separately.
      handleSaveProfileDetails(); // This mutation handles basic profile data and potentially password change
  };


  const handlePictureUploadClick = () => {
    if (profile_picture_file) {
     profilePictureMutation.mutate();
    } else {
       showNotification('Please select a profile picture to upload.', 'info');
    }
  };


  const handleCancel = () => {
    // Invalidate cache primarily to ensure any pending edits are not lost if user returns
    queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    // Navigate back to the user's profile view
    // Use the username from the global state if available.
    const currentUsername = useAppStore.getState().user_profile_summary?.username;
    if (currentUsername) {
      // Navigate to a static 'my profile' view or use a known URL pattern
      // Assuming '/profile/:username' is the correct format
      navigate(`/profile/${currentUsername}`); 
    } else {
      // Fallback if username isn't readily available (e.g., during initial load)
      // Navigate to a safe default like user dashboard or home.
      navigate('/dashboard'); // Or a route like '/profile/me'
    }
  };

  const togglePasswordSection = () => {
    set_password_section_visible(!password_section_visible);
    // Clear password fields and errors when collapsing/expanding to maintain clean state
    if (!password_section_visible) { // If expanding, clear previous state
        set_profile_data(prev => ({ ...prev, current_password: '', new_password: '' }));
        set_form_errors(prev => ({ ...prev, current_password: undefined, new_password: undefined, general: undefined }));
        set_has_password_changed(false);
    } else { // If collapsing, ensure fields are cleared
        set_profile_data(prev => ({ ...prev, current_password: '', new_password: '' }));
        set_form_errors(prev => ({ ...prev, current_password: undefined, new_password: undefined, general: undefined }));
    }
  };

  // Conditional rendering based on loading states
  if (is_profile_loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!useAppStore.getState().is_authenticated || !current_user_profile) {
     // Redirect if somehow accessed without authentication or profile data is missing after auth check
     // This case should ideally be handled by route guards, but double-checking here.
      return (
          <div className="flex flex-col items-center justify-center h-screen space-y-4">
              <p className="text-lg text-gray-700">You need to be logged in to edit your profile.</p>
              <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
              >
                  Go to Login
              </button>
          </div>
       );
  }


  return (
    <>
      {/* Main Profile Edit Form */}
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Edit Your Profile</h1>

        {/* Profile Picture Section */}
        <div className="mb-8 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
          <div>
            <label htmlFor="profile_picture_upload" className="block text-sm font-medium text-gray-700 mb-2">
              Profile Picture
            </label>
            <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-gray-300 mb-3">
              {profile_picture_preview ? (
                <img
                  src={profile_picture_preview}
                  alt="Profile Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.805 13.805 0 015 17c0-2.814.77-5.495 2.135-7.795M5.121 17.804L13 9m0 0L5.121 17.804zm0 0a13.805 13.805 0 0011.764-13.004m-11.764 13.004C10.791 17.805 13.512 17 16 17c2.814 0 5.495.77 7.795 2.135m0 0L13 9m0 0l4.391-4.391"></path></svg>
                </div>
              )}
            </div>
            <input
              id="profile_picture_upload"
              type="file"
              accept="image/png, image/jpeg"
              onChange={handleFileChange}
              className="sr-only" // Hide the default file input
            />
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => document.getElementById('profile_picture_upload')?.click()}
                disabled={is_saving || profilePictureMutation.isPending}
                className="px-4 py-2 bg-gray-100 text-gray-800 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
              >
                Choose Picture
              </button>
              {profile_picture_file && ( // Show Upload button only if a file is selected
                   <button
                     type="button"
                     onClick={handlePictureUploadClick}
                     disabled={is_saving || profilePictureMutation.isPending}
                     className="px-4 py-2 bg-primary-600 text-white rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                   >
                     {profilePictureMutation.isPending ? 'Uploading...' : 'Upload Picture'}
                   </button>
              )}
            </div>

            {form_errors.general && !profile_picture_file && ( // Show general error if it's related to picture and no file is selected
                 <p className="text-red-500 text-sm mt-2">{form_errors.general}</p>
            )}
             {form_errors.general && profile_picture_file && !profilePictureMutation.isPending && ( // Show error if picture uploads fails
                 <p className="text-red-500 text-sm mt-2">{form_errors.general}</p>
            )}
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* Profile Details Section */}
        <div className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={profile_data.username || ''}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-4 py-2 border ${form_errors.username ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${is_saving || profilePictureMutation.isPending ? 'bg-gray-100' : ''}`}
              placeholder="Your username"
              disabled={is_saving || profilePictureMutation.isPending}
              required
            />
            {form_errors.username && <p className="text-red-500 text-sm mt-1">{form_errors.username}</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-1/2">
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={profile_data.first_name || ''}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${is_saving || profilePictureMutation.isPending ? 'bg-gray-100' : ''}`}
                placeholder="First name (optional)"
                disabled={is_saving || profilePictureMutation.isPending}
              />
            </div>
            <div className="w-full sm:w-1/2">
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={profile_data.last_name || ''}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${is_saving || profilePictureMutation.isPending ? 'bg-gray-100' : ''}`}
                placeholder="Last name (optional)"
                disabled={is_saving || profilePictureMutation.isPending}
              />
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* Password Change Section */}
        <div className="mb-6">
          <button
            type="button"
            onClick={togglePasswordSection}
            className="text-primary-600 hover:text-primary-700 font-semibold flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md p-1"
          >
            {password_section_visible ? 'Hide Password Change' : 'Change Password'}
            <svg
              className={`w-5 h-5 ml-1 transform transition-transform ${password_section_visible ? 'rotate-180' : 'rotate-0'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          {password_section_visible && (
            <div className="mt-4 space-y-4 p-4 border border-gray-200 rounded-md bg-gray-50">
              <div>
                <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  id="current_password"
                  name="current_password"
                  value={profile_data.current_password || ''}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-4 py-2 border ${form_errors.current_password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${is_saving ? 'bg-gray-100' : ''}`}
                  placeholder="Enter your current password"
                  disabled={is_saving}
                />
                {form_errors.current_password && <p className="text-red-500 text-sm mt-1">{form_errors.current_password}</p>}
              </div>
              <div>
                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  id="new_password"
                  name="new_password"
                  value={profile_data.new_password || ''}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-4 py-2 border ${form_errors.new_password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${is_saving ? 'bg-gray-100' : ''}`}
                  placeholder="Enter your new password"
                  disabled={is_saving}
                />
                {form_errors.new_password && <p className="text-red-500 text-sm mt-1">{form_errors.new_password}</p>}
                 <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long.</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end mt-8 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={is_saving || profilePictureMutation.isPending}
            className="mr-4 px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>

          {/* Default Save Changes button, handles names and potentially passwords if section is visible */}
          <button
            type="button"
            onClick={handleSaveButtonClick}
            disabled={is_saving || profilePictureMutation.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {is_saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
};

export default UV_UserProfileEdit;