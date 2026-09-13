package com.yasser.ub

import com.yasser.ub.real.AvailabilityDto
import com.yasser.ub.real.BookingBody
import com.yasser.ub.real.RealApi
import com.yasser.ub.real.ReportBody
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class DeepApiMutationContractTest {
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

    private fun bookingJson(status: String = "PENDING") =
        """{
          "id":"b1",
          "startTime":"2030-01-01T10:00:00.000Z",
          "endTime":"2030-01-01T12:00:00.000Z",
          "status":"$status",
          "reason":null,
          "equipment":{
            "id":"e1",
            "name":"Room",
            "category":"ROOM",
            "inventoryTag":"ROOM-1",
            "location":"A",
            "status":"AVAILABLE",
            "description":null
          },
          "rating":null
        }""".trimIndent()

    @Test
    fun availabilityUsesAuthenticatedQueryContract() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("""{"available":true,"reason":"Available"}""")
        )

        val response: AvailabilityDto = api.availability(
            "Bearer token",
            "e1",
            "2030-01-01T10:00:00.000Z",
            "2030-01-01T12:00:00.000Z",
        )

        assertTrue(response.available)
        val request = server.takeRequest()
        assertTrue(request.path!!.startsWith("/bookings/availability?"))
        assertTrue(request.path!!.contains("equipmentId=e1"))
        assertEquals("Bearer token", request.getHeader("Authorization"))
    }

    @Test
    fun bookingPostOmitsNullOptionalReason() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(201)
                .setHeader("Content-Type", "application/json")
                .setBody(bookingJson())
        )

        api.book(
            "Bearer token",
            BookingBody(
                equipmentId = "e1",
                startTime = "2030-01-01T10:00:00.000Z",
                endTime = "2030-01-01T12:00:00.000Z",
                reason = null,
            )
        )

        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/bookings", request.path)
        assertEquals("Bearer token", request.getHeader("Authorization"))

        val body = request.body.readUtf8()
        assertTrue(body.contains("\"equipmentId\":\"e1\""))
        assertFalse(body.contains("\"reason\""))
    }

    @Test
    fun cancelAndFinishUsePatchEndpoints() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(bookingJson("CANCELLED"))
        )
        api.cancel("Bearer token", "b1")
        val cancel = server.takeRequest()
        assertEquals("PATCH", cancel.method)
        assertEquals("/bookings/b1/cancel", cancel.path)

        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(bookingJson("CLOSED"))
        )
        api.finish("Bearer token", "b1")
        val finish = server.takeRequest()
        assertEquals("PATCH", finish.method)
        assertEquals("/bookings/b1/finish", finish.path)
    }

    @Test
    fun reportUsesAuthenticatedRepairTicketContract() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(201)
                .setHeader("Content-Type", "application/json")
                .setBody(
                    """{
                      "id":"r1",
                      "title":"Broken cable",
                      "description":"Cable is damaged",
                      "evidenceUrl":null,
                      "status":"OPEN",
                      "createdAt":"2030-01-01T12:00:00.000Z",
                      "equipment":{
                        "id":"e1",
                        "name":"Room",
                        "category":"ROOM",
                        "inventoryTag":"ROOM-1",
                        "location":"A",
                        "status":"AVAILABLE",
                        "description":null
                      }
                    }""".trimIndent()
                )
        )

        api.report(
            "Bearer token",
            ReportBody(
                equipmentId = "e1",
                title = "Broken cable",
                description = "Cable is damaged",
            )
        )

        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/repair-tickets", request.path)
        assertEquals("Bearer token", request.getHeader("Authorization"))
        val body = request.body.readUtf8()
        assertTrue(body.contains("\"title\":\"Broken cable\""))
        assertTrue(body.contains("\"equipmentId\":\"e1\""))
    }
}