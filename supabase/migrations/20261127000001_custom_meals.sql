-- Migration 4: custom meals (e.g. "Przed treningiem").
-- Meal ids are defined in settings ('meals'); entries may use any safe id, not only the 6 defaults.
alter table public.entries drop constraint entries_meal_check;
alter table public.entries add constraint entries_meal_check check (meal ~ '^[a-z0-9_]{1,40}$');
