package com.yasser.ub

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.yasser.ub.ubpremium.UbCampusBookingApp
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AuthenticationUiSmokeTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Before
    fun clearStudentSession() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        context.getSharedPreferences("cpeb_session", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
    }

    @Test
    fun freshInstallCannotReachStudentAreaWithoutAuthentication() {
        composeRule.setContent { UbCampusBookingApp() }

        composeRule.onNodeWithText("Campus Booking").assertIsDisplayed()

        composeRule.onNodeWithText("Sign in").performClick()

        composeRule.onNodeWithText("University email").assertIsDisplayed()
        composeRule.onNodeWithText("Password").assertIsDisplayed()
    }
}