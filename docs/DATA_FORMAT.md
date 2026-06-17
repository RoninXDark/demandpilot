# Data Import Format

DemandPilot accepts `.csv` and `.xlsx` files up to 10 MB.

## Required Fields

| Canonical field | Accepted aliases | Description |
|---|---|---|
| `date` | `sales_date`, `order_date`, `timestamp` | Sales date |
| `product_id` | `sku`, `item_id` | Stable product identifier |
| `units_sold` | `quantity`, `qty`, `sales_units` | Units sold for the row |
| `unit_price` | `price`, `sales_price` | Selling price per unit |

At least 14 distinct dates are required. Ninety or more days are recommended for more reliable validation.

## Optional Fields

| Canonical field | Accepted aliases | Default |
|---|---|---|
| `product_name` | `product`, `item_name` | Product ID |
| `store_id` | `store`, `location`, `warehouse` | `default` |
| `category` | - | `Uncategorized` |
| `stock_on_hand` | `inventory`, `stock`, `on_hand` | `0` |
| `lead_time_days` | `lead_time` | `7` |

Missing optional inventory fields do not block an import. DemandPilot reports every applied default in the data-quality warnings.

The dashboard also reports:

- quality score
- acceptance rate
- accepted, rejected, duplicate, and missing-value counts
- unique product and store counts
- total history days
- forecast-readiness status

## Example

```csv
date,store_id,product_id,product_name,category,units_sold,unit_price,stock_on_hand,lead_time_days
2026-01-01,warsaw,sku-101,Wireless Headset,Accessories,12,129.00,240,7
2026-01-02,warsaw,sku-101,Wireless Headset,Accessories,15,129.00,225,7
```

## Validation Rules

- Negative sales quantities and prices are rejected.
- Rows missing a date, product ID, quantity, or price are rejected.
- Exact duplicate rows are removed.
- Invalid dates and non-numeric sales values are rejected.
- The import fails when fewer than 14 valid dates remain.

Imported files are normalized to DemandPilot's canonical schema and stored locally under the ignored `data/uploads/` directory. Original uploads and runtime metadata are never committed to Git.

The active dataset preview endpoint returns the normalized fields that are currently feeding the Action Queue and forecast engine.
