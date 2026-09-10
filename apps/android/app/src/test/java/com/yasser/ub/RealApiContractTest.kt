package com.yasser.ub

import com.yasser.ub.real.BookingDto
import com.yasser.ub.real.RatingBody
import com.yasser.ub.real.RealApi
import com.yasser.ub.real.RegisterBody
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class RealApiContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: RealApi

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(RealApi::class.java)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun registerSendsStudentIdAndParsesDevelopmentCode() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(201)
                .setHeader("Content-Type", "application/json")
                .setBody(
                    """{"requiresVerification":true,"email":"student@example.edu","message":"ok","developmentVerificationCode":"123456"}"""
                )
        )

        val response = api.register(
            RegisterBody(
                fullName = "Student Name",
                studentId = "STU-001",
                email = "student@example.edu",
                password = "Secret123",
            )
        )

        assertEquals("123456", response.developmentVerificationCode)
        val request = server.takeRequest()
        assertEquals("/auth/register", request.path)
        val body = request.body.readUtf8()
        assertTrue(body.contains("\"studentId\":\"STU-001\""))
    }

    @Test
    fun bookingHistoryParsesPersistentRating() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(
                    """[{"id":"b1","startTime":"2026-09-10T09:00:00.000Z","endTime":"2026-09-10T10:00:00.000Z","status":"CLOSED","reason":"Study","equipment":{"id":"e1","name":"Room","category":"ROOM","inventoryTag":"ROOM-1","location":"A","status":"AVAILABLE","description":null},"rating":{"id":"r1","bookingId":"b1","userId":"u1","score":5,"comment":"Great","createdAt":"2026-09-10T10:01:00.000Z","updatedAt":"2026-09-10T10:01:00.000Z"}}]"""
                )
        )

        val bookings: List<BookingDto> = api.bookings("Bearer token")
        assertEquals(1, bookings.size)
        assertNotNull(bookings.first().rating)
        assertEquals(5, bookings.first().rating?.score)
        assertEquals("Bearer token", server.takeRequest().getHeader("Authorization"))
    }

    @Test
    fun ratingUsesAuthenticatedBookingEndpoint() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(201)
                .setHeader("Content-Type", "application/json")
                .setBody(
                    """{"id":"r1","bookingId":"b1","userId":"u1","score":4,"comment":"Good","createdAt":"2026-09-10T10:01:00.000Z","updatedAt":"2026-09-10T10:01:00.000Z"}"""
                )
        )

        val rating = api.rate("Bearer token", "b1", RatingBody(4, "Good"))
        assertEquals(4, rating.score)
        val request = server.takeRequest()
        assertEquals("/bookings/b1/rating", request.path)
        assertEquals("Bearer token", request.getHeader("Authorization"))
    }
}
