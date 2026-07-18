param(
  [string]$Root = "C:\Users\YASSER\Desktop\CPEB_UNIFIED_PROJECT\CODES"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Need([string]$p) { if (!(Test-Path -LiteralPath $p)) { throw "Missing: $p" } }
function WriteUtf8([string]$p,[string]$c) {
  New-Item -ItemType Directory -Force -Path (Split-Path $p -Parent) | Out-Null
  [IO.File]::WriteAllText($p,$c,[Text.UTF8Encoding]::new($false))
}

$api = Join-Path $Root "apps\api"
$android = Join-Path $Root "apps\android"
$app = Join-Path $android "app\src\main\java\com\yasser\ub\real\CpebRealApp.kt"
$service = Join-Path $api "src\equipment\equipment.service.ts"

Need $app
Need $service

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = Join-Path $Root "backups\PRODUCT_ENHANCEMENT_$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Copy-Item $app (Join-Path $backup "CpebRealApp.kt")
Copy-Item $service (Join-Path $backup "equipment.service.ts")

Step "Creating Git branch"
Push-Location $Root
try { git checkout -b "product-enhancement-$stamp" }
finally { Pop-Location }

Step "Writing enhanced real Android application"
$kotlin = @'
package com.yasser.ub.real

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.time.Duration
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Calendar

private val Blue = Color(0xFF0B5CFF)
private val Navy = Color(0xFF071B44)
private val Green = Color(0xFF16855B)
private val Orange = Color(0xFFF59E0B)
private val Red = Color(0xFFE5484D)
private val Bg = Color(0xFFF4F7FC)

private enum class Screen { LOGIN, REGISTER, HOME, RESOURCES, DETAILS, BOOK, BOOKINGS, REPORTS, PROFILE }

@Composable
fun CpebRealApp() {
  val context = LocalContext.current
  val session = remember { Session(context) }
  val scope = rememberCoroutineScope()

  var screen by remember { mutableStateOf(if (session.token == null) Screen.LOGIN else Screen.HOME) }
  var loading by remember { mutableStateOf(false) }
  var error by remember { mutableStateOf("") }
  var notice by remember { mutableStateOf("") }
  var resources by remember { mutableStateOf<List<EquipmentDto>>(emptyList()) }
  var bookings by remember { mutableStateOf<List<BookingDto>>(emptyList()) }
  var reports by remember { mutableStateOf<List<ReportDto>>(emptyList()) }
  var selected by remember { mutableStateOf<EquipmentDto?>(null) }

  fun auth() = session.bearer()
  fun readable(t: Throwable) = when (t) {
    is HttpException -> t.response()?.errorBody()?.string()?.takeIf { it.isNotBlank() } ?: "Request failed."
    else -> t.message ?: "Cannot connect to the server."
  }

  fun refresh() {
    if (session.token == null) return
    scope.launch {
      loading = true
      error = ""
      try {
        resources = ApiFactory.api.equipment(auth())
        bookings = ApiFactory.api.bookings(auth())
        reports = ApiFactory.api.reports(auth())
      } catch (t: Throwable) {
        error = readable(t)
      } finally {
        loading = false
      }
    }
  }

  LaunchedEffect(session.token) { if (session.token != null) refresh() }

  MaterialTheme(colorScheme = lightColorScheme(primary = Blue, background = Bg, error = Red)) {
    Scaffold(
      containerColor = Bg,
      bottomBar = {
        if (screen !in listOf(Screen.LOGIN, Screen.REGISTER)) {
          NavigationBar {
            listOf(
              Screen.HOME to "Home",
              Screen.RESOURCES to "Resources",
              Screen.BOOKINGS to "Bookings",
              Screen.REPORTS to "Reports",
              Screen.PROFILE to "Profile"
            ).forEach { (target, label) ->
              NavigationBarItem(
                selected = screen == target,
                onClick = { screen = target },
                icon = { Text(label.take(1), fontWeight = FontWeight.Black) },
                label = { Text(label) }
              )
            }
          }
        }
      }
    ) { padding ->
      Box(Modifier.padding(padding).fillMaxSize()) {
        when (screen) {
          Screen.LOGIN -> Login(
            loading, error,
            onLogin = { email, password ->
              scope.launch {
                loading = true
                error = ""
                try {
                  val r = ApiFactory.api.login(LoginBody(email.trim(), password))
                  session.token = r.accessToken
                  session.name = r.user.fullName
                  notice = "Welcome ${r.user.fullName}"
                  screen = Screen.HOME
                  refresh()
                } catch (t: Throwable) {
                  error = readable(t)
                } finally {
                  loading = false
                }
              }
            },
            onRegister = { error = ""; screen = Screen.REGISTER }
          )

          Screen.REGISTER -> Register(
            loading, error,
            onBack = { error = ""; screen = Screen.LOGIN },
            onCreate = { name, email, password ->
              scope.launch {
                loading = true
                error = ""
                try {
                  val r = ApiFactory.api.register(RegisterBody(name.trim(), email.trim(), password))
                  session.token = r.accessToken
                  session.name = r.user.fullName
                  notice = "Account created"
                  screen = Screen.HOME
                  refresh()
                } catch (t: Throwable) {
                  error = readable(t)
                } finally {
                  loading = false
                }
              }
            }
          )

          Screen.HOME -> Home(
            session.name ?: "Student",
            resources, bookings, reports, error, loading,
            onRefresh = ::refresh,
            onResources = { screen = Screen.RESOURCES },
            onBookings = { screen = Screen.BOOKINGS },
            onReports = { screen = Screen.REPORTS }
          )

          Screen.RESOURCES -> Resources(resources) {
            selected = it
            screen = Screen.DETAILS
          }

          Screen.DETAILS -> selected?.let {
            Details(
              it,
              onBack = { screen = Screen.RESOURCES },
              onBook = { screen = Screen.BOOK },
              onReport = { screen = Screen.REPORTS }
            )
          }

          Screen.BOOK -> selected?.let { resource ->
            Book(
              resource, loading, error,
              onBack = { screen = Screen.DETAILS },
              onSubmit = { start, end, reason ->
                scope.launch {
                  loading = true
                  error = ""
                  try {
                    val a = ApiFactory.api.availability(auth(), resource.id, start, end)
                    if (!a.available) error = a.reason
                    else {
                      ApiFactory.api.book(auth(), BookingBody(resource.id, start, end, reason))
                      bookings = ApiFactory.api.bookings(auth())
                      notice = "Booking created"
                      screen = Screen.BOOKINGS
                    }
                  } catch (t: Throwable) {
                    error = readable(t)
                  } finally {
                    loading = false
                  }
                }
              }
            )
          }

          Screen.BOOKINGS -> Bookings(
            bookings, loading, error,
            onRefresh = ::refresh,
            onCancel = { id ->
              scope.launch {
                try {
                  ApiFactory.api.cancel(auth(), id)
                  bookings = ApiFactory.api.bookings(auth())
                  notice = "Booking cancelled"
                } catch (t: Throwable) { error = readable(t) }
              }
            },
            onFinish = { id ->
              scope.launch {
                try {
                  ApiFactory.api.finish(auth(), id)
                  bookings = ApiFactory.api.bookings(auth())
                  notice = "Booking finished"
                } catch (t: Throwable) { error = readable(t) }
              }
            }
          )

          Screen.REPORTS -> Reports(
            reports, resources, selected, loading, error,
            onRefresh = ::refresh,
            onCreate = { equipmentId, title, description ->
              scope.launch {
                loading = true
                try {
                  ApiFactory.api.report(auth(), ReportBody(equipmentId, title, description))
                  reports = ApiFactory.api.reports(auth())
                  notice = "Report sent"
                } catch (t: Throwable) {
                  error = readable(t)
                } finally {
                  loading = false
                }
              }
            }
          )

          Screen.PROFILE -> Profile(session.name ?: "Student", ApiFactory.BASE_URL) {
            session.clear()
            resources = emptyList()
            bookings = emptyList()
            reports = emptyList()
            selected = null
            error = ""
            notice = ""
            screen = Screen.LOGIN
          }
        }

        if (loading) {
          Surface(
            Modifier.align(Alignment.TopCenter).padding(12.dp),
            shape = RoundedCornerShape(50)
          ) {
            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
              CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
              Spacer(Modifier.width(8.dp))
              Text("Working…")
            }
          }
        }

        if (notice.isNotBlank()) {
          LaunchedEffect(notice) {
            kotlinx.coroutines.delay(2500)
            notice = ""
          }
          Surface(
            Modifier.align(Alignment.BottomCenter).padding(18.dp),
            color = Green,
            shape = RoundedCornerShape(18.dp)
          ) {
            Text(notice, color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(14.dp))
          }
        }
      }
    }
  }
}

