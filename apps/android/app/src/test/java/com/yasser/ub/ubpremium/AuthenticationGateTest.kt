package com.yasser.ub.ubpremium

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthenticationGateTest {
    @Test
    fun authenticationScreensArePublic() {
        assertFalse(requiresAuthenticatedSession(StudentScreen.Welcome))
        assertFalse(requiresAuthenticatedSession(StudentScreen.Login))
        assertFalse(requiresAuthenticatedSession(StudentScreen.Register))
        assertFalse(requiresAuthenticatedSession(StudentScreen.Verify))
    }

    @Test
    fun everyApplicationScreenIsProtected() {
        val publicScreens = setOf(
            StudentScreen.Welcome,
            StudentScreen.Login,
            StudentScreen.Register,
            StudentScreen.Verify,
        )

        StudentScreen.values()
            .filterNot { it in publicScreens }
            .forEach { screen ->
                assertTrue(
                    "$screen must require an authenticated session",
                    requiresAuthenticatedSession(screen),
                )
            }
    }
}