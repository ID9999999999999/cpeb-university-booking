-- CPEB deep stabilization reconciliation.
-- This migration is additive and preserves existing users while making new
-- registrations unverified by default. It also installs database-level guards
-- for future overlapping booking/maintenance writes without re-validating old
-- historical rows.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationCodeExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationFailedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationResendAvailableAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loginLockedUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_studentId_key" ON "User"("studentId");

ALTER TABLE "RepairTicket" ADD COLUMN IF NOT EXISTS "reporterId" TEXT;
CREATE INDEX IF NOT EXISTS "RepairTicket_reporterId_idx" ON "RepairTicket"("reporterId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'RepairTicket_reporterId_fkey'
      AND conrelid = '"RepairTicket"'::regclass
  ) THEN
    ALTER TABLE "RepairTicket"
      ADD CONSTRAINT "RepairTicket_reporterId_fkey"
      FOREIGN KEY ("reporterId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BookingRating" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BookingRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingRating_bookingId_key" ON "BookingRating"("bookingId");
CREATE INDEX IF NOT EXISTS "BookingRating_userId_idx" ON "BookingRating"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BookingRating_bookingId_fkey'
      AND conrelid = '"BookingRating"'::regclass
  ) THEN
    ALTER TABLE "BookingRating"
      ADD CONSTRAINT "BookingRating_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BookingRating_userId_fkey'
      AND conrelid = '"BookingRating"'::regclass
  ) THEN
    ALTER TABLE "BookingRating"
      ADD CONSTRAINT "BookingRating_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BookingRating_score_check'
      AND conrelid = '"BookingRating"'::regclass
  ) THEN
    ALTER TABLE "BookingRating"
      ADD CONSTRAINT "BookingRating_score_check"
      CHECK ("score" BETWEEN 1 AND 5) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Booking_time_order_check'
      AND conrelid = '"Booking"'::regclass
  ) THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_time_order_check"
      CHECK ("startTime" < "endTime") NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'MaintenanceRecord_time_order_check'
      AND conrelid = '"MaintenanceRecord"'::regclass
  ) THEN
    ALTER TABLE "MaintenanceRecord"
      ADD CONSTRAINT "MaintenanceRecord_time_order_check"
      CHECK ("startTime" < "endTime") NOT VALID;
  END IF;
END $$;

-- Serialize all time-window writes for one equipment id, then reject overlaps
-- across both bookings and maintenance. This protects against concurrent API
-- requests and also against future direct database clients.
CREATE OR REPLACE FUNCTION cpeb_guard_booking_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" IN ('PENDING', 'APPROVED', 'CHECKED_OUT') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW."equipmentId", 0));

    IF EXISTS (
      SELECT 1
      FROM "Booking" b
      WHERE b."equipmentId" = NEW."equipmentId"
        AND b."id" <> NEW."id"
        AND b."status" IN ('PENDING', 'APPROVED', 'CHECKED_OUT')
        AND b."startTime" < NEW."endTime"
        AND b."endTime" > NEW."startTime"
    ) THEN
      RAISE EXCEPTION 'CPEB booking conflict for equipment %', NEW."equipmentId"
        USING ERRCODE = '23P01';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM "MaintenanceRecord" m
      WHERE m."equipmentId" = NEW."equipmentId"
        AND m."status" IN ('SCHEDULED', 'ACTIVE')
        AND m."startTime" < NEW."endTime"
        AND m."endTime" > NEW."startTime"
    ) THEN
      RAISE EXCEPTION 'CPEB maintenance conflict for equipment %', NEW."equipmentId"
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cpeb_booking_window_guard ON "Booking";
CREATE TRIGGER cpeb_booking_window_guard
BEFORE INSERT OR UPDATE OF "equipmentId", "startTime", "endTime", "status"
ON "Booking"
FOR EACH ROW
EXECUTE FUNCTION cpeb_guard_booking_window();

CREATE OR REPLACE FUNCTION cpeb_guard_maintenance_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" IN ('SCHEDULED', 'ACTIVE') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW."equipmentId", 0));

    IF EXISTS (
      SELECT 1
      FROM "MaintenanceRecord" m
      WHERE m."equipmentId" = NEW."equipmentId"
        AND m."id" <> NEW."id"
        AND m."status" IN ('SCHEDULED', 'ACTIVE')
        AND m."startTime" < NEW."endTime"
        AND m."endTime" > NEW."startTime"
    ) THEN
      RAISE EXCEPTION 'CPEB maintenance conflict for equipment %', NEW."equipmentId"
        USING ERRCODE = '23P01';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM "Booking" b
      WHERE b."equipmentId" = NEW."equipmentId"
        AND b."status" IN ('PENDING', 'APPROVED', 'CHECKED_OUT')
        AND b."startTime" < NEW."endTime"
        AND b."endTime" > NEW."startTime"
    ) THEN
      RAISE EXCEPTION 'CPEB booking conflict for equipment %', NEW."equipmentId"
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cpeb_maintenance_window_guard ON "MaintenanceRecord";
CREATE TRIGGER cpeb_maintenance_window_guard
BEFORE INSERT OR UPDATE OF "equipmentId", "startTime", "endTime", "status"
ON "MaintenanceRecord"
FOR EACH ROW
EXECUTE FUNCTION cpeb_guard_maintenance_window();

-- Enforce rating ownership and lifecycle at the database boundary as well as in
-- the API. This prevents future direct SQL clients from attaching another
-- user's rating to a booking or rating an unfinished booking.
CREATE OR REPLACE FUNCTION cpeb_guard_booking_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  booking_user_id TEXT;
  booking_status "BookingStatus";
BEGIN
  SELECT b."userId", b."status"
    INTO booking_user_id, booking_status
  FROM "Booking" b
  WHERE b."id" = NEW."bookingId";

  IF booking_user_id IS NULL THEN
    RAISE EXCEPTION 'CPEB rating booking does not exist'
      USING ERRCODE = '23503';
  END IF;

  IF NEW."userId" <> booking_user_id THEN
    RAISE EXCEPTION 'CPEB rating user must own booking'
      USING ERRCODE = '23514';
  END IF;

  IF booking_status NOT IN ('RETURNED', 'CLOSED') THEN
    RAISE EXCEPTION 'CPEB unfinished booking cannot be rated'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cpeb_booking_rating_guard ON "BookingRating";
CREATE TRIGGER cpeb_booking_rating_guard
BEFORE INSERT OR UPDATE OF "bookingId", "userId", "score"
ON "BookingRating"
FOR EACH ROW
EXECUTE FUNCTION cpeb_guard_booking_rating();
