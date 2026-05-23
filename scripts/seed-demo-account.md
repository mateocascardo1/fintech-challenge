# Demo account seed (Supabase)

Create user **demo@signalai.app** with password of your choice (disable email confirmation).

After signup, run in SQL editor (replace USER_ID):

```sql
-- Profile: moderate investor, onboarding complete
UPDATE profiles SET
  risk_tolerance = 'moderate',
  investment_horizon = 'long',
  objective = 'growth',
  drawdown_reaction = 'hold',
  patrimony_percentage = '25_50',
  liquidity_need = 'sometimes',
  geo_preference = 'us_intl',
  bond_preference = 'low',
  has_portfolio = true,
  onboarding_completed = true
WHERE id = 'USER_ID';

-- Positions (demo portfolio)
INSERT INTO positions (user_id, symbol, asset_type, quantity) VALUES
  ('USER_ID', 'SPY', 'etf', 55),
  ('USER_ID', 'AAPL', 'equity', 85),
  ('USER_ID', 'BND', 'bond_etf', 130),
  ('USER_ID', 'GGAL', 'equity', 120),
  ('USER_ID', 'CASH-USD', 'cash', 2500)
ON CONFLICT DO NOTHING;
```

Then log in and open Overview once to trigger AI insights generation (or POST /api/insights).
