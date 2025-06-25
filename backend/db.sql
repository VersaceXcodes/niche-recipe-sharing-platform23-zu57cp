-- Create users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    profile_picture_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create recipes table
CREATE TABLE recipes (
    recipe_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    cover_photo_url VARCHAR(255) NOT NULL,
    prep_time_minutes INT NOT NULL,
    cook_time_minutes INT NOT NULL,
    servings INT NOT NULL,
    difficulty_level VARCHAR(50) NOT NULL,
    nutri_net_carbs_grams_per_serving NUMERIC(10, 2),
    nutri_protein_grams_per_serving NUMERIC(10, 2),
    nutri_fat_grams_per_serving NUMERIC(10, 2),
    notes_tips TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create ingredients table
CREATE TABLE ingredients (
    ingredient_id SERIAL PRIMARY KEY,
    recipe_id INT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    "order" INT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE
);

-- Create instructions table
CREATE TABLE instructions (
    instruction_id SERIAL PRIMARY KEY,
    recipe_id INT NOT NULL,
    step_number INT NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    UNIQUE (recipe_id, step_number) -- Ensures step numbers are unique per recipe
);

-- Create recipe_tags table
CREATE TABLE recipe_tags (
    recipe_id INT NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (recipe_id, tag_name),
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE
);

-- Create ratings table
CREATE TABLE ratings (
    rating_id SERIAL PRIMARY KEY,
    recipe_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    rated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (recipe_id, user_id)
);

-- Create comments table
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    recipe_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create saved_recipes table
CREATE TABLE saved_recipes (
    saved_recipe_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    UNIQUE (user_id, recipe_id)
);

-- Seed users table
INSERT INTO users (username, email, password_hash, first_name, last_name, profile_picture_url) VALUES
('alex_runner', 'alex.runner@example.com', 'hashed_password_alex', 'Alex', 'Johnson', 'https://picsum.photos/seed/alex_runner/200'),
('sarah_cook', 'sarah.cook@example.com', 'hashed_password_sarah', 'Sarah', 'Miller', 'https://picsum.photos/seed/sarah_cook/200'),
('keto_guru', 'keto.guru@example.com', 'hashed_password_guru', 'Mike', 'Davis', 'https://picsum.photos/seed/keto_guru/200'),
('fit_foodie', 'fit.foodie@example.com', 'hashed_password_fit', 'Jessica', 'White', 'https://picsum.photos/seed/fit_foodie/200'),
('macro_master', 'macro.master@example.com', 'hashed_password_macro', 'Chris', 'Lee', 'https://picsum.photos/seed/macro_master/200');

-- Seed recipes table
INSERT INTO recipes (user_id, title, description, cover_photo_url, prep_time_minutes, cook_time_minutes, servings, difficulty_level, nutri_net_carbs_grams_per_serving, nutri_protein_grams_per_serving, nutri_fat_grams_per_serving, notes_tips) VALUES
(1, 'Keto Chicken Stir-Fry', 'A quick and flavorful keto-friendly chicken stir-fry with plenty of vegetables.', 'https://picsum.photos/seed/keto_chicken_stirfry/600', 15, 20, 4, 'Easy', 8.5, 35.2, 25.1, 'Use broccoli florets and bell peppers for extra color and nutrients.'),
(1, 'Avocado Egg Salad', 'Creamy and satisfying avocado egg salad, perfect for a low-carb lunch.', 'https://picsum.photos/seed/avocado_egg_salad/600', 10, 0, 2, 'Easy', 4.2, 15.5, 28.0, 'Add a pinch of smoked paprika for an extra kick.'),
(2, 'Keto Berry Smoothie', 'A refreshing and nutrient-dense keto smoothie to start your day.', 'https://picsum.photos/seed/keto_berry_smoothie/600', 5, 0, 1, 'Easy', 7.0, 12.1, 18.5, 'Use unsweetened almond milk and ice for a thicker texture.'),
(3, 'Fat Bomb Brownies', 'Indulgent keto brownies that are rich in healthy fats.', 'https://picsum.photos/seed/fat_bomb_brownies/600', 20, 25, 12, 'Medium', 5.5, 7.8, 32.2, 'Ensure your erythritol is finely ground for a smoother texture.'),
(4, 'Grilled Salmon with Asparagus', 'Simple and elegant grilled salmon paired with tender asparagus.', 'https://picsum.photos/seed/grilled_salmon_asparagrus/600', 10, 15, 2, 'Easy', 3.1, 40.0, 30.5, 'Marinate the salmon in lemon juice and herbs for added flavor.'),
(5, 'Cauliflower Mash', 'A low-carb alternative to mashed potatoes.', 'https://picsum.photos/seed/cauliflower_mash/600', 10, 15, 4, 'Easy', 6.2, 4.5, 15.0, 'Add garlic powder and cream cheese for extra richness.'),
(1, 'Keto Pork Belly Bites', 'Crispy, savory keto pork belly bites, perfect as an appetizer or snack.', 'https://picsum.photos/seed/keto_pork_belly_bites/600', 10, 45, 3, 'Medium', 0.5, 20.3, 45.8, 'Score the pork belly skin for maximum crispiness.'),
(2, 'Zucchini Noodles with Pesto', 'A light and healthy pasta alternative with vibrant homemade pesto.', 'https://picsum.photos/seed/zucchini_noodles_pesto/600', 15, 10, 2, 'Easy', 9.8, 10.2, 22.9, 'Spiralize fresh zucchini for the best texture.'),
(3, 'Keto Fat Head Pizza', 'A delicious and customizable keto-friendly pizza with a cheese-based crust.', 'https://picsum.photos/seed/keto_fat_head_pizza/600', 25, 15, 1, 'Medium', 7.5, 18.0, 35.0, 'Experiment with different toppings like mushrooms, olives, and bell peppers.'),
(4, 'Bulletproof Coffee', 'The classic high-fat coffee for energy and focus.', 'https://picsum.photos/seed/bulletproof_coffee/600', 5, 0, 1, 'Easy', 0.2, 1.5, 20.0, 'Use grass-fed butter and MCT oil for optimal results.');

-- Seed ingredients table
INSERT INTO ingredients (recipe_id, quantity, unit, name, "order") VALUES
(1, 500, 'g', 'Chicken Breast', 1),
(1, 2, 'cups', 'Broccoli Florets', 2),
(1, 1, 'cup', 'Bell Pepper, sliced', 3),
(1, 3, 'tbsp', 'Soy Sauce (or Tamari)', 4),
(1, 1, 'tbsp', 'Sesame Oil', 5),
(1, 2, 'cloves', 'Garlic, minced', 6),

(2, 6, 'large', 'Eggs', 1),
(2, 1, 'ripe', 'Avocado', 2),
(2, 2, 'tbsp', 'Mayonnaise', 3),
(2, 1, 'tsp', 'Lemon Juice', 4),
(2, 'to taste', '', 'Salt & Pepper', 5),

(3, 1, 'cup', 'Mixed Berries (frozen)', 1),
(3, 1.5, 'cups', 'Unsweetened Almond Milk', 2),
(3, 1, 'scoop', 'Keto Protein Powder', 3),
(3, 1, 'tbsp', 'Chia Seeds', 4),
(3, 1, 'tbsp', 'MCT Oil', 5),

(4, 1, 'cup', 'Almond Flour', 1),
(4, 0.5, 'cup', 'Cocoa Powder', 2),
(4, 0.5, 'cup', 'Erythritol', 3),
(4, 0.25, 'cup', 'Butter, melted', 4),
(4, 1, 'large', 'Egg', 5),
(4, 1, 'tsp', 'Vanilla Extract', 6),

(5, 1, 'lb', 'Salmon Fillet', 1),
(5, 1, 'bunch', 'Asparagus', 2),
(5, 2, 'tbsp', 'Olive Oil', 3),
(5, 'to taste', '', 'Salt & Pepper', 4),
(5, 1, '', 'Lemon Wedge', 5),

(6, 1, 'head', 'Cauliflower, florets', 1),
(6, 0.25, 'cup', 'Heavy Cream', 2),
(6, 2, 'tbsp', 'Butter', 3),
(6, 'to taste', '', 'Salt & Pepper', 4),

(7, 500, 'g', 'Pork Belly', 1),
(7, 1, 'tsp', 'Garlic Powder', 2),
(7, 1, 'tsp', 'Onion Powder', 3),
(7, 0.5, 'tsp', 'Paprika', 4),
(7, 'to taste', '', 'Salt & Pepper', 5),

(8, 2, '', 'Large Zucchini', 1),
(8, 1, 'cup', 'Fresh Basil', 2),
(8, 0.5, 'cup', 'Pine Nuts', 3),
(8, 0.5, 'cup', 'Parmesan Cheese, grated', 4),
(8, 3, 'cloves', 'Garlic', 5),
(8, 0.5, 'cup', 'Olive Oil', 6),

(9, 1.5, 'cups', 'Mozzarella Cheese, shredded', 1),
(9, 0.75, 'cup', 'Almond Flour', 2),
(9, 2, 'tbsp', 'Cream Cheese', 3),
(9, 1, 'large', 'Egg', 4),
(9, 0.5, 'cup', 'Pizza Sauce', 5),
(9, 1, 'cup', 'Toppings of choice', 6),

(10, 1, 'cup', 'Hot Coffee', 1),
(10, 1, 'tbsp', 'Grass-fed Butter', 2),
(10, 1, 'tbsp', 'MCT Oil', 3);

-- Seed instructions table
INSERT INTO instructions (recipe_id, step_number, description) VALUES
(1, 1, 'Heat sesame oil in a wok or large skillet over medium-high heat.'),
(1, 2, 'Add minced garlic and stir-fry for 30 seconds until fragrant.'),
(1, 3, 'Add chicken breast and cook until browned and cooked through.'),
(1, 4, 'Add broccoli florets and bell pepper slices. Stir-fry for 5-7 minutes until vegetables are tender-crisp.'),
(1, 5, 'Pour in soy sauce (or tamari) and toss to combine. Cook for another minute.'),
(1, 6, 'Serve hot.'),

(2, 1, 'Boil or mash hard-boiled eggs.'),
(2, 2, 'Mash avocado in a bowl with lemon juice, salt, and pepper.'),
(2, 3, 'Add chopped hard-boiled eggs and mayonnaise to the mashed avocado.'),
(2, 4, 'Mix gently until well combined. Adjust seasoning if needed.'),
(2, 5, 'Serve chilled on lettuce wraps or with keto crackers.'),

(3, 1, 'Combine all ingredients in a blender.'),
(3, 2, 'Blend until smooth and creamy.'),
(3, 3, 'Pour into a glass and enjoy immediately.'),

(4, 1, 'Preheat oven to 350°F (175°C). Grease and flour a baking pan.'),
(4, 2, 'In a bowl, combine almond flour, cocoa powder, and erythritol.'),
(4, 3, 'Add melted butter, egg, and vanilla extract. Mix until a dough forms.'),
(4, 4, 'Press the dough into the prepared baking pan.'),
(4, 5, 'Bake for 20-25 minutes, or until a toothpick inserted into the center comes out clean.'),
(4, 6, 'Let cool completely before cutting.'),

(5, 1, 'Preheat grill to medium-high heat.'),
(5, 2, 'Toss asparagus with olive oil, salt, and pepper.'),
(5, 3, 'Season salmon fillet with salt and pepper. Drizzle with olive oil.'),
(5, 4, 'Grill salmon for 4-6 minutes per side, depending on thickness, until cooked through.'),
(5, 5, 'Grill asparagus for 5-7 minutes, turning occasionally, until tender-crisp.'),
(5, 6, 'Serve grilled salmon with asparagus and a lemon wedge.'),

(6, 1, 'Steam or boil cauliflower florets until very tender.'),
(6, 2, 'Drain cauliflower thoroughly and transfer to a food processor or bowl.'),
(6, 3, 'Add heavy cream, butter, salt, and pepper.'),
(6, 4, 'Mash or process until smooth and creamy. Add more cream if a thinner consistency is desired.'),

(7, 1, 'Preheat oven to 375°F (190°C).'),
(7, 2, 'Cut pork belly into bite-sized cubes. Mix with garlic powder, onion powder, paprika, salt, and pepper.'),
(7, 3, 'Arrange pork belly cubes in a single layer on a baking sheet.'),
(7, 4, 'Roast for 40-45 minutes, or until golden brown and crispy, flipping halfway through.'),

(8, 1, 'Spiralize or julienne the zucchini into noodles.'),
(8, 2, 'In a food processor, combine basil, pine nuts, parmesan cheese, garlic, and olive oil. Blend until smooth.'),
(8, 3, 'Heat a pan and lightly sauté the zucchini noodles for 2-3 minutes until slightly tender.'),
(8, 4, 'Toss zucchini noodles with the pesto sauce.'),
(8, 5, 'Serve immediately.'),

(9, 1, 'Preheat oven to 400°F (200°C).'),
(9, 2, 'In a bowl, combine shredded mozzarella, almond flour, cream cheese, and egg. Mix until a dough forms.'),
(9, 3, 'Press the dough onto a parchment-lined baking sheet to form a pizza crust.'),
(9, 4, 'Bake the crust for 8-10 minutes until golden brown.'),
(9, 5, 'Remove from oven, spread with pizza sauce, and add toppings.'),
(9, 6, 'Bake for another 5-7 minutes until toppings are heated through and cheese is melted.'),

(10, 1, 'Brew your favorite coffee.'),
(10, 2, 'Pour hot coffee into a blender.'),
(10, 3, 'Add grass-fed butter and MCT oil.'),
(10, 4, 'Blend on high speed for 20-30 seconds until frothy and emulsified.'),
(10, 5, 'Serve immediately.');

-- Seed recipe_tags table
INSERT INTO recipe_tags (recipe_id, tag_name) VALUES
(1, 'Low Carb'),
(1, 'High Protein'),
(1, 'Quick Meal'),
(2, 'Low Carb'),
(2, 'Healthy Fats'),
(2, 'Lunch'),
(3, 'Low Carb'),
(3, 'Keto'),
(3, 'Smoothie'),
(3, 'Breakfast'),
(4, 'Low Carb'),
(4, 'Keto Dessert'),
(4, 'Baking'),
(5, 'Low Carb'),
(5, 'Healthy Fats'),
(5, 'Quick Meal'),
(6, 'Low Carb'),
(6, 'Side Dish'),
(6, 'Vegetarian'),
(7, 'Low Carb'),
(7, 'Appetizer'),
(7, 'Pork'),
(8, 'Low Carb'),
(8, 'Vegetarian'),
(8, 'Pasta Alternative'),
(9, 'Low Carb'),
(9, 'Keto Pizza'),
(9, 'Family Friendly'),
(10, 'Keto'),
(10, 'Breakfast'),
(10, 'Energy Boost');

-- Seed ratings table
INSERT INTO ratings (recipe_id, user_id, rating) VALUES
(1, 1, 5),
(1, 2, 4),
(2, 1, 5),
(2, 3, 4),
(3, 2, 5),
(3, 4, 4),
(4, 3, 5),
(4, 1, 4),
(5, 4, 5),
(5, 2, 5),
(6, 5, 4),
(6, 1, 3),
(7, 1, 5),
(7, 3, 4),
(8, 2, 5),
(8, 4, 4),
(9, 3, 5),
(9, 5, 4),
(10, 4, 5),
(10, 1, 5);

-- Seed comments table
INSERT INTO comments (recipe_id, user_id, comment_text) VALUES
(1, 2, 'This was so easy and delicious! Perfect for my weeknight dinners.'),
(1, 5, 'Great recipe, the chicken was perfectly cooked.'),
(2, 3, 'My new favorite lunch! So creamy and satisfying.'),
(3, 4, 'Loved this! Added a bit of spinach and it was still delicious.'),
(4, 1, 'These brownies are dangerously good!'),
(5, 2, 'Simple, clean flavors. The asparagus was grilled to perfection.'),
(7, 3, 'Super crispy and full of flavor! My guests loved them.'),
(8, 4, 'A fantastic light and healthy meal. Pesto was amazing!'),
(9, 5, 'The crust was surprisingly good! Will definitely make this again.'),
(10, 1, 'My go-to morning drink for sustained energy.');

-- Seed saved_recipes table
INSERT INTO saved_recipes (user_id, recipe_id) VALUES
(1, 1),
(1, 4),
(2, 3),
(2, 8),
(3, 1),
(3, 5),
(4, 2),
(4, 7),
(5, 3),
(5, 9);