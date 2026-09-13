ALTER TABLE user_preferences
  DROP CONSTRAINT user_preferences_selected_language_check;

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_selected_language_check
    CHECK (selected_language IS NULL OR selected_language IN ('en', 'ru', 'uk', 'he'));
