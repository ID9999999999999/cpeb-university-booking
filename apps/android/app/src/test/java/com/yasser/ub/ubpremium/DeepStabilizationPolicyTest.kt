package com.yasser.ub.ubpremium

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DeepStabilizationPolicyTest {
    @Test
    fun onlyAvailableEquipmentIsOfferedForBooking() {
        assertTrue(equipmentStatusAllowsBooking("AVAILABLE"))
        assertTrue(equipmentStatusAllowsBooking("Available"))

        listOf(
            "RESERVED",
            "CHECKED_OUT",
            "UNDER_MAINTENANCE",
            "LOST",
            "RETIRED",
        ).forEach { status ->
            assertFalse(
                "$status must not be offered for booking",
                equipmentStatusAllowsBooking(status),
            )
        }
    }

    @Test
    fun availabilityErrorsAreStudentFriendly() {
        assertEquals(
            "This resource is already booked for the selected time.",
            friendlyAvailabilityReason("Already booked"),
        )
        assertEquals(
            "This resource is unavailable during the selected time because of maintenance.",
            friendlyAvailabilityReason("Maintenance conflict"),
        )
        assertEquals(
            "This resource is currently unavailable for booking.",
            friendlyAvailabilityReason("Resource status is UNDER_MAINTENANCE"),
        )
        assertEquals(
            "This time is not available. Choose another slot.",
            friendlyAvailabilityReason(""),
        )
    }

    @Test
    fun sessionCheckAndProtectedScreensStillRequireAuthentication() {
        assertTrue(requiresAuthenticatedSession(StudentScreen.SessionCheck))
        assertTrue(requiresAuthenticatedSession(StudentScreen.Home))
        assertTrue(requiresAuthenticatedSession(StudentScreen.Profile))

        assertFalse(requiresAuthenticatedSession(StudentScreen.Welcome))
        assertFalse(requiresAuthenticatedSession(StudentScreen.Login))
        assertFalse(requiresAuthenticatedSession(StudentScreen.Register))
        assertFalse(requiresAuthenticatedSession(StudentScreen.Verify))
    }

    @Test
    fun allNonAuthScreensRemainProtected() {
        val publicScreens = setOf(
            StudentScreen.Welcome,
            StudentScreen.Login,
            StudentScreen.Register,
            StudentScreen.Verify,
        )

        StudentScreen.entries.forEach { screen ->
            assertEquals(
                "Unexpected auth policy for $screen",
                screen !in publicScreens,
                requiresAuthenticatedSession(screen),
            )
        }
    }

    @Test
    fun reportProblemReturnsToItsActualOrigin() {
        assertEquals(
            StudentScreen.ResourceDetails,
            previousStudentScreen(
                StudentScreen.ReportProblem,
                StudentScreen.ResourceDetails,
            ),
        )
        assertEquals(
            StudentScreen.BookingTracking,
            previousStudentScreen(
                StudentScreen.ReportProblem,
                StudentScreen.BookingTracking,
            ),
        )
        assertEquals(
            StudentScreen.MyReports,
            previousStudentScreen(
                StudentScreen.ReportProblem,
                StudentScreen.MyReports,
            ),
        )
    }
}