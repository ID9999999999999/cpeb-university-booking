package com.yasser.ub.real

import android.content.Context
import com.google.gson.annotations.SerializedName
import com.yasser.ub.BuildConfig
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

data class UserDto(
    val id: String,
    val fullName: String,
    val email: String,
    val role: String,
)

data class AuthResponse(
    @SerializedName("accessToken") val accessToken: String,
    val user: UserDto,
)

data class RegisterResponse(
    val requiresVerification: Boolean,
    val email: String,
    val message: String,
)

data class MessageResponse(val message: String)

data class HealthDto(
    val status: String,
    val service: String? = null,
    val timestamp: String? = null,
)

data class LoginBody(val email: String, val password: String)

data class RegisterBody(
    val fullName: String,
    val email: String,
    val password: String,
)

data class VerifyEmailBody(val email: String, val code: String)

data class ResendVerificationBody(val email: String)

data class EquipmentDto(
    val id: String,
    val name: String,
    val category: String,
    val inventoryTag: String,
    val location: String?,
    val status: String,
    val description: String?,
)

data class BookingBody(
    val equipmentId: String,
    val startTime: String,
    val endTime: String,
    val reason: String?,
)

data class BookingDto(
    val id: String,
    val startTime: String,
    val endTime: String,
    val status: String,
    val reason: String?,
    val equipment: EquipmentDto,
)

data class AvailabilityDto(val available: Boolean, val reason: String)

data class ReportBody(
    val equipmentId: String,
    val title: String,
    val description: String?,
    val evidenceUrl: String? = null,
)

data class ReportDto(
    val id: String,
    val title: String,
    val description: String?,
    val evidenceUrl: String?,
    val status: String,
    val createdAt: String,
    val equipment: EquipmentDto,
)

interface RealApi {
    @GET("health")
    suspend fun health(): HealthDto

    @POST("auth/login")
    suspend fun login(@Body body: LoginBody): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: RegisterBody): RegisterResponse

    @POST("auth/verify-email")
    suspend fun verifyEmail(@Body body: VerifyEmailBody): AuthResponse

    @POST("auth/resend-verification")
    suspend fun resendVerification(@Body body: ResendVerificationBody): MessageResponse

    @GET("auth/me")
    suspend fun me(@Header("Authorization") authorization: String): UserDto

    @GET("equipment")
    suspend fun equipment(@Header("Authorization") authorization: String): List<EquipmentDto>

    @GET("bookings/mine")
    suspend fun bookings(@Header("Authorization") authorization: String): List<BookingDto>

    @GET("bookings/availability")
    suspend fun availability(
        @Header("Authorization") authorization: String,
        @Query("equipmentId") id: String,
        @Query("startTime") start: String,
        @Query("endTime") end: String,
    ): AvailabilityDto

    @POST("bookings")
    suspend fun book(
        @Header("Authorization") authorization: String,
        @Body body: BookingBody,
    ): BookingDto

    @PATCH("bookings/{id}/cancel")
    suspend fun cancel(
        @Header("Authorization") authorization: String,
        @Path("id") id: String,
    ): BookingDto

    @PATCH("bookings/{id}/finish")
    suspend fun finish(
        @Header("Authorization") authorization: String,
        @Path("id") id: String,
    ): BookingDto

    @GET("repair-tickets/mine")
    suspend fun reports(@Header("Authorization") authorization: String): List<ReportDto>

    @GET("repair-tickets/{id}")
    suspend fun reportDetail(
        @Header("Authorization") authorization: String,
        @Path("id") id: String,
    ): ReportDto

    @POST("repair-tickets")
    suspend fun report(
        @Header("Authorization") authorization: String,
        @Body body: ReportBody,
    ): ReportDto
}

class Session(context: Context) {
    private val preferences = context.getSharedPreferences("cpeb_session", 0)

    var token: String?
        get() = preferences.getString("token", null)
        set(value) { preferences.edit().putString("token", value).apply() }

    var name: String?
        get() = preferences.getString("name", null)
        set(value) { preferences.edit().putString("name", value).apply() }

    var apiBaseUrl: String
        get() = preferences.getString("api_base_url", BuildConfig.CPEB_API_BASE_URL) ?: BuildConfig.CPEB_API_BASE_URL
        set(value) {
            val normalized = if (value.trim().endsWith("/")) value.trim() else "${value.trim()}/"
            preferences.edit().putString("api_base_url", normalized).apply()
        }

    fun clear() = preferences.edit().remove("token").remove("name").apply()

    fun bearer() = "Bearer ${token ?: ""}"
}

object ApiFactory {
    val BASE_URL: String
        get() = BuildConfig.CPEB_API_BASE_URL

    private var cachedBaseUrl: String? = null
    private var cachedApi: RealApi? = null

    fun api(baseUrl: String): RealApi {
        val normalized = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        val current = cachedApi
        if (current != null && cachedBaseUrl == normalized) return current
        return synchronized(this) {
            if (cachedApi == null || cachedBaseUrl != normalized) {
                cachedBaseUrl = normalized
                cachedApi = Retrofit.Builder()
                    .baseUrl(normalized)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()
                    .create(RealApi::class.java)
            }
            cachedApi!!
        }
    }

    val api: RealApi
        get() = api(BASE_URL)
}
