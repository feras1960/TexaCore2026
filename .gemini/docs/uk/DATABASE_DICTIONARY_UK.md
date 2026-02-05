# 📚 Словник даних - Database Dictionary
# TexaCore ERP Повний довідник схеми

**Дата оновлення**: 3 лютого 2026  
**Загальна кількість таблиць**: 172 таблиці

---

## 📋 Зміст

1. [Бухгалтерія (23 таблиці)](#1-бухгалтерія)
2. [Склад (27 таблиць)](#2-склад)
3. [Продажі (19 таблиць)](#3-продажі)
4. [Закупівлі (6 таблиць)](#4-закупівлі)
5. [Агенти (12 таблиць)](#5-агенти)
6. [Multi-Tenant (16 таблиць)](#6-multi-tenant)
7. [SaaS Platform (24 таблиці)](#7-saas-platform)
8. [Інші таблиці](#8-інші-таблиці)

---

## 1. Бухгалтерія

### 1.1 chart_of_accounts (План рахунків)

**Опис**: Ієрархічна структура всіх бухгалтерських рахунків.

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `account_code` | VARCHAR(20) | NO | Код рахунку (унікальний) |
| `account_name` | VARCHAR(255) | NO | Назва рахунку (EN) |
| `name_ar` | VARCHAR(255) | YES | Назва рахунку (AR) |
| `account_type` | VARCHAR(50) | NO | Тип рахунку |
| `parent_id` | UUID | YES | FK → chart_of_accounts |
| `level` | INTEGER | YES | Рівень глибини |
| `is_active` | BOOLEAN | YES | Активний? |
| `is_system` | BOOLEAN | YES | Системний рахунок? |
| `currency_code` | VARCHAR(10) | YES | Валюта |
| `notes` | TEXT | YES | Примітки |
| `created_at` | TIMESTAMPTZ | YES | Дата створення |
| `updated_at` | TIMESTAMPTZ | YES | Дата оновлення |

**Індекси**:
- `PRIMARY KEY (id)`
- `UNIQUE (tenant_id, company_id, account_code)`
- `INDEX (parent_id)`
- `INDEX (account_type)`

---

### 1.2 journal_entries (Бухгалтерські записи)

**Опис**: Журнал бухгалтерських записів.

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `entry_number` | VARCHAR(50) | NO | Номер запису (унікальний) |
| `entry_date` | DATE | NO | Дата запису |
| `description` | TEXT | YES | Опис |
| `status` | VARCHAR(20) | YES | Статус |
| `reference_type` | VARCHAR(50) | YES | Тип посилання |
| `reference_id` | UUID | YES | ID посилання |
| `total_debit` | DECIMAL(18,2) | YES | Загальний дебет |
| `total_credit` | DECIMAL(18,2) | YES | Загальний кредит |
| `created_by` | UUID | YES | Створив |
| `posted_by` | UUID | YES | Провів |
| `posted_at` | TIMESTAMPTZ | YES | Дата проведення |

**Статуси**: `draft`, `posted`, `reversed`

---

### 1.3 journal_entry_lines (Рядки записів)

**Опис**: Деталі кожного бухгалтерського запису.

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `journal_entry_id` | UUID | NO | FK → journal_entries |
| `account_id` | UUID | NO | FK → chart_of_accounts |
| `debit` | DECIMAL(18,2) | YES | Сума дебету |
| `credit` | DECIMAL(18,2) | YES | Сума кредиту |
| `description` | TEXT | YES | Опис рядка |
| `cost_center_id` | UUID | YES | FK → cost_centers |

---

## 2. Склад

### 2.1 warehouses (Склади)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(20) | NO | Код |
| `name` | VARCHAR(255) | NO | Назва (EN) |
| `name_ar` | VARCHAR(255) | YES | Назва (AR) |
| `address` | TEXT | YES | Адреса |
| `warehouse_type` | VARCHAR(20) | YES | Тип |
| `is_active` | BOOLEAN | YES | Активний? |

**Типи складів**: `main`, `branch`, `store`, `van`

---

### 2.2 bin_locations (Місця зберігання)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `warehouse_id` | UUID | NO | FK → warehouses |
| `code` | VARCHAR(50) | NO | Код (A-01-03-05) |
| `aisle` | VARCHAR(10) | YES | Прохід |
| `rack` | VARCHAR(10) | YES | Стелаж |
| `shelf` | VARCHAR(10) | YES | Полиця |
| `bin` | VARCHAR(10) | YES | Комірка |
| `is_active` | BOOLEAN | YES | Активний? |

---

### 2.3 fabric_materials (Матеріали)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(50) | NO | Код |
| `name` | VARCHAR(255) | NO | Назва (EN) |
| `name_ar` | VARCHAR(255) | YES | Назва (AR) |
| `group_id` | UUID | YES | FK → fabric_groups |
| `description` | TEXT | YES | Опис |
| `unit_cost` | DECIMAL(18,4) | YES | Собівартість |
| `sale_price` | DECIMAL(18,4) | YES | Ціна продажу |
| `is_active` | BOOLEAN | YES | Активний? |

---

### 2.4 fabric_rolls (Рулони тканини)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `roll_number` | VARCHAR(50) | NO | Номер рулону (унікальний) |
| `material_id` | UUID | NO | FK → fabric_materials |
| `warehouse_id` | UUID | YES | FK → warehouses |
| `location_id` | UUID | YES | FK → bin_locations |
| `color_id` | UUID | YES | FK → fabric_colors |
| `dye_lot` | VARCHAR(50) | YES | Партія фарбування |
| `batch_id` | UUID | YES | FK → batches |
| `initial_length` | DECIMAL(15,3) | NO | Початкова довжина |
| `current_length` | DECIMAL(15,3) | NO | Поточна довжина |
| `reserved_length` | DECIMAL(15,3) | YES | Зарезервовано |
| `width` | DECIMAL(10,2) | YES | Ширина |
| `weight` | DECIMAL(10,2) | YES | Вага |
| `quality_grade` | VARCHAR(10) | YES | Клас якості |
| `status` | VARCHAR(20) | YES | Статус |
| `unit_cost` | DECIMAL(18,4) | YES | Собівартість одиниці |
| `received_date` | DATE | YES | Дата отримання |
| `container_item_id` | UUID | YES | FK → container_items |

**Статуси**: `available`, `reserved`, `on_hold`, `sold`, `damaged`
**Класи якості**: `A`, `B`, `C`

---

### 2.5 containers (Контейнери)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `container_number` | VARCHAR(50) | NO | Номер контейнера |
| `supplier_id` | UUID | YES | FK → suppliers |
| `order_date` | DATE | YES | Дата замовлення |
| `expected_arrival` | DATE | YES | Очікуване прибуття |
| `actual_arrival` | DATE | YES | Фактичне прибуття |
| `status` | VARCHAR(30) | YES | Статус |
| `total_value` | DECIMAL(18,2) | YES | Загальна вартість |
| `currency_code` | VARCHAR(10) | YES | Валюта |
| `total_rolls` | INTEGER | YES | Кількість рулонів |
| `total_quantity` | DECIMAL(15,2) | YES | Загальна кількість |

**Статуси**: `ordered`, `shipped`, `in_transit`, `arrived`, `receiving`, `completed`, `cancelled`

---

### 2.6 reservations (Резервування)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `reservation_number` | VARCHAR(50) | NO | Номер резервування |
| `customer_id` | UUID | NO | FK → customers |
| `reservation_date` | DATE | NO | Дата резервування |
| `expiry_date` | DATE | YES | Дата закінчення |
| `status` | VARCHAR(20) | YES | Статус |
| `deposit_amount` | DECIMAL(18,2) | YES | Сума завдатку |
| `notes` | TEXT | YES | Примітки |

**Статуси**: `active`, `fulfilled`, `expired`, `cancelled`

---

### 2.7 stock_counts (Інвентаризація)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `count_number` | VARCHAR(50) | NO | Номер інвентаризації |
| `warehouse_id` | UUID | NO | FK → warehouses |
| `location_id` | UUID | YES | FK → bin_locations |
| `count_date` | DATE | NO | Дата інвентаризації |
| `count_type` | VARCHAR(30) | YES | Тип інвентаризації |
| `status` | VARCHAR(20) | YES | Статус |
| `total_items` | INTEGER | YES | Всього позицій |
| `counted_items` | INTEGER | YES | Підраховано |
| `variance_count` | INTEGER | YES | Кількість розбіжностей |

**Типи інвентаризації**: `full`, `partial`, `cycle`, `random`, `by_material`
**Статуси**: `planned`, `in_progress`, `completed`, `cancelled`

---

## 3. Продажі

### 3.1 customers (Клієнти)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(50) | NO | Код клієнта |
| `name` | VARCHAR(255) | NO | Ім'я (EN) |
| `name_ar` | VARCHAR(255) | YES | Ім'я (AR) |
| `email` | VARCHAR(255) | YES | Email |
| `phone` | VARCHAR(50) | YES | Телефон |
| `address` | TEXT | YES | Адреса |
| `customer_type` | VARCHAR(30) | YES | Тип |
| `credit_limit` | DECIMAL(18,2) | YES | Кредитний ліміт |
| `balance` | DECIMAL(18,2) | YES | Баланс |
| `price_list_id` | UUID | YES | FK → price_lists |
| `group_id` | UUID | YES | FK → customer_groups |
| `is_active` | BOOLEAN | YES | Активний? |

---

### 3.2 sales_invoices (Рахунки-фактури продажу)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `invoice_number` | VARCHAR(50) | NO | Номер рахунку |
| `customer_id` | UUID | NO | FK → customers |
| `invoice_date` | DATE | NO | Дата |
| `due_date` | DATE | YES | Термін оплати |
| `subtotal` | DECIMAL(18,2) | YES | Проміжний підсумок |
| `discount_amount` | DECIMAL(18,2) | YES | Знижка |
| `tax_amount` | DECIMAL(18,2) | YES | Податок |
| `total_amount` | DECIMAL(18,2) | YES | Загальна сума |
| `paid_amount` | DECIMAL(18,2) | YES | Сплачено |
| `status` | VARCHAR(20) | YES | Статус |
| `agent_id` | UUID | YES | FK → agents |
| `warehouse_id` | UUID | YES | FK → warehouses |

**Статуси**: `draft`, `posted`, `partial`, `paid`, `cancelled`

---

## 4. Закупівлі

### 4.1 suppliers (Постачальники)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `code` | VARCHAR(50) | NO | Код |
| `name` | VARCHAR(255) | NO | Назва (EN) |
| `name_ar` | VARCHAR(255) | YES | Назва (AR) |
| `email` | VARCHAR(255) | YES | Email |
| `phone` | VARCHAR(50) | YES | Телефон |
| `country` | VARCHAR(100) | YES | Країна |
| `balance` | DECIMAL(18,2) | YES | Баланс |
| `is_active` | BOOLEAN | YES | Активний? |

---

### 4.2 purchase_invoices (Рахунки-фактури закупівлі)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `company_id` | UUID | NO | FK → companies |
| `invoice_number` | VARCHAR(50) | NO | Номер рахунку |
| `supplier_id` | UUID | NO | FK → suppliers |
| `invoice_date` | DATE | NO | Дата |
| `container_id` | UUID | YES | FK → containers |
| `subtotal` | DECIMAL(18,2) | YES | Проміжний підсумок |
| `tax_amount` | DECIMAL(18,2) | YES | Податок |
| `total_amount` | DECIMAL(18,2) | YES | Загальна сума |
| `paid_amount` | DECIMAL(18,2) | YES | Сплачено |
| `status` | VARCHAR(20) | YES | Статус |

---

## 5. Агенти

### 5.1 agents (Агенти)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `code` | VARCHAR(50) | NO | Код |
| `name` | VARCHAR(255) | NO | Ім'я (EN) |
| `name_ar` | VARCHAR(255) | YES | Ім'я (AR) |
| `email` | VARCHAR(255) | YES | Email |
| `phone` | VARCHAR(50) | YES | Телефон |
| `commission_rate` | DECIMAL(5,2) | YES | Ставка комісії |
| `tier_id` | UUID | YES | FK → agent_tiers |
| `available_balance` | DECIMAL(18,2) | YES | Доступний баланс |
| `is_active` | BOOLEAN | YES | Активний? |

---

## 6. Multi-Tenant

### 6.1 tenants (Орендарі)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `code` | VARCHAR(50) | NO | Код (унікальний) |
| `name` | VARCHAR(255) | NO | Назва |
| `email` | VARCHAR(255) | YES | Email |
| `phone` | VARCHAR(50) | YES | Телефон |
| `status` | VARCHAR(20) | YES | Статус |
| `subscription_plan_id` | UUID | YES | FK → subscription_plans |
| `trial_ends_at` | TIMESTAMPTZ | YES | Закінчення пробного періоду |

---

### 6.2 companies (Компанії)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | NO | FK → tenants |
| `code` | VARCHAR(50) | NO | Код |
| `name` | VARCHAR(255) | NO | Назва (EN) |
| `name_ar` | VARCHAR(255) | YES | Назва (AR) |
| `commercial_registration` | VARCHAR(100) | YES | Комерційна реєстрація |
| `tax_number` | VARCHAR(100) | YES | Податковий номер |
| `is_default` | BOOLEAN | YES | За замовчуванням? |
| `is_active` | BOOLEAN | YES | Активний? |

---

### 6.3 user_profiles (Профілі користувачів)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `tenant_id` | UUID | YES | FK → tenants |
| `email` | VARCHAR(255) | YES | Email |
| `full_name` | VARCHAR(255) | YES | Повне ім'я |
| `preferred_language` | VARCHAR(10) | YES | Бажана мова |
| `is_active` | BOOLEAN | YES | Активний? |

---

## 7. SaaS Platform

### 7.1 subscription_plans (Плани підписки)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `code` | VARCHAR(50) | NO | Код |
| `name` | VARCHAR(255) | NO | Назва (EN) |
| `name_ar` | VARCHAR(255) | YES | Назва (AR) |
| `monthly_price` | DECIMAL(18,2) | YES | Місячна ціна |
| `yearly_price` | DECIMAL(18,2) | YES | Річна ціна |
| `max_users` | INTEGER | YES | Макс. користувачів |
| `max_companies` | INTEGER | YES | Макс. компаній |
| `is_active` | BOOLEAN | YES | Активний? |

---

### 7.2 modules (Модулі)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `code` | VARCHAR(50) | NO | Код |
| `name` | VARCHAR(255) | NO | Назва (EN) |
| `name_ar` | VARCHAR(255) | YES | Назва (AR) |
| `description` | TEXT | YES | Опис |
| `icon` | VARCHAR(100) | YES | Іконка |
| `display_order` | INTEGER | YES | Порядок відображення |
| `is_active` | BOOLEAN | YES | Активний? |

---

## 8. Інші таблиці

### 8.1 currencies (Валюти)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `code` | VARCHAR(10) | NO | Код (USD, EUR) |
| `name` | VARCHAR(100) | NO | Назва |
| `symbol` | VARCHAR(10) | YES | Символ |
| `decimal_places` | INTEGER | YES | Десяткові знаки |

---

### 8.2 uom (Одиниці виміру)

| Колонка | Тип | Null | Опис |
|---------|-----|------|------|
| `id` | UUID | NO | Первинний ключ |
| `code` | VARCHAR(20) | NO | Код |
| `name` | VARCHAR(100) | NO | Назва (EN) |
| `name_ar` | VARCHAR(100) | YES | Назва (AR) |
| `category` | VARCHAR(50) | YES | Категорія |

---

## 📊 Підсумок таблиць

| Розділ | Кількість таблиць | Основні таблиці |
|--------|-------------------|-----------------|
| Бухгалтерія | 23 | chart_of_accounts, journal_entries |
| Склад | 27 | warehouses, fabric_rolls, containers |
| Продажі | 19 | customers, sales_invoices |
| Закупівлі | 6 | suppliers, purchase_invoices |
| Агенти | 12 | agents, agent_commissions |
| Multi-Tenant | 16 | tenants, companies, user_profiles |
| SaaS | 24 | subscription_plans, modules |
| Інші | 45 | currencies, countries, uom |
| **Всього** | **172** | - |

---

**© 2026 TexaCore ERP**
