export interface SqlExample {
  title: string;
  description: string;
  sql: string;
}

export const SQL_EXAMPLES: SqlExample[] = [
  {
    title: 'Simple SELECT',
    description: 'Fetch the first 10 rows of the sales table.',
    sql: 'SELECT * FROM sales LIMIT 10;',
  },
  {
    title: 'Aggregations & GROUP BY',
    description: 'Calculate total sales, average sales, and profit per Category and Country.',
    sql: `SELECT 
  Category, 
  Country, 
  ROUND(SUM(Sales), 2) as Total_Sales,
  ROUND(AVG(Sales), 2) as Avg_Sales,
  ROUND(SUM(Profit), 2) as Total_Profit,
  COUNT(*) as Order_Count
FROM sales 
GROUP BY Category, Country
ORDER BY Total_Sales DESC;`,
  },
  {
    title: 'JOIN Tables',
    description: 'Join the events and users tables to see user events with user details.',
    sql: `SELECT 
  e."Event ID",
  e.Timestamp,
  e."Event Type",
  e.Page,
  e.Device,
  u.Name,
  u.Email,
  u.Age,
  u.Country
FROM events e
INNER JOIN users u ON e."User ID" = u."User ID"
LIMIT 50;`,
  },
  {
    title: 'Window Functions',
    description: 'Calculate a running sales total and cumulative sale percentage for each Category.',
    sql: `SELECT 
  "Order ID",
  "Order Date",
  Category,
  Sales,
  ROUND(SUM(Sales) OVER(PARTITION BY Category ORDER BY "Order Date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) as Running_Total,
  ROUND(Sales / SUM(Sales) OVER(PARTITION BY Category) * 100, 2) as Sales_Pct_Of_Category
FROM sales
ORDER BY Category, "Order Date"
LIMIT 50;`,
  },
  {
    title: 'Date Functions',
    description: 'Group orders by year/month and calculate trends.',
    sql: `SELECT 
  DATE_TRUNC('month', "Order Date") as Month,
  COUNT(*) as Orders,
  ROUND(SUM(Sales), 2) as Total_Sales,
  ROUND(SUM(Profit), 2) as Total_Profit
FROM sales
GROUP BY Month
ORDER BY Month DESC;`,
  },
  {
    title: 'Recursive CTE',
    description: 'Generate an employee hierarchical tree or recursive number list.',
    sql: `WITH RECURSIVE employee_hierarchy AS (
  -- Anchor member
  SELECT 1 as id, 'Alice (CEO)' as name, NULL as manager_id, 0 as level
  UNION ALL
  -- Recursive member
  SELECT 
    eh.id + 1, 
    CASE eh.id + 1
      WHEN 2 THEN 'Bob (CTO)'
      WHEN 3 THEN 'Charlie (VP of Sales)'
      WHEN 4 THEN 'David (Engineering Lead)'
      WHEN 5 THEN 'Emily (Senior SWE)'
      ELSE 'Employee ' || (eh.id + 1)
    END,
    CASE 
      WHEN eh.id + 1 IN (2, 3) THEN 1 -- reports to Alice
      WHEN eh.id + 1 = 4 THEN 2       -- reports to Bob
      ELSE 4                          -- reports to David
    END,
    eh.level + 1
  FROM employee_hierarchy eh
  WHERE eh.level < 4
)
SELECT * FROM employee_hierarchy;`,
  },
  {
    title: 'Pivot (Dynamic Matrix)',
    description: 'Pivot Sales values across Country headers per Category.',
    sql: `PIVOT sales 
ON Country 
USING SUM(Sales) 
GROUP BY Category;`,
  },
  {
    title: 'Unpivot',
    description: 'Transform wide columns back to narrow list format.',
    sql: `WITH wide_data AS (
  SELECT 'Q1' as quarter, 500 as "West", 700 as "East", 400 as "Central"
  UNION ALL
  SELECT 'Q2' as quarter, 600 as "West", 800 as "East", 450 as "Central"
)
UNPIVOT wide_data
ON "West", "East", "Central"
INTO
  NAME region
  VALUE revenue;`,
  },
  {
    title: 'String Manipulation',
    description: 'Demonstrate regex extract, substring, uppercase, and concat.',
    sql: `SELECT 
  Email,
  UPPER(Name) as Name_Uppercase,
  REGEXP_EXTRACT(Email, '([^@]+)@(.+)', 1) as Email_User,
  REGEXP_EXTRACT(Email, '([^@]+)@(.+)', 2) as Email_Domain,
  LENGTH(Name) as Name_Length
FROM users
LIMIT 20;`,
  },
  {
    title: 'JSON Processing',
    description: 'Parse, query, and extract data from JSON strings.',
    sql: `WITH json_source AS (
  SELECT '{"order_id": "X-109", "customer": {"first": "Jane", "last": "Smith"}, "items": ["Laptop", "Mouse"]}'::VARCHAR as json_str
)
SELECT 
  json_extract_string(json_str, '$.order_id') as Order_ID,
  json_extract_string(json_str, '$.customer.first') as First_Name,
  json_extract_string(json_str, '$.customer.last') as Last_Name,
  json_extract_string(json_str, '$.items[0]') as Primary_Item,
  json_keys(json_extract(json_str, '$.customer')) as Customer_Object_Keys
FROM json_source;`,
  }
];