@Composable
private fun Page(title: String, subtitle: String? = null, content: @Composable ColumnScope.() -> Unit) {
  LazyColumn(
    Modifier.fillMaxSize(),
    contentPadding = PaddingValues(18.dp),
    verticalArrangement = Arrangement.spacedBy(14.dp)
  ) {
    item {
      Text(title, color = Navy, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
      subtitle?.let { Text(it, color = Color.Gray) }
    }
    item { Column(verticalArrangement = Arrangement.spacedBy(12.dp), content = content) }
  }
}

@Composable
private fun Login(loading: Boolean, error: String, onLogin: (String, String) -> Unit, onRegister: () -> Unit) {
  var email by remember { mutableStateOf("") }
  var password by remember { mutableStateOf("") }
  Page("Campus Booking", "Real university authentication") {
    OutlinedTextField(email, { email = it }, label = { Text("University email") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(
      password, { password = it }, label = { Text("Password") },
      visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth()
    )
    if (error.isNotBlank()) ErrorText(error)
    Button(
      { onLogin(email, password) },
      enabled = !loading && email.contains("@") && password.isNotBlank(),
      modifier = Modifier.fillMaxWidth()
    ) { Text(if (loading) "Signing in…" else "Sign in") }
    TextButton(onRegister, modifier = Modifier.align(Alignment.CenterHorizontally)) {
      Text("Create student account")
    }
    Info(
      "Authentication",
      listOf(
        "Only database accounts can sign in.",
        "Wrong credentials are rejected.",
        "Fake email verification is not shown."
      )
    )
  }
}

@Composable
private fun Register(loading: Boolean, error: String, onBack: () -> Unit, onCreate: (String, String, String) -> Unit) {
  var name by remember { mutableStateOf("") }
  var email by remember { mutableStateOf("") }
  var password by remember { mutableStateOf("") }
  var confirm by remember { mutableStateOf("") }
  val valid = name.isNotBlank() && email.contains("@") && password.length >= 6 && password == confirm

  Page("Create student account", "Saved in PostgreSQL") {
    OutlinedTextField(name, { name = it }, label = { Text("Full name") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(email, { email = it }, label = { Text("University email") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(password, { password = it }, label = { Text("Password") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
    OutlinedTextField(confirm, { confirm = it }, label = { Text("Confirm password") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
    if (password.isNotBlank() && password.length < 6) ErrorText("Password must contain at least 6 characters.")
    if (confirm.isNotBlank() && password != confirm) ErrorText("Passwords do not match.")
    if (error.isNotBlank()) ErrorText(error)
    Button({ onCreate(name, email, password) }, enabled = !loading && valid, modifier = Modifier.fillMaxWidth()) {
      Text(if (loading) "Creating…" else "Create account")
    }
    OutlinedButton(onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") }
  }
}

@Composable
private fun Home(
  name: String,
  resources: List<EquipmentDto>,
  bookings: List<BookingDto>,
  reports: List<ReportDto>,
  error: String,
  loading: Boolean,
  onRefresh: () -> Unit,
  onResources: () -> Unit,
  onBookings: () -> Unit,
  onReports: () -> Unit
) {
  Page("Hello, $name", "Live university database") {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      Metric("Resources", resources.size, Blue, Modifier.weight(1f), onResources)
      Metric("Bookings", bookings.size, Green, Modifier.weight(1f), onBookings)
      Metric("Reports", reports.size, Red, Modifier.weight(1f), onReports)
    }
    Button(onResources, modifier = Modifier.fillMaxWidth()) { Text("Browse classified resources") }
    OutlinedButton(onRefresh, modifier = Modifier.fillMaxWidth()) { Text(if (loading) "Refreshing…" else "Refresh") }
    if (error.isNotBlank()) ErrorText(error)
  }
}

@Composable
private fun Metric(title: String, value: Int, color: Color, modifier: Modifier, onClick: () -> Unit) {
  Card(modifier.clickable(onClick = onClick), shape = RoundedCornerShape(18.dp)) {
    Column(Modifier.padding(14.dp)) {
      Text(value.toString(), color = color, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
      Text(title, style = MaterialTheme.typography.bodySmall)
    }
  }
}

@Composable
private fun Resources(resources: List<EquipmentDto>, onOpen: (EquipmentDto) -> Unit) {
  var query by remember { mutableStateOf("") }
  var category by remember { mutableStateOf("ALL") }
  var availableOnly by remember { mutableStateOf(false) }
  val categories = listOf("ALL") + resources.map { it.category.uppercase() }.distinct().sorted()
  val filtered = resources.filter {
    (category == "ALL" || it.category.equals(category, true)) &&
      (!availableOnly || it.status == "AVAILABLE") &&
      (query.isBlank() || it.name.contains(query, true) || it.inventoryTag.contains(query, true) || it.location.orEmpty().contains(query, true))
  }

  LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
    item { Text("Resources", color = Navy, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black) }
    item { OutlinedTextField(query, { query = it }, label = { Text("Search name, tag or location") }, modifier = Modifier.fillMaxWidth()) }
    item {
      LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(categories) { item ->
          FilterChip(category == item, { category = item }, label = { Text(item) })
        }
      }
    }
    item { FilterChip(availableOnly, { availableOnly = !availableOnly }, label = { Text("Available only") }) }
    item { Text("${filtered.size} matching resources", color = Color.Gray) }
    if (filtered.isEmpty()) item { Empty("No resources match these filters.") }
    else items(filtered, key = { it.id }) { e ->
      Card(Modifier.fillMaxWidth().clickable { onOpen(e) }, shape = RoundedCornerShape(20.dp)) {
        Column(Modifier.padding(16.dp)) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Text(e.name, color = Navy, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
            Status(e.status, if (e.status == "AVAILABLE") Green else Orange)
          }
          Text("${e.category} • ${e.inventoryTag}", color = Color.Gray)
          Text(e.location ?: "University campus")
          e.description?.let { Text(it) }
        }
      }
    }
  }
}

@Composable
private fun Details(resource: EquipmentDto, onBack: () -> Unit, onBook: () -> Unit, onReport: () -> Unit) {
  Page(resource.name, "${resource.category} • ${resource.inventoryTag}") {
    Info("Details", listOf(
      "Location: ${resource.location ?: "University campus"}",
      "Status: ${resource.status}",
      "Description: ${resource.description ?: "No description"}"
    ))
    Button(onBook, enabled = resource.status == "AVAILABLE", modifier = Modifier.fillMaxWidth()) {
      Text(if (resource.status == "AVAILABLE") "Book this resource" else "Unavailable")
    }
    OutlinedButton(onReport, modifier = Modifier.fillMaxWidth()) { Text("Report a problem") }
    TextButton(onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") }
  }
}

@Composable
private fun Book(
  resource: EquipmentDto,
  loading: Boolean,
  error: String,
  onBack: () -> Unit,
  onSubmit: (String, String, String) -> Unit
) {
  val context = LocalContext.current
  var date by remember { mutableStateOf("") }
  var start by remember { mutableStateOf("") }
  var end by remember { mutableStateOf("") }
  var reason by remember { mutableStateOf("") }
  var review by remember { mutableStateOf(false) }
  val format = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")

  fun chooseDate() {
    val c = Calendar.getInstance()
    DatePickerDialog(context, { _, y, m, d -> date = "%04d-%02d-%02d".format(y, m + 1, d) },
      c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)
    ).apply { datePicker.minDate = System.currentTimeMillis() }.show()
  }
  fun chooseTime(set: (String) -> Unit) {
    val c = Calendar.getInstance()
    TimePickerDialog(context, { _, h, m -> set("%02d:%02d".format(h, m)) },
      c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE), true
    ).show()
  }

  val s = runCatching { if (date.isBlank() || start.isBlank()) null else LocalDateTime.parse("$date $start", format) }.getOrNull()
  val e = runCatching { if (date.isBlank() || end.isBlank()) null else LocalDateTime.parse("$date $end", format) }.getOrNull()
  val minutes = if (s != null && e != null) Duration.between(s, e).toMinutes() else 0
  val valid = s != null && e != null && minutes >= 10 && reason.trim().length >= 3

  Page("Book ${resource.name}", "Any of the seven days; minute-level times") {
    OutlinedButton(::chooseDate, modifier = Modifier.fillMaxWidth()) { Text(if (date.isBlank()) "Choose date" else date) }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      OutlinedButton({ chooseTime { start = it } }, modifier = Modifier.weight(1f)) { Text(if (start.isBlank()) "Start" else start) }
      OutlinedButton({ chooseTime { end = it } }, modifier = Modifier.weight(1f)) { Text(if (end.isBlank()) "End" else end) }
    }
    if (minutes > 0) Text("Duration: $minutes minutes", color = Green, fontWeight = FontWeight.Bold)
    OutlinedTextField(reason, { reason = it }, label = { Text("Purpose") }, modifier = Modifier.fillMaxWidth())
    if (minutes in 1..9) ErrorText("Minimum duration is 10 minutes.")
    if (s != null && e != null && minutes <= 0) ErrorText("End time must be after start time.")
    if (error.isNotBlank()) ErrorText(error)

    if (!review) {
      Button({ review = true }, enabled = valid && !loading, modifier = Modifier.fillMaxWidth()) { Text("Review booking") }
    } else {
      Info("Confirm", listOf("Date: $date", "Time: $start → $end", "Duration: $minutes minutes", "Purpose: $reason"))
      Button({
        onSubmit(
          s!!.atZone(ZoneId.systemDefault()).toInstant().toString(),
          e!!.atZone(ZoneId.systemDefault()).toInstant().toString(),
          reason.trim()
        )
      }, enabled = !loading, modifier = Modifier.fillMaxWidth()) { Text(if (loading) "Checking…" else "Confirm and book") }
      OutlinedButton({ review = false }, modifier = Modifier.fillMaxWidth()) { Text("Edit") }
    }
    TextButton(onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") }
  }
}

@Composable
private fun Bookings(
  bookings: List<BookingDto>,
  loading: Boolean,
  error: String,
  onRefresh: () -> Unit,
  onCancel: (String) -> Unit,
  onFinish: (String) -> Unit
) {
  var filter by remember { mutableStateOf("ALL") }
  var action by remember { mutableStateOf<Pair<String, String>?>(null) }
  val filtered = bookings.filter {
    filter == "ALL" || when (filter) {
      "ACTIVE" -> it.status in listOf("PENDING", "APPROVED", "CHECKED_OUT")
      "FINISHED" -> it.status in listOf("RETURNED", "CLOSED")
      "CANCELLED" -> it.status in listOf("CANCELLED", "REJECTED")
      else -> true
    }
  }

  LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
    item { Text("My Bookings", color = Navy, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black) }
    item {
      LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(listOf("ALL", "ACTIVE", "FINISHED", "CANCELLED")) { f ->
          FilterChip(filter == f, { filter = f }, label = { Text(f) })
        }
      }
    }
    item { OutlinedButton(onRefresh) { Text(if (loading) "Refreshing…" else "Refresh") } }
    if (error.isNotBlank()) item { ErrorText(error) }
    if (filtered.isEmpty()) item { Empty("No bookings in this section.") }
    else items(filtered, key = { it.id }) { b ->
      Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Text(b.equipment.name, color = Navy, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
            Status(b.status, if (b.status in listOf("APPROVED", "CHECKED_OUT")) Green else Orange)
          }
          Text("${b.startTime} → ${b.endTime}")
          b.reason?.let { Text("Purpose: $it") }
          Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (b.status in listOf("PENDING", "APPROVED")) OutlinedButton({ action = "cancel" to b.id }) { Text("Cancel") }
            if (b.status in listOf("PENDING", "APPROVED", "CHECKED_OUT")) Button({ action = "finish" to b.id }) { Text("Finish") }
          }
        }
      }
    }
  }

  action?.let { a ->
    AlertDialog(
      onDismissRequest = { action = null },
      title = { Text(if (a.first == "cancel") "Cancel booking?" else "Finish booking?") },
      text = { Text("This change will be saved in the database.") },
      confirmButton = {
        Button({
          if (a.first == "cancel") onCancel(a.second) else onFinish(a.second)
          action = null
        }) { Text("Confirm") }
      },
      dismissButton = { TextButton({ action = null }) { Text("Back") } }
    )
  }
}

@Composable
private fun Reports(
  reports: List<ReportDto>,
  resources: List<EquipmentDto>,
  preferred: EquipmentDto?,
  loading: Boolean,
  error: String,
  onRefresh: () -> Unit,
  onCreate: (String, String, String) -> Unit
) {
  var form by remember { mutableStateOf(false) }
  var selected by remember(preferred, resources) { mutableStateOf(preferred ?: resources.firstOrNull()) }
  var query by remember { mutableStateOf("") }
  var title by remember { mutableStateOf("") }
  var description by remember { mutableStateOf("") }
  val matches = resources.filter { query.isBlank() || it.name.contains(query, true) || it.inventoryTag.contains(query, true) }

  LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
    item {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Text("My Reports", color = Navy, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
        Button({ form = !form }) { Text(if (form) "Close" else "New report") }
      }
    }
    if (form) item {
      Card(shape = RoundedCornerShape(20.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          OutlinedTextField(query, { query = it }, label = { Text("Find resource") }, modifier = Modifier.fillMaxWidth())
          LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            items(matches.take(15)) { e -> FilterChip(selected?.id == e.id, { selected = e }, label = { Text(e.name) }) }
          }
          Text("Selected: ${selected?.name ?: "None"}")
          OutlinedTextField(title, { title = it }, label = { Text("Problem title") }, modifier = Modifier.fillMaxWidth())
          OutlinedTextField(description, { description = it }, label = { Text("Description") }, minLines = 3, modifier = Modifier.fillMaxWidth())
          Button({
            selected?.let {
              onCreate(it.id, title.trim(), description.trim())
              title = ""; description = ""; form = false
            }
          }, enabled = !loading && selected != null && title.trim().length >= 3, modifier = Modifier.fillMaxWidth()) {
            Text("Send report to database")
          }
        }
      }
    }
    item { OutlinedButton(onRefresh) { Text(if (loading) "Refreshing…" else "Refresh reports") } }
    if (error.isNotBlank()) item { ErrorText(error) }
    if (reports.isEmpty()) item { Empty("No reports have been submitted.") }
    else items(reports, key = { it.id }) { r ->
      Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.padding(14.dp)) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Text(r.title, color = Navy, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
            Status(r.status, Blue)
          }
          Text(r.equipment.name, color = Color.Gray)
          r.description?.let { Text(it) }
        }
      }
    }
  }
}

