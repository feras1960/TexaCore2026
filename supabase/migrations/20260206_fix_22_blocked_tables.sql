-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: 22 Blocked Tables (RLS enabled but NO policies)
-- إصلاح 22 جدول محظور
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. agent_commission_rules
CREATE POLICY "agent_commission_rules_read" ON agent_commission_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "agent_commission_rules_write" ON agent_commission_rules FOR ALL USING (auth.uid() IS NOT NULL);

-- 2. bin_locations
CREATE POLICY "bin_locations_read" ON bin_locations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bin_locations_write" ON bin_locations FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. commission_entries
CREATE POLICY "commission_entries_read" ON commission_entries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "commission_entries_write" ON commission_entries FOR ALL USING (auth.uid() IS NOT NULL);

-- 4. commission_rules
CREATE POLICY "commission_rules_read" ON commission_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "commission_rules_write" ON commission_rules FOR ALL USING (auth.uid() IS NOT NULL);

-- 5. container_quotation_items
CREATE POLICY "container_quotation_items_read" ON container_quotation_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "container_quotation_items_write" ON container_quotation_items FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. container_quotations
CREATE POLICY "container_quotations_read" ON container_quotations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "container_quotations_write" ON container_quotations FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. container_reservations
CREATE POLICY "container_reservations_read" ON container_reservations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "container_reservations_write" ON container_reservations FOR ALL USING (auth.uid() IS NOT NULL);

-- 8. correspondents
CREATE POLICY "correspondents_read" ON correspondents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "correspondents_write" ON correspondents FOR ALL USING (auth.uid() IS NOT NULL);

-- 9. gold_items
CREATE POLICY "gold_items_read" ON gold_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "gold_items_write" ON gold_items FOR ALL USING (auth.uid() IS NOT NULL);

-- 10. gold_prices
CREATE POLICY "gold_prices_read" ON gold_prices FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "gold_prices_write" ON gold_prices FOR ALL USING (auth.uid() IS NOT NULL);

-- 11. incentive_plan_tiers
CREATE POLICY "incentive_plan_tiers_read" ON incentive_plan_tiers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "incentive_plan_tiers_write" ON incentive_plan_tiers FOR ALL USING (auth.uid() IS NOT NULL);

-- 12. incentive_plans
CREATE POLICY "incentive_plans_read" ON incentive_plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "incentive_plans_write" ON incentive_plans FOR ALL USING (auth.uid() IS NOT NULL);

-- 13. product_categories
CREATE POLICY "product_categories_read" ON product_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "product_categories_write" ON product_categories FOR ALL USING (auth.uid() IS NOT NULL);

-- 14. remittances
CREATE POLICY "remittances_read" ON remittances FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "remittances_write" ON remittances FOR ALL USING (auth.uid() IS NOT NULL);

-- 15. retail_cuttings
CREATE POLICY "retail_cuttings_read" ON retail_cuttings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "retail_cuttings_write" ON retail_cuttings FOR ALL USING (auth.uid() IS NOT NULL);

-- 16. saas_events
CREATE POLICY "saas_events_read" ON saas_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "saas_events_write" ON saas_events FOR ALL USING (auth.uid() IS NOT NULL);

-- 17. sample_cutting_items
CREATE POLICY "sample_cutting_items_read" ON sample_cutting_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sample_cutting_items_write" ON sample_cutting_items FOR ALL USING (auth.uid() IS NOT NULL);

-- 18. sample_cuttings
CREATE POLICY "sample_cuttings_read" ON sample_cuttings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sample_cuttings_write" ON sample_cuttings FOR ALL USING (auth.uid() IS NOT NULL);

-- 19. serial_number_fields
CREATE POLICY "serial_number_fields_read" ON serial_number_fields FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "serial_number_fields_write" ON serial_number_fields FOR ALL USING (auth.uid() IS NOT NULL);

-- 20. serial_numbers
CREATE POLICY "serial_numbers_read" ON serial_numbers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "serial_numbers_write" ON serial_numbers FOR ALL USING (auth.uid() IS NOT NULL);

-- 21. target_achievement_log
CREATE POLICY "target_achievement_log_read" ON target_achievement_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "target_achievement_log_write" ON target_achievement_log FOR ALL USING (auth.uid() IS NOT NULL);

-- 22. vendor_categories
CREATE POLICY "vendor_categories_read" ON vendor_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "vendor_categories_write" ON vendor_categories FOR ALL USING (auth.uid() IS NOT NULL);

-- Reload schema
NOTIFY pgrst, 'reload schema';

SELECT '✅ All 22 blocked tables are now fixed!' as status;
