-- Allow 'bond' and 'cash' as valid asset types in positions table
ALTER TABLE public.positions
  DROP CONSTRAINT IF EXISTS positions_asset_type_check;

ALTER TABLE public.positions
  ADD CONSTRAINT positions_asset_type_check
  CHECK (asset_type IN ('equity', 'etf', 'bond_etf', 'bond', 'cash'));
