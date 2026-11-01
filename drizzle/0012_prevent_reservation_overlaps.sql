CREATE TRIGGER IF NOT EXISTS prevent_reservation_overlap_insert
BEFORE INSERT ON reservations
WHEN NEW.status NOT IN ('Završena', 'Otkazana')
  AND EXISTS (
    SELECT 1
    FROM reservations AS existing
    WHERE lower(trim(existing.vehicle)) = lower(trim(NEW.vehicle))
      AND existing.status NOT IN ('Završena', 'Otkazana')
      AND julianday(existing.starts_at) < julianday(NEW.ends_at)
      AND julianday(existing.ends_at) > julianday(NEW.starts_at)
      AND NOT EXISTS (
        SELECT 1
        FROM deleted_records AS deleted
        WHERE deleted.entity = 'reservations'
          AND deleted.record_key = existing.code
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'RESERVATION_CONFLICT');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS prevent_reservation_overlap_update
BEFORE UPDATE OF vehicle, starts_at, ends_at, status ON reservations
WHEN NEW.status NOT IN ('Završena', 'Otkazana')
  AND EXISTS (
    SELECT 1
    FROM reservations AS existing
    WHERE existing.id <> OLD.id
      AND lower(trim(existing.vehicle)) = lower(trim(NEW.vehicle))
      AND existing.status NOT IN ('Završena', 'Otkazana')
      AND julianday(existing.starts_at) < julianday(NEW.ends_at)
      AND julianday(existing.ends_at) > julianday(NEW.starts_at)
      AND NOT EXISTS (
        SELECT 1
        FROM deleted_records AS deleted
        WHERE deleted.entity = 'reservations'
          AND deleted.record_key = existing.code
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'RESERVATION_CONFLICT');
END;
