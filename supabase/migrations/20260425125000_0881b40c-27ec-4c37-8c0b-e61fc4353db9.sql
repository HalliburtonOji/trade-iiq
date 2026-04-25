-- Pre-P13 cached rows have no source; pre-P14 may have source='stooq' or 'finnhub'.
-- All are invalid. Force re-fetch from Yahoo.
delete from public.candle_cache where source is null or source in ('stooq', 'finnhub');