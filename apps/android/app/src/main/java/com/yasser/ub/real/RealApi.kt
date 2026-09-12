package com.yasser.ub.real

import android.content.Context
import com.google.gson.annotations.SerializedName
import com.yasser.ub.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

data class UserDto(
    val id: String,
    val fullName: String,
    val studentId: String?,
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
    val developmentVerificationCode: String? = null,
)

data class MessageResponse(
    val message: String,
    val developmentVerificationCode: String? = null,
)

data class HealthDto(
    val status: String,
    val service: String? = null,
    val timestamp: String? = null,
)

data class ReadinessDto(
    val status: String,
    val database: String,
    val resources: Int,
    val emailVerification: String,
    val timestamp: String? = null,
)

data class LoginBody(val email: String, val password: String)

data class RegisterBody(
    val fullName: String,
    val studentId: String,
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

data class RatingDto(
    val id: String,
    val bookingId: String,
    val userId: String,
    val score: Int,
    val comment: String?,
    val createdAt: String,
    val updatedAt: String,
)

data class RatingBody(val score: Int, val comment: String?)

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
    val rating: RatingDto? = null,
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

    @GET("readiness")
    suspend fun readiness(): ReadinessDto

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

    @POST("bookings/{id}/rating")
    suspend fun rate(
        @Header("Authorization") authorization: String,
        @Path("id") id: String,
        @Body body: RatingBody,
    ): RatingDto

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

private fun normalizeApiBaseUrl(value: String): String {
    val trimmed = value.trim()
    val parsed = (if (trimmed.endsWith("/")) trimmed else "$trimmed/").toHttpUrlOrNull()
        ?: throw IllegalArgumentException("Invalid university server URL")

    if (parsed.scheme != "http" && parsed.scheme != "https") {
        throw IllegalArgumentException("University server URL must use HTTP or HTTPS")
    }
    if (!BuildConfig.DEBUG && parsed.scheme != "https") {
        throw IllegalArgumentException("Release builds require an HTTPS university server")
    }
    return parsed.toString()
}

class Session(context: Context) {
    private val preferences = context.getSharedPreferences("cpeb_session", Context.MODE_PRIVATE)
    private val secureTokenStore = SecureTokenStore(context.applicationContext)

    var token: String?
        get() = secureTokenStore.get()
        set(value) { secureTokenStore.set(value) }

    var name: String?
        get() = preferences.getString("name", null)
        set(value) { preferences.edit().putString("name", value).apply() }

    var studentId: String?
        get() = preferences.getString("student_id", null)
        set(value) { preferences.edit().putString("student_id", value).apply() }

    var pendingEmail: String?
        get() = preferences.getString("pending_email", null)
        set(value) { preferences.edit().putString("pending_email", value).apply() }

    var apiBaseUrl: String
        get() {
            val releaseDefault = normalizeApiBaseUrl(BuildConfig.CPEB_API_BASE_URL)
            if (!BuildConfig.DEBUG) return releaseDefault

            val persisted = preferences.getString("api_base_url", null) ?: return releaseDefault
            return runCatching { normalizeApiBaseUrl(persisted) }.getOrElse {
                // A malformed URL left by an older debug build must never crash
                // application startup. Repair the preference and use the known
                // build default instead.
                preferences.edit().remove("api_base_url").apply()
                releaseDefault
            }
        }
        set(value) {
            if (!BuildConfig.DEBUG) return
            preferences.edit().putString("api_base_url", normalizeApiBaseUrl(value)).apply()
        }

    fun saveAuthenticatedUser(response: AuthResponse) {
        secureTokenStore.set(response.accessToken)
        preferences.edit()
            .putString("name", response.user.fullName)
            .putString("student_id", response.user.studentId)
            .remove("pending_email")
            .apply()
    }
    fun clearAuthentication() {
        secureTokenStore.clear()
        preferences.edit()
            .remove("name")
            .remove("student_id")
            .apply()
    }

    fun clear() {
        secureTokenStore.clear()
        preferences.edit()
            .remove("name")
            .remove("student_id")
            .remove("pending_email")
            .apply()
    }
    fun bearer(): String {
        val current = token ?: throw IllegalStateException("No authenticated session")
        return "Bearer $current"
    }
}

object ApiFactory {
    val BASE_URL: String
        get() = normalizeApiBaseUrl(BuildConfig.CPEB_API_BASE_URL)

    private var cachedBaseUrl: String? = null
    private var cachedApi: RealApi? = null

    @Synchronized
    fun api(baseUrl: String): RealApi {
        val normalized = normalizeApiBaseUrl(baseUrl)
        if (cachedApi == null || cachedBaseUrl != normalized) {
            val client = OkHttpClient.Builder()
                .connectTimeout(12, TimeUnit.SECONDS)
                .readTimeout(20, TimeUnit.SECONDS)
                .writeTimeout(20, TimeUnit.SECONDS)
                .callTimeout(30, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true)
                .build()

            cachedBaseUrl = normalized
            cachedApi = Retrofit.Builder()
                .baseUrl(normalized)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(RealApi::class.java)
        }
        return cachedApi!!
    }

    val api: RealApi
        get() = api(BASE_URL)
}
