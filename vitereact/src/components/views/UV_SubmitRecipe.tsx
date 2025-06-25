import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main'; // Assuming the store hook is exported like this

// Define the type for a single ingredient in the form
interface FormIngredient {
  ingredient_id?: number | null; // For editing existing ingredients if needed
  quantity: number | '';
  unit: string | null;
  name: string;
}

// Define the type for a single instruction step in the form
interface FormInstruction {
  instruction_id?: number | null; // For editing existing instructions if needed
  step_number: number;
  description: string;
}

// Define the schema for recipe form data based on the analysis
interface RecipeFormData {
  title: string;
  description: string;
  cover_photo_file: File | null;
  cover_photo_url: string | null; // For displaying current photo during edit
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  difficulty_level: 'Easy' | 'Medium' | 'Hard';
  nutri_net_carbs_grams_per_serving: number | null;
  nutri_protein_grams_per_serving: number | null;
  nutri_fat_grams_per_serving: number | null;
  notes_tips: string | null;
  ingredients: FormIngredient[];
  instructions: FormInstruction[];
  tags: string[];
}

// Define the shape of form errors
interface FormErrors {
  _form?: string;
  title?: string;
  description?: string;
  cover_photo?: string;
  prep_time_minutes?: string;
  cook_time_minutes?: string;
  servings?: string;
  difficulty_level?: string;
  ingredients?: IngredientFormErrors[];
  instructions?: InstructionFormErrors[];
  nutri_net_carbs_grams_per_serving?: string;
  nutri_protein_grams_per_serving?: string;
  nutri_fat_grams_per_serving?: string;
  tags?: string;
}

// Define nested form error interfaces
interface IngredientFormErrors {
  quantity?: string;
  unit?: string;
  name?: string;
}

interface InstructionFormErrors {
  description?: string;
}

