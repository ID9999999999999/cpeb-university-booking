package com.yasser.ub.ubpremium

import org.junit.Assert.assertFalse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class StudentAppPolicyTest {
    private fun booking(
        status: String,
        start: String,
        rated: Boolean = false,
    ) = BookingUi(
        id = "booking-1",
        equipmentId = "resource-1",
        resource = "Lecture Hall",
        time = "display time",
        startTimeIso = start,
        endTimeIso = "2030-01-01T12:00:00.000Z",
        status = status,
        note = "Study",
        rated = rated,
    )

    @Test
    fun systemBackNavigationStaysInsideExpectedStudentFlow() {
        assertEquals(
            StudentScreen.ResourceDetails,
            previousStudentScreen(StudentScreen.Availability),
        )
        assertEquals(
            StudentScreen.BookingTracking,
            previousStudentScreen(StudentScreen.RateExperience),
        )
        assertEquals(
            StudentScreen.MyReports,
            previousStudentScreen(
                StudentScreen.ReportProblem,
                StudentScreen.MyReports,
            ),
        )
    }

    @Test
    fun registrationValidationMatchesBackendShape() {
        assertTrue(isValidUniversityEmail("student@example.edu"))
        assertFalse(isValidUniversityEmail("not-an-email"))
        assertTrue(isValidStudentId("STU-2026_01"))
        assertFalse(isValidStudentId("STUDENT ID WITH SPACES"))
    }

    @Test
    fun approvedFutureBookingCannotFinishButCanCancel() {
        val now = Instant.parse("2030-01-01T09:00:00.000Z").toEpochMilli()
        val future = booking(
            status = "Approved",
            start = "2030-01-01T10:00:00.000Z",
        )

        assertFalse(bookingCanFinish(future, now))
        assertTrue(bookingCanCancel(future, now))
    }

    @Test
    fun approvedStartedBookingCanFinishButCannotCancel() {
        val now = Instant.parse("2030-01-01T10:30:00.000Z").toEpochMilli()
        val started = booking(
            status = "Approved",
            start = "2030-01-01T10:00:00.000Z",
        )

        assertTrue(bookingCanFinish(started, now))
        assertFalse(bookingCanCancel(started, now))
    }

    @Test
    fun finishedUnratedBookingCanAlwaysReturnToRating() {
        val finished = booking(
            status = "Finished",
            start = "2030-01-01T10:00:00.000Z",
            rated = false,
        )
        val rated = finished.copy(rated = true)

        assertTrue(bookingCanRate(finished))
        assertFalse(bookingCanRate(rated))
    }
}