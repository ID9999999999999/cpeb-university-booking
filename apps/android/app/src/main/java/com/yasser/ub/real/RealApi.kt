package com.yasser.ub.real
import android.content.Context
import com.google.gson.annotations.SerializedName
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

data class UserDto(val id:String,val fullName:String,val email:String,val role:String)
data class AuthResponse(@SerializedName("accessToken") val accessToken:String,val user:UserDto)
data class RegisterResponse(val requiresVerification:Boolean,val email:String,val message:String)
data class MessageResponse(val message:String)
data class LoginBody(val email:String,val password:String)
data class RegisterBody(val fullName:String,val email:String,val password:String)
data class VerifyEmailBody(val email:String,val code:String)
data class ResendVerificationBody(val email:String)
data class EquipmentDto(val id:String,val name:String,val category:String,val inventoryTag:String,val location:String?,val status:String,val description:String?)
data class BookingBody(val equipmentId:String,val startTime:String,val endTime:String,val reason:String?)
data class BookingDto(val id:String,val startTime:String,val endTime:String,val status:String,val reason:String?,val equipment:EquipmentDto)
data class AvailabilityDto(val available:Boolean,val reason:String)
data class ReportBody(val equipmentId:String,val title:String,val description:String?)
data class ReportDto(val id:String,val title:String,val description:String?,val status:String,val createdAt:String,val equipment:EquipmentDto)

interface RealApi {
 @POST("auth/login") suspend fun login(@Body b:LoginBody):AuthResponse
 @POST("auth/register") suspend fun register(@Body b:RegisterBody):RegisterResponse
 @POST("auth/verify-email") suspend fun verifyEmail(@Body b:VerifyEmailBody):AuthResponse
 @POST("auth/resend-verification") suspend fun resendVerification(@Body b:ResendVerificationBody):MessageResponse
 @GET("equipment") suspend fun equipment(@Header("Authorization")a:String):List<EquipmentDto>
 @GET("bookings/mine") suspend fun bookings(@Header("Authorization")a:String):List<BookingDto>
 @GET("bookings/availability") suspend fun availability(@Header("Authorization")a:String,@Query("equipmentId")id:String,@Query("startTime")s:String,@Query("endTime")e:String):AvailabilityDto
 @POST("bookings") suspend fun book(@Header("Authorization")a:String,@Body b:BookingBody):BookingDto
 @PATCH("bookings/{id}/cancel") suspend fun cancel(@Header("Authorization")a:String,@Path("id")id:String):BookingDto
 @PATCH("bookings/{id}/finish") suspend fun finish(@Header("Authorization")a:String,@Path("id")id:String):BookingDto
 @GET("repair-tickets/mine") suspend fun reports(@Header("Authorization")a:String):List<ReportDto>
 @POST("repair-tickets") suspend fun report(@Header("Authorization")a:String,@Body b:ReportBody):ReportDto
}

class Session(c:Context) {
 private val p=c.getSharedPreferences("cpeb_session",0)
 var token:String? get()=p.getString("token",null);set(v){p.edit().putString("token",v).apply()}
 var name:String? get()=p.getString("name",null);set(v){p.edit().putString("name",v).apply()}
 fun clear()=p.edit().clear().apply()
 fun bearer()="Bearer ${token?:""}"
}

object ApiFactory {
 const val BASE_URL="http://10.190.66.192:3000/"
 val api:RealApi by lazy {
   Retrofit.Builder()
     .baseUrl(BASE_URL)
     .addConverterFactory(GsonConverterFactory.create())
     .build()
     .create(RealApi::class.java)
 }
}