@Composable
private fun Profile(name: String, api: String, onLogout: () -> Unit) {
  var confirm by remember { mutableStateOf(false) }
  Page("Profile", "Authenticated session") {
    Info("Account", listOf("Name: $name", "API: $api", "Storage: PostgreSQL", "Authentication: JWT"))
    Button({ confirm = true }, colors = ButtonDefaults.buttonColors(containerColor = Red), modifier = Modifier.fillMaxWidth()) { Text("Log out") }
  }
  if (confirm) AlertDialog(
    onDismissRequest = { confirm = false },
    title = { Text("Log out?") },
    text = { Text("The saved token will be removed from this device.") },
    confirmButton = { Button({ confirm = false; onLogout() }, colors = ButtonDefaults.buttonColors(containerColor = Red)) { Text("Log out") } },
    dismissButton = { TextButton({ confirm = false }) { Text("Cancel") } }
  )
}

@Composable private fun Info(title: String, lines: List<String>) {
  Card(shape = RoundedCornerShape(18.dp)) {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
      Text(title, color = Navy, fontWeight = FontWeight.Black)
      lines.forEach { Text("• $it") }
    }
  }
}

@Composable private fun Status(text: String, color: Color) {
  Surface(color = color.copy(alpha = .12f), shape = RoundedCornerShape(50)) {
    Text(text, color = color, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp))
  }
}

@Composable private fun ErrorText(text: String) {
  Text(text, color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
}

@Composable private fun Empty(text: String) {
  Card(shape = RoundedCornerShape(18.dp)) {
    Text(text, color = Color.Gray, modifier = Modifier.fillMaxWidth().padding(24.dp))
  }
}
'@

WriteUtf8 $app $kotlin

Step "Improving backend equipment ordering"
$source = Get-Content -LiteralPath $service -Raw
$pattern = 'return this\.prisma\.equipment\.findMany\(\{\s*orderBy:\s*\{\s*createdAt:\s*''desc'',?\s*\},?\s*\}\);'
$replacement = @'
return this.prisma.equipment.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
        { inventoryTag: 'asc' },
      ],
    });
'@
if ([regex]::IsMatch($source, $pattern)) {
  $source = [regex]::Replace($source, $pattern, $replacement, 1)
  WriteUtf8 $service $source
} else {
  Write-Host "Ordering block differs; backend file preserved." -ForegroundColor Yellow
}

Step "Building backend"
Push-Location $api
try {
  npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "Backend build failed." }
}
finally { Pop-Location }

Step "Building Android APK"
Push-Location $android
try {
  .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) { throw "Android build failed." }
}
finally { Pop-Location }

Step "Committing successful enhancement"
Push-Location $Root
try {
  git add .
  git commit -m "Enhance real booking product UI and flows"
}
finally { Pop-Location }

$apk = Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"
Write-Host "`nSUCCESS" -ForegroundColor Green
Write-Host "Backup: $backup"
Write-Host "APK: $apk"
Write-Host "Original premium UI remains untouched."
