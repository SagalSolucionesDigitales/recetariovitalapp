
CREATE POLICY "own profile delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own checkin delete" ON public.check_ins FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own sub delete" ON public.subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own conv update" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own conv delete" ON public.conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);