// --- API Client Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Add an interceptor to automatically include the auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token'); // Or get from Zustand store if available globally
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Component ---
const UV_SubmitRecipe: React.FC = () => {
  const navigate = useNavigate();
  const { recipe_id } = useParams<{ recipe_id?: string }>();
  const queryClient = useQueryClient();
  const { is_authenticated, access_token, showNotification } = useAppStore((state) => ({
    is_authenticated: state.is_authenticated,
    access_token: state.access_token,
    showNotification: state.showNotification,
  }));

  // State variables for the form
  const [recipe_form_data, set_recipe_form_data] = useState<RecipeFormData>({
    title: '',
    description: '',
    cover_photo_file: null,
    cover_photo_url: null,
    prep_time_minutes: null,
    cook_time_minutes: null,
    servings: null,
    difficulty_level: 'Easy',
    nutri_net_carbs_grams_per_serving: null,
    nutri_protein_grams_per_serving: null,
    nutri_fat_grams_per_serving: null,
    notes_tips: null,
    ingredients: [{ quantity: '', unit: null, name: '' }], // Start with one empty ingredient
    instructions: [{ step_number: 1, description: '' }], // Start with one empty instruction
    tags: [],
  });

  const [form_errors, set_form_errors] = useState<FormErrors>({});
  const [is_submitting, set_is_submitting] = useState<boolean>(false);
  const [is_loading_initial_data, set_is_loading_initial_data] = useState<boolean>(false);
  const [is_editing, set_is_editing] = useState<boolean>(false);
  const [current_recipe_id, set_current_recipe_id] = useState<number | null>(null);

  // Fetch existing recipe data if in edit mode
  const { data: existingRecipeData, isLoading: isLoadingExistingRecipe } = useQuery<RecipeFormData, Error>({
    queryKey: ['recipeForEdit', recipe_id],
    queryFn: async () => {
      if (!recipe_id) return null;
      const response = await axiosInstance.get<RecipeFormData>(`/recipes/${recipe_id}`);
      return response.data;
    },
    enabled: !!recipe_id && is_authenticated!, // Fetch only if recipe_id exists and user is authenticated
    onSuccess: (data) => {
      if (data) {
        set_recipe_form_data({
          ...data,
          // Ensure arrays are initialized properly, even if empty from API
          ingredients: data.ingredients || [{ quantity: '', unit: null, name: '' }],
          instructions: data.instructions || [{ step_number: 1, description: '' }],
          tags: data.tags || [],
          // Convert numeric fields to string for controlled inputs, handle nulls and empty strings
          prep_time_minutes: data.prep_time_minutes ?? '',
          cook_time_minutes: data.cook_time_minutes ?? '',
          servings: data.servings ?? '',
          nutri_net_carbs_grams_per_serving: data.nutri_net_carbs_grams_per_serving ?? '',
          nutri_protein_grams_per_serving: data.nutri_protein_grams_per_serving ?? '',
          nutri_fat_grams_per_serving: data.nutri_fat_grams_per_serving ?? '',
          notes_tips: data.notes_tips ?? '',
          cover_photo_url: data.cover_photo_url || null, // Keep URL for display
          cover_photo_file: null, // Reset file input on load
        });
        set_is_editing(true);
        set_current_recipe_id(parseInt(recipe_id!, 10));
        set_is_loading_initial_data(false);
      }
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to load recipe for editing', 'error');
      navigate('/browse'); // Redirect if loading fails
    },
    enabled: !!recipe_id, // Fetch only if recipe_id is present
  });

  useEffect(() => {
    if (recipe_id) {
      set_is_loading_initial_data(true);
    }
  }, [recipe_id]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!is_authenticated) {
      navigate('/login');
    }
  }, [is_authenticated, navigate]);

  const navigate_back = useCallback(() => {
    // Decide where to go back to. If editing, maybe back to recipe view or profile.
    // If new submission, maybe back to browse. For now, going to browse is safe.
    navigate('/browse');
  }, [navigate]);

  const validate_recipe_form = useCallback(() => {
    const errors: FormErrors = {};
    let isValid = true;

    if (!recipe_form_data.title.trim()) {
      errors.title = 'Recipe title is required.';
      isValid = false;
    }
    if (!recipe_form_data.description.trim()) {
      errors.description = 'Recipe description is required.';
      isValid = false;
    }
    if (!recipe_form_data.cover_photo_file && !recipe_form_data.cover_photo_url) {
      errors.cover_photo = 'Recipe cover photo is required.';
      isValid = false;
    }
    if (recipe_form_data.prep_time_minutes === '' || recipe_form_data.prep_time_minutes <= 0) {
      errors.prep_time_minutes = 'Preparation time is required and must be positive.';
      isValid = false;
    }
    if (recipe_form_data.cook_time_minutes === '' || recipe_form_data.cook_time_minutes <= 0) {
      errors.cook_time_minutes = 'Cooking time is required and must be positive.';
      isValid = false;
    }
    if (recipe_form_data.servings === '' || recipe_form_data.servings <= 0) {
      errors.servings = 'Servings is required and must be positive.';
      isValid = false;
    }
    if (recipe_form_data.ingredients.length === 0 || recipe_form_data.ingredients.some(ing => !ing.name.trim() || ing.quantity === '' || ing.quantity <= 0)) {
      errors.ingredients = 'At least one ingredient with quantity and name is required.';
      isValid = false;
    }
    if (recipe_form_data.instructions.length === 0 || recipe_form_data.instructions.some(inst => !inst.description.trim())) {
      errors.instructions = 'At least one instruction step is required.';
      isValid = false;
    }
    if (recipe_form_data.nutri_net_carbs_grams_per_serving !== '' && (recipe_form_data.nutri_net_carbs_grams_per_serving as any) < 0) {
      errors.nutri_net_carbs_grams_per_serving = 'Net carbs cannot be negative.';
      isValid = false;
    }
    if (recipe_form_data.nutri_protein_grams_per_serving !== '' && (recipe_form_data.nutri_protein_grams_per_serving as any) < 0) {
      errors.nutri_protein_grams_per_serving = 'Protein cannot be negative.';
      isValid = false;
    }
    if (recipe_form_data.nutri_fat_grams_per_serving !== '' && (recipe_form_data.nutri_fat_grams_per_serving as any) < 0) {
      errors.nutri_fat_grams_per_serving = 'Fat cannot be negative.';
      isValid = false;
    }

    set_form_errors(errors);
    return isValid;
  }, []);

  // Mutation for submitting or updating a recipe
  const mutation = useMutation<number | null, Error, RecipeFormData>({
    mutationFn: async (formData) => {
      set_is_submitting(true);
      const recipePayload = { ...formData }; // Create a mutable copy

      // Prepare FormData
      const dataForApi = new FormData();

      // Textual data - stringify arrays
      dataForApi.append('title', recipePayload.title || '');
      dataForApi.append('description', recipePayload.description || '');
      dataForApi.append('prep_time_minutes', String(recipePayload.prep_time_minutes === '' ? 0 : recipePayload.prep_time_minutes));
      dataForApi.append('cook_time_minutes', String(recipePayload.cook_time_minutes === '' ? 0 : recipePayload.cook_time_minutes));
      dataForApi.append('servings', String(recipePayload.servings === '' ? 0 : recipePayload.servings));
      dataForApi.append('difficulty_level', recipePayload.difficulty_level);
      dataForApi.append('nutri_net_carbs_grams_per_serving', recipePayload.nutri_net_carbs_grams_per_serving === '' ? '' : String(recipePayload.nutri_net_carbs_grams_per_serving));
      dataForApi.append('nutri_protein_grams_per_serving', recipePayload.nutri_protein_grams_per_serving === '' ? '' : String(recipePayload.nutri_protein_grams_per_serving));
      dataForApi.append('nutri_fat_grams_per_serving', recipePayload.nutri_fat_grams_per_serving === '' ? '' : String(recipePayload.nutri_fat_grams_per_serving));
      dataForApi.append('notes_tips', recipePayload.notes_tips || '');
      dataForApi.append('ingredients', JSON.stringify(recipePayload.ingredients.map((ing, index) => ({ ...ing, step_number: index + 1 }))));
      dataForApi.append('instructions', JSON.stringify(recipePayload.instructions.map((inst, index) => ({ ...inst, step_number: index + 1 }))));
      dataForApi.append('tags', JSON.stringify(recipePayload.tags));

      // File upload
      if (recipePayload.cover_photo_file) {
        dataForApi.append('cover_photo', recipePayload.cover_photo_file);
      }

      if (is_editing && current_recipe_id) {
        // Update existing recipe
        return axiosInstance.put<any>(`/recipes/${current_recipe_id}`, dataForApi, {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'multipart/form-data',
          },
        }).then(response => {
          showNotification(response.data.message || 'Recipe updated successfully', 'success');
          queryClient.invalidateQueries({ queryKey: ['recipeForEdit', current_recipe_id] }); // Invalidate cache for edit view
          return current_recipe_id; // Return ID for navigation upon success
        });
      } else {
        // Submit new recipe
        return axiosInstance.post<any>('/recipes', dataForApi, {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'multipart/form-data',
          },
        }).then(response => {
          showNotification(response.data.message || 'Recipe submitted successfully', 'success');
          // Invalidate queries that might show this new recipe if needed elsewhere
          queryClient.invalidateQueries({ queryKey: ['recipes'] }); // Example invalidation
          return response.data.recipe_id; // Return the new recipe ID
        });
      }
    },
    onSuccess: (newOrUpdatedRecipeId) => {
      set_is_submitting(false);
      if (newOrUpdatedRecipeId) {
        navigate(`/submit-recipe/success/`); // Navigate to confirmation page
      }
    },
    onError: (error) => {
      set_is_submitting(false);
      set_form_errors({ _form: error.message || 'An unexpected error occurred.' }); // Show a general form error
      showNotification(error.message || 'Failed to submit recipe.', 'error');
    },
  });

  const handle_recipe_submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate_recipe_form()) {
      mutation.mutate(recipe_form_data);
    }
  };

  // Handlers for form field changes
  const handle_change = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    // Special handling for number inputs to ensure they are numbers or empty string
    const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;

    set_recipe_form_data(prev => ({
      ...prev,
      [name]: processedValue,
    }));

    // Clear error for the field when it's being changed
    set_form_errors(prev => ({ ...prev, [name]: undefined }));
  }, []);

   const handle_number_change = useCallback((fieldName: keyof RecipeFormData, value: string | number) => {
        const parsedValue = value === '' ? '' : Number(value);
        if (!isNaN(parsedValue as number) || value === '') {
           set_recipe_form_data(prev => ({ ...prev, [fieldName]: parsedValue as number | '' }));
           set_form_errors(prev => ({ ...prev, [fieldName]: undefined }));
        }
    }, []);

  const handle_cover_photo_change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showNotification('Please upload an image file.', 'error');
        set_form_errors(prev => ({ ...prev, cover_photo: 'Invalid file type. Please upload an image.' }));
        return;
      }
      // Basic file size check (e.g., 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('File size exceeds the limit (5MB).', 'error');
        set_form_errors(prev => ({ ...prev, cover_photo: 'File size exceeds 5MB limit.' }));
        return;
      }

      set_recipe_form_data(prev => ({
        ...prev,
        cover_photo_file: file,
        cover_photo_url: URL.createObjectURL(file), // Preview the image
      }));
      set_form_errors(prev => ({ ...prev, cover_photo: undefined }));
    } else {
        // If user cancels file selection, reset preview if no original URL exists or clear file if it was new
        set_recipe_form_data(prev => ({
            ...prev,
            cover_photo_file: null,
            // If editing and original URL was present, keep it. Otherwise, reset.
            cover_photo_url: is_editing ? prev.cover_photo_url : null,
        }));
    }
  }, [is_editing, showNotification]);

  // Dynamic lists handlers
  const add_ingredient = useCallback(() => {
    set_recipe_form_data(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { quantity: '', unit: null, name: '' }],
    }));
  }, []);

  const remove_ingredient = useCallback((index: number) => {
    set_recipe_form_data(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  }, []);

  const add_instruction_step = useCallback(() => {
    set_recipe_form_data(prev => ({
      ...prev,
      instructions: [...prev.instructions, { step_number: prev.instructions.length + 1, description: '' }],
    }));
  }, []);

  const remove_instruction_step = useCallback((index: number) => {
    set_recipe_form_data(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  }, []);

  const handleIngredientChange = useCallback((index: number, field: keyof FormIngredient, value: string | number | null) => {
    set_recipe_form_data(prev => {
      const newIngredients = [...prev.ingredients];
      newIngredients[index] = {
        ...newIngredients[index],
        [field]: value
      };
      return { ...prev, ingredients: newIngredients };
    });
     // Clear ingredient errors if user corrects them
     set_form_errors(prev => {
        const currentErrors = prev.ingredients as any; // Cast to any for flexible assignment
        if (currentErrors && currentErrors[index] && currentErrors[index][field]) {
            delete currentErrors[index][field];
            // If no errors left for this ingredient, potentially clean up
            if(Object.keys(currentErrors[index]).length === 0) delete currentErrors[index];
            if(Object.keys(currentErrors).length === 0) return {};
            return { ingredients: currentErrors };
        }
        return prev; // No change needed
    });

  }, []);


  const handleInstructionChange = useCallback((index: number, field: keyof FormInstruction, value: string | number) => {
    set_recipe_form_data(prev => {
      const newInstructions = [...prev.instructions];
      newInstructions[index] = {
        ...newInstructions[index],
        [field]: value
      };
       // Update step number based on index if field is 'description' or similar
       if (field === 'description') {
            newInstructions[index].step_number = index + 1;
       }
      return { ...prev, instructions: newInstructions };
    });
     // Clear instruction errors if user corrects them
    set_form_errors(prev => {
        const currentErrors = prev.instructions as any; // Cast to any
        if (currentErrors && currentErrors[index] && currentErrors[index][field]) {
            delete currentErrors[index][field];
            if(Object.keys(currentErrors[index]).length === 0) delete currentErrors[index];
            if(Object.keys(currentErrors).length === 0) return {};
            return { instructions: currentErrors };
        }
        return prev;
    });
  }, []);


  const handleTagChange = useCallback((tag: string) => {
    set_recipe_form_data(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  }, []);

  const handleNutriChange = useCallback((field: keyof Pick<RecipeFormData, 'nutri_net_carbs_grams_per_serving' | 'nutri_protein_grams_per_serving' | 'nutri_fat_grams_per_serving'>, value: string | number | null) => {
       const parsedValue = value === '' ? null : Number(value);
        if (!isNaN(parsedValue as number) || value === '' || value === null) {
            set_recipe_form_data(prev => ({ ...prev, [field]: parsedValue }));
            set_form_errors(prev => ({ ...prev, [field]: undefined })); // Clear field-specific error
        }
    }, []);

  // Available tags for the dropdown/checkboxes
  const available_tags = [
    'Pre-Workout Fuel', 'Post-Workout Recovery', 'High Protein', 'Low Carb Snacks',
    'Quick Meals (<30 Min)', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages',
    'Endurance Fuel', 'Strength Training Support', 'Electrolyte Rich'
  ];

  // Conditional rendering for loading state
  if (!is_authenticated) {
    // This should technically be handled by route guarding, but included for robustness
    return <div className="text-center py-10">Please log in to submit recipes.</div>;
  }

  if (is_loading_initial_data || isLoadingExistingRecipe) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading recipe data...</p>
        {/* You might want a more sophisticated loading spinner here */}
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-6 sm:p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 sm:mb-8">
          {is_editing ? 'Edit Recipe' : 'Submit New Recipe'}
        </h1>

        {form_errors._form && (
           <p className="text-red-500 text-sm text-center mb-4">{form_errors._form}</p>
        )}

        <form onSubmit={handle_recipe_submit} className="space-y-6">
          {/* --- Title --- */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Recipe Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={recipe_form_data.title}
              onChange={handle_change}
              className={`mt-1 block w-full rounded-md border ${form_errors.title ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm p-2.5`}
              required
              aria-invalid={!!form_errors.title}
              aria-describedby={form_errors.title ? "title-error" : undefined}
            />
            {form_errors.title && <p id="title-error" className="text-red-500 text-xs mt-1">{form_errors.title}</p>}
          </div>

          {/* --- Description --- */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={recipe_form_data.description}
              onChange={handle_change}
              rows={4}
              className={`mt-1 block w-full rounded-md border ${form_errors.description ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm p-2.5`}
              required
              aria-invalid={!!form_errors.description}
              aria-describedby={form_errors.description ? "description-error" : undefined}
            />
            {form_errors.description && <p id="description-error" className="text-red-500 text-xs mt-1">{form_errors.description}</p>}
          </div>

          {/* --- Cover Photo --- */}
          <div>
            <label htmlFor="cover_photo" className="block text-sm font-medium text-gray-700">
              Recipe Cover Photo <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex items-center">
              {recipe_form_data.cover_photo_url && (
                <span className="inline-block h-16 w-16 rounded-full overflow-hidden bg-gray-100 mr-4">
                  <img src={recipe_form_data.cover_photo_url} alt="Cover Preview" className="h-full w-full object-cover" />
                </span>
              )}
              <div className="flex flex-col justify-center">
                <input
                  type="file"
                  id="cover_photo"
                  name="cover_photo"
                  accept="image/jpeg, image/png"
                  onChange={handle_cover_photo_change}
                  className={`block text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 ${form_errors.cover_photo ? 'border border-red-500' : ''}`}
                  aria-invalid={!!form_errors.cover_photo}
                  aria-describedby={form_errors.cover_photo ? "cover_photo-error" : undefined}
                />
                <p className="text-xs text-gray-500 mt-1">Max 5MB (JPEG, PNG)</p>
                {form_errors.cover_photo && <p id="cover_photo-error" className="text-red-500 text-xs mt-1">{form_errors.cover_photo}</p>}
              </div>
            </div>
          </div>

          {/* --- Times & Servings --- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label htmlFor="prep_time_minutes" className="block text-sm font-medium text-gray-700">
                Prep Time (mins) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="prep_time_minutes"
                name="prep_time_minutes"
                value={recipe_form_data.prep_time_minutes}
                onChange={(e) => handle_number_change('prep_time_minutes', e.target.value)}
                min="0"
                className={`mt-1 block w-full rounded-md border ${form_errors.prep_time_minutes ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm p-2.5`}
                required
                aria-invalid={!!form_errors.prep_time_minutes}
              />
              {form_errors.prep_time_minutes && <p className="text-red-500 text-xs mt-1">{form_errors.prep_time_minutes}</p>}
            </div>
            <div>
              <label htmlFor="cook_time_minutes" className="block text-sm font-medium text-gray-700">
                Cook Time (mins) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="cook_time_minutes"
                name="cook_time_minutes"
                value={recipe_form_data.cook_time_minutes}
                onChange={(e) => handle_number_change('cook_time_minutes', e.target.value)}
                min="0"
                className={`mt-1 block w-full rounded-md border ${form_errors.cook_time_minutes ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm p-2.5`}
                required
                aria-invalid={!!form_errors.cook_time_minutes}
              />
              {form_errors.cook_time_minutes && <p className="text-red-500 text-xs mt-1">{form_errors.cook_time_minutes}</p>}
            </div>
            <div>
              <label htmlFor="servings" className="block text-sm font-medium text-gray-700">
                Servings <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="servings"
                name="servings"
                value={recipe_form_data.servings}
                onChange={(e) => handle_number_change('servings', e.target.value)}
                min="1"
                className={`mt-1 block w-full rounded-md border ${form_errors.servings ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm p-2.5`}
                required
                aria-invalid={!!form_errors.servings}
              />
              {form_errors.servings && <p className="text-red-500 text-xs mt-1">{form_errors.servings}</p>}
            </div>
          </div>

          {/* --- Difficulty Level --- */}
          <div>
            <label htmlFor="difficulty_level" className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty Level <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-4">
              {['Easy', 'Medium', 'Hard'].map((level) => (
                <div key={level} className="flex items-center">
                  <input
                    type="radio"
                    id={`difficulty_${level.toLowerCase()}`}
                    name="difficulty_level"
                    value={level}
                    checked={recipe_form_data.difficulty_level === level}
                    onChange={(e) => {
                        set_recipe_form_data(prev => ({...prev, difficulty_level: level as any}));
                        set_form_errors(prev => ({ ...prev, difficulty_level: undefined }));
                    }}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                  <label htmlFor={`difficulty_${level.toLowerCase()}`} className="ml-2 block text-sm font-medium text-gray-700">
                    {level}
                  </label>
                </div>
              ))}
            </div>
            {form_errors.difficulty_level && <p className="text-red-500 text-xs mt-1">{form_errors.difficulty_level}</p>}
          </div>

          {/* --- Ingredients --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingredients <span className="text-red-500">*</span>
            </label>
            {recipe_form_data.ingredients.map((ingredient, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-3 items-center">
                <input
                  type="number"
                  placeholder="Qty"
                  value={ingredient.quantity}
                  onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                  min="0"
                  className={`col-span-2 p-2 border rounded-md text-sm ${form_errors.ingredients && (form_errors.ingredients as any)[index]?.quantity ? 'border-red-500' : 'border-gray-300 focus:border-indigo-500'}`}
                />
                <input
                  type="text"
                  placeholder="Unit (e.g., cup, g)"
                  value={ingredient.unit ?? ''}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                  className={`col-span-3 p-2 border rounded-md text-sm ${form_errors.ingredients && (form_errors.ingredients as any)[index]?.unit ? 'border-red-500' : 'border-gray-300 focus:border-indigo-500'}`}
                />
                <input
                  type="text"
                  placeholder="Ingredient Name"
                  value={ingredient.name}
                  onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  className={`col-span-6 p-2 border rounded-md text-sm ${form_errors.ingredients && (form_errors.ingredients as any)[index]?.name ? 'border-red-500' : 'border-gray-300 focus:border-indigo-500'}`}
                />
                {recipe_form_data.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove_ingredient(index)}
                    className="col-span-1 text-red-600 hover:text-red-900 text-lg font-semibold"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            {form_errors.ingredients && typeof form_errors.ingredients === 'string' && (
                <p className="text-red-500 text-xs mt-1">{form_errors.ingredients}</p>
            )}
            <button
              type="button"
              onClick={add_ingredient}
              className="mt-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md text-sm hover:bg-indigo-200"
            >
              + Add Ingredient
            </button>
          </div>

          {/* --- Instructions --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions <span className="text-red-500">*</span>
            </label>
            {recipe_form_data.instructions.map((instruction, index) => (
              <div key={index} className="mb-3 grid grid-cols-12 gap-2 items-start">
                <span className="col-span-1 text-gray-700 font-medium pt-2">{index + 1}.</span>
                <textarea
                  placeholder={`Step ${index + 1} Description`}
                  value={instruction.description}
                  onChange={(e) => handleInstructionChange(index, 'description', e.target.value)}
                  rows={2}
                  className={`col-span-10 p-2 border rounded-md text-sm ${form_errors.instructions && (form_errors.instructions as any)[index]?.description ? 'border-red-500' : 'border-gray-300 focus:border-indigo-500'}`}
                />
                {recipe_form_data.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove_instruction_step(index)}
                    className="col-span-1 text-red-600 hover:text-red-900 text-lg font-semibold pt-2 h-full"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
             {form_errors.instructions && typeof form_errors.instructions === 'string' && (
                <p className="text-red-500 text-xs mt-1">{form_errors.instructions}</p>
            )}
            <button
              type="button"
              onClick={add_instruction_step}
              className="mt-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md text-sm hover:bg-indigo-200"
            >
              + Add Step
            </button>
          </div>

          {/* --- Nutritional Information --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nutritional Information (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              *Estimated values per serving. This data is provided by the user.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="nutri_net_carbs_grams_per_serving" className="block text-xs font-medium text-gray-700 mb-1">
                  Net Carbs (g)
                </label>
                <input
                  type="number"
                  id="nutri_net_carbs_grams_per_serving"
                  name="nutri_net_carbs_grams_per_serving"
                  value={recipe_form_data.nutri_net_carbs_grams_per_serving ?? ''}
                  onChange={(e) => handleNutriChange('nutri_net_carbs_grams_per_serving', e.target.value)}
                  min="0"
                  className={`mt-0 block w-full rounded-md border ${form_errors.nutri_net_carbs_grams_per_serving ? 'border-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm p-2`}
                  aria-invalid={!!form_errors.nutri_net_carbs_grams_per_serving}
                />
                 {form_errors.nutri_net_carbs_grams_per_serving && <p className="text-red-500 text-xs mt-1">{form_errors.nutri_net_carbs_grams_per_serving}</p>}
              </div>
              <div>
                <label htmlFor="nutri_protein_grams_per_serving" className="block text-xs font-medium text-gray-700 mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  id="nutri_protein_grams_per_serving"
                  name="nutri_protein_grams_per_serving"
                  value={recipe_form_data.nutri_protein_grams_per_serving ?? ''}
                  onChange={(e) => handleNutriChange('nutri_protein_grams_per_serving', e.target.value)}
                  min="0"
                  className={`mt-0 block w-full rounded-md border ${form_errors.nutri_protein_grams_per_serving ? 'border-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm p-2`}
                   aria-invalid={!!form_errors.nutri_protein_grams_per_serving}
                />
                {form_errors.nutri_protein_grams_per_serving && <p className="text-red-500 text-xs mt-1">{form_errors.nutri_protein_grams_per_serving}</p>}
              </div>
              <div>
                <label htmlFor="nutri_fat_grams_per_serving" className="block text-xs font-medium text-gray-700 mb-1">
                  Fat (g)
                </label>
                <input
                  type="number"
                  id="nutri_fat_grams_per_serving"
                  name="nutri_fat_grams_per_serving"
                  value={recipe_form_data.nutri_fat_grams_per_serving ?? ''}
                  onChange={(e) => handleNutriChange('nutri_fat_grams_per_serving', e.target.value)}
                  min="0"
                  className={`mt-0 block w-full rounded-md border ${form_errors.nutri_fat_grams_per_serving ? 'border-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm p-2`}
                  aria-invalid={!!form_errors.nutri_fat_grams_per_serving}
                />
                {form_errors.nutri_fat_grams_per_serving && <p className="text-red-500 text-xs mt-1">{form_errors.nutri_fat_grams_per_serving}</p>}
              </div>
            </div>
          </div>

          {/* --- Tags --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {available_tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagChange(tag)}
                  className={`px-3 py-1 rounded-full text-sm border ${recipe_form_data.tags.includes(tag)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {form_errors.tags && <p className="text-red-500 text-xs mt-1">{form_errors.tags}</p>}
          </div>

          {/* --- Notes/Tips --- */}
          <div>
            <label htmlFor="notes_tips" className="block text-sm font-medium text-gray-700">
              Notes/Tips (Optional)
            </label>
            <textarea
              id="notes_tips"
              name="notes_tips"
              value={recipe_form_data.notes_tips ?? ''}
              onChange={handle_change}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm sm:text-sm p-2.5"
            />
          </div>

          {/* --- Submission Buttons --- */}
          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={navigate_back}
              disabled={is_submitting || isLoadingExistingRecipe || mutation.isPending}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={is_submitting || isLoadingExistingRecipe || mutation.isPending}
              className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {is_submitting || mutation.isPending ? 'Submitting...' : (is_editing ? 'Update Recipe' : 'Submit Recipe')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default UV_SubmitRecipe;