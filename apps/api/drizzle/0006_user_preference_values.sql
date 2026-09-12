ALTER TABLE user_preferences
  ADD COLUMN selected_language VARCHAR(2),
  ADD COLUMN selected_theme VARCHAR(10);

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_selected_language_check
    CHECK (selected_language IS NULL OR selected_language IN ('en', 'ru', 'uk')),
  ADD CONSTRAINT user_preferences_selected_theme_check
    CHECK (selected_theme IS NULL OR selected_theme IN ('light', 'dark', 'system'));
