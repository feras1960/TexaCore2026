# NexaCore Project Constitution

## 1. UI Components Standards
### 1.1 Data Tables
- **Standard Component**: All data lists (e.g., Warehouse List, Accounts List) MUST use the `NexaTable` component.
- **Card Views**: The use of Grid/Card views for main entity lists is **DEPRECATED**.
- **Features**: Tables must support:
  - Sorting
  - Pagination (if data is large)
  - Filtering (Search + Dropdown filters)
  - RTL Support (columns alignment)
- **Actions**: Row actions (Edit/Delete) should be placed in a dropdown menu in the last column.

### 1.2 RTL Support
- All components must natively support Right-to-Left (RTL) layouts.
- Use `text-start`, `text-end` instead of `text-left`, `text-right`.
- Use logical properties (`ms-`, `me-`, `ps-`, `pe-`) for margins and paddings.

## 2. Warehouse Module Specifics
- **Warehouse List**: Display as a `NexaTable` with columns: Code, Name, Type, City, Capacity, Status, Actions.
- **Filters**: Must include City and Type filters alongside Search.
- **Location**: Add button should be placed opposite to the Tabs list.

## 3. Error Handling
- **Missing Tables**: If a table is missing (during migration phase), the UI should handle it gracefully (e.g., return empty array) rather than crashing or showing 404 errors constantly.
- **Validation**: Forms must show user-friendly validation errors translated to the current language.

## 4. Code Structure
- **Imports**: Avoid barrel files if they cause circular dependencies.
- **Types**: Define interfaces for all data structures.
- **State**: Use `useState` and `useMemo` for local state and derived data.
