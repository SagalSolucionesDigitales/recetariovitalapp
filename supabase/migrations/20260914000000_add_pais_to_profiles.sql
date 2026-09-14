-- Multi-country support: the app expands beyond Mexico into other
-- Spanish-speaking Latam markets and Spain. Meal plans and Camila's coaching
-- now adapt local ingredient names/vocabulary based on this field.
ALTER TABLE public.profiles ADD COLUMN pais text;
