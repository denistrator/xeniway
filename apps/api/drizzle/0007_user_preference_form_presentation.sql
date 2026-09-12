ALTER TABLE user_preferences
  ADD COLUMN selected_form_presentation varchar(10);

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_selected_form_presentation_check
  CHECK (selected_form_presentation IS NULL OR selected_form_presentation IN ('drawer', 'modal'));
