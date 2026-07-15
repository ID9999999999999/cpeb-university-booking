package com.yasser.ub.ubpremium

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yasser.ub.R

private val IMG_LOGO = R.drawable.ub_campus_logo
private val IMG_CAMPUS = R.drawable.campus_parking_zone
private val IMG_ROOM = R.drawable.lecture_hall_a
private val IMG_LAB = R.drawable.physics_laboratory_2
private val IMG_MEDIA = R.drawable.canon_camera_kit
private val IMG_PARKING = R.drawable.campus_parking_zone
private object UB {
    val Blue = Color(0xFF0B5CFF)
    val BlueDark = Color(0xFF052B85)
    val Navy = Color(0xFF071B44)
    val Bg = Color(0xFFF4F7FC)
    val Card = Color.White
    val Muted = Color(0xFF66758D)
    val Line = Color(0xFFE2E8F2)
    val Green = Color(0xFF16A36A)
    val Orange = Color(0xFFF59E0B)
    val Red = Color(0xFFE5484D)
    val Purple = Color(0xFF7C3AED)
}

private enum class StudentScreen {
    Welcome,
    Login,
    Register,
    Verify,
    Home,
    Category,
    ResourceList,
    ResourceDetails,
    Availability,
    BookingReview,
    BookingSuccess,
    MyBookings,
    BookingTracking,
    FinishBooking,
    RateExperience,
    ReportProblem,
    MyReports,
    Warnings,
    Help,
    Profile
}

private enum class ResourceKind {
    Rooms,
    Labs,
    Media,
    Sports,
    Parking
}

private data class CategoryUi(
    val kind: ResourceKind,
    val title: String,
    val subtitle: String,
    val image: Int?,
    val color: Color,
    val chips: List<String>
)

private data class ResourceUi(
    val id: String,
    val kind: ResourceKind,
    val name: String,
    val subtitle: String,
    val location: String,
    val status: String,
    val image: Int?,
    val color: Color,
    val details: List<String>,
    val rules: List<String>
)

private data class BookingUi(
    val id: String,
    val resource: String,
    val time: String,
    val status: String,
    val note: String
)

private data class ReportUi(
    val title: String,
    val resource: String,
    val status: String,
    val date: String
)

@Composable
fun UbCampusBookingApp() {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = UB.Blue,
            secondary = UB.BlueDark,
            background = UB.Bg,
            surface = UB.Card
        )
    ) {
        val categories = remember { studentCategories() }
        val resources = remember { studentResources() }
        val bookings = remember {
            mutableStateListOf(
                BookingUi("B-1041", "Lecture Hall A1", "Today 13:00 - 15:00", "Approved", "AI seminar presentation"),
                BookingUi("B-1042", "Canon Camera Kit", "Tomorrow 09:00 - 16:00", "Pending", "Project video recording"),
                BookingUi("B-1036", "Computer Lab 01", "Yesterday 10:00 - 12:00", "Finished", "Practical session")
            )
        }
        val reports = remember {
            mutableStateListOf(
                ReportUi("Projector not working", "Lecture Hall A1", "Sent to technician", "Today"),
                ReportUi("Weak camera battery", "Canon Camera Kit", "Under review", "Yesterday")
            )
        }

        var screen by remember { mutableStateOf(StudentScreen.Welcome) }
        var tab by remember { mutableStateOf("Home") }
        var selectedCategory by remember { mutableStateOf(categories.first()) }
        var selectedResource by remember { mutableStateOf(resources.first()) }
        var selectedBooking by remember { mutableStateOf(bookings.first()) }

        fun openHome() {
            tab = "Home"
            screen = StudentScreen.Home
        }

        fun openCategory(category: CategoryUi) {
            selectedCategory = category
            screen = StudentScreen.Category
        }

        fun openResource(resource: ResourceUi) {
            selectedResource = resource
            screen = StudentScreen.ResourceDetails
        }

        Surface(modifier = Modifier.fillMaxSize(), color = UB.Bg) {
            when (screen) {
                StudentScreen.Welcome -> StudentWelcomeScreen(
                    onStart = { screen = StudentScreen.Login },
                    onSignIn = { screen = StudentScreen.Login }
                )

                StudentScreen.Login -> StudentLoginScreen(
                    onLogin = { openHome() },
                    onRegister = { screen = StudentScreen.Register },
                    onHelp = { screen = StudentScreen.Help }
                )

                StudentScreen.Register -> StudentRegisterScreen(
                    onBack = { screen = StudentScreen.Login },
                    onNext = { screen = StudentScreen.Verify }
                )

                StudentScreen.Verify -> StudentVerifyScreen(
                    onBack = { screen = StudentScreen.Register },
                    onDone = { openHome() }
                )

                else -> StudentShell(
                    current = tab,
                    onTab = {
                        tab = it
                        screen = when (it) {
                            "Home" -> StudentScreen.Home
                            "Bookings" -> StudentScreen.MyBookings
                            "Reports" -> StudentScreen.MyReports
                            "Help" -> StudentScreen.Help
                            else -> StudentScreen.Profile
                        }
                    }
                ) {
                    when (screen) {
                        StudentScreen.Home -> StudentHomeScreen(
                            categories = categories,
                            bookings = bookings,
                            onOpenCategory = { openCategory(it) },
                            onOpenBookings = {
                                tab = "Bookings"
                                screen = StudentScreen.MyBookings
                            },
                            onWarnings = { screen = StudentScreen.Warnings },
                            onHelp = { screen = StudentScreen.Help }
                        )

                        StudentScreen.Category -> StudentCategoryScreen(
                            category = selectedCategory,
                            resources = resources.filter { it.kind == selectedCategory.kind },
                            onBack = { openHome() },
                            onOpen = { openResource(it) }
                        )

                        StudentScreen.ResourceList -> StudentCategoryScreen(
                            category = selectedCategory,
                            resources = resources.filter { it.kind == selectedCategory.kind },
                            onBack = { openHome() },
                            onOpen = { openResource(it) }
                        )

                        StudentScreen.ResourceDetails -> StudentResourceDetailsScreen(
                            resource = selectedResource,
                            onBack = { screen = StudentScreen.Category },
                            onBook = { screen = StudentScreen.Availability },
                            onReport = { screen = StudentScreen.ReportProblem }
                        )

                        StudentScreen.Availability -> StudentAvailabilityScreen(
                            resource = selectedResource,
                            onBack = { screen = StudentScreen.ResourceDetails },
                            onContinue = { screen = StudentScreen.BookingReview }
                        )

                        StudentScreen.BookingReview -> StudentBookingReviewScreen(
                            resource = selectedResource,
                            onBack = { screen = StudentScreen.Availability },
                            onSubmit = {
                                bookings.add(
                                    0,
                                    BookingUi(
                                        "B-NEW",
                                        selectedResource.name,
                                        "Selected slot",
                                        "Pending",
                                        "New academic booking request"
                                    )
                                )
                                screen = StudentScreen.BookingSuccess
                            }
                        )

                        StudentScreen.BookingSuccess -> StudentBookingSuccessScreen(
                            onTrack = {
                                selectedBooking = bookings.first()
                                screen = StudentScreen.BookingTracking
                            },
                            onHome = { openHome() }
                        )

                        StudentScreen.MyBookings -> StudentMyBookingsScreen(
                            bookings = bookings,
                            onOpen = {
                                selectedBooking = it
                                screen = StudentScreen.BookingTracking
                            }
                        )

                        StudentScreen.BookingTracking -> StudentBookingTrackingScreen(
                            booking = selectedBooking,
                            onBack = { screen = StudentScreen.MyBookings },
                            onFinish = { screen = StudentScreen.FinishBooking },
                            onReport = { screen = StudentScreen.ReportProblem }
                        )

                        StudentScreen.FinishBooking -> StudentFinishBookingScreen(
                            onBack = { screen = StudentScreen.BookingTracking },
                            onRate = { screen = StudentScreen.RateExperience },
                            onProblem = { screen = StudentScreen.ReportProblem }
                        )

                        StudentScreen.RateExperience -> StudentRateExperienceScreen(
                            onBack = { screen = StudentScreen.FinishBooking },
                            onDone = { screen = StudentScreen.MyBookings }
                        )

                        StudentScreen.ReportProblem -> StudentReportProblemScreen(
                            resourceName = selectedResource.name,
                            onBack = { screen = StudentScreen.ResourceDetails },
                            onSubmit = { title ->
                                reports.add(0, ReportUi(title, selectedResource.name, "Sent to staff", "Now"))
                                tab = "Reports"
                                screen = StudentScreen.MyReports
                            }
                        )

                        StudentScreen.MyReports -> StudentReportsScreen(
                            reports = reports,
                            onNew = { screen = StudentScreen.ReportProblem }
                        )

                        StudentScreen.Warnings -> StudentWarningsScreen(
                            onBack = { openHome() }
                        )

                        StudentScreen.Help -> StudentHelpScreen(
                            onBack = { openHome() }
                        )

                        StudentScreen.Profile -> StudentProfileScreen(
                            onWarnings = { screen = StudentScreen.Warnings },
                            onReports = {
                                tab = "Reports"
                                screen = StudentScreen.MyReports
                            },
                            onHelp = { screen = StudentScreen.Help },
                            onLogout = {
                                tab = "Home"
                                screen = StudentScreen.Login
                            }
                        )

                        else -> StudentHomeScreen(
                            categories = categories,
                            bookings = bookings,
                            onOpenCategory = { openCategory(it) },
                            onOpenBookings = { screen = StudentScreen.MyBookings },
                            onWarnings = { screen = StudentScreen.Warnings },
                            onHelp = { screen = StudentScreen.Help }
                        )
                    }
                }
            }
        }
    }
}

private fun studentCategories(): List<CategoryUi> {
    return listOf(
        CategoryUi(ResourceKind.Rooms, "Rooms & Halls", "Lecture halls, seminar rooms and study spaces", IMG_ROOM, UB.Blue, listOf("Capacity", "Projector", "Building")),
        CategoryUi(ResourceKind.Labs, "Laboratories", "Computer, science and AI lab spaces", IMG_LAB, UB.Purple, listOf("Safety", "Technician", "Equipment")),
        CategoryUi(ResourceKind.Media, "Media Equipment", "Cameras, microphones, tripods and lighting kits", IMG_MEDIA, UB.Orange, listOf("Battery", "Pickup", "Kit")),
        CategoryUi(ResourceKind.Sports, "Sports Equipment", "Team kits, gym slots and event equipment", null, UB.Green, listOf("Team size", "Indoor", "Outdoor")),
        CategoryUi(ResourceKind.Parking, "Parking & Access", "Student parking, visitor access and event parking", IMG_PARKING, UB.Navy, listOf("Gate", "Plate", "Access"))
    )
}

private fun studentResources(): List<ResourceUi> {
    return listOf(
        ResourceUi("room-a1", ResourceKind.Rooms, "Lecture Hall A1", "Large academic hall with projector", "Building A - Floor 1", "Available today", IMG_ROOM, UB.Blue,
            listOf("120 seats", "Projector and smart board", "Suitable for seminars and presentations", "No technician required"),
            listOf("Keep room clean", "Close door after use", "Report projector problems immediately")
        ),
        ResourceUi("room-b2", ResourceKind.Rooms, "Seminar Room B2", "Medium discussion room", "Building B - Floor 2", "Available after 14:00", IMG_ROOM, UB.Blue,
            listOf("35 seats", "Whiteboard and screen", "Good for group work", "Quiet academic zone"),
            listOf("Do not move tables outside", "Return chairs to original layout")
        ),
        ResourceUi("lab-01", ResourceKind.Labs, "Computer Lab 01", "Teaching lab with networked PCs", "Tech Building", "Available today", IMG_LAB, UB.Purple,
            listOf("28 PCs", "Teacher screen", "Network and software tools", "Best for practical sessions"),
            listOf("No food inside", "Do not change PC settings", "Technician may inspect after use")
        ),
        ResourceUi("lab-physics", ResourceKind.Labs, "Physics Laboratory 2", "Scientific lab with supervised access", "Science Block", "Technician approval", IMG_LAB, UB.Purple,
            listOf("Lab benches", "Safety equipment", "Microscopes and measurement tools", "Supervision required"),
            listOf("Safety rules required", "Technician approval required", "Report damage immediately")
        ),
        ResourceUi("media-cam", ResourceKind.Media, "Canon Camera Kit", "Camera body, lens, charger and card", "Media Office", "Available now", IMG_MEDIA, UB.Orange,
            listOf("Camera body", "Lens and charger", "Memory card included", "Pickup from Media Office"),
            listOf("Return battery charged", "Do not remove memory card", "Report missing parts")
        ),
        ResourceUi("media-audio", ResourceKind.Media, "Podcast Audio Kit", "Microphones and recorder for interviews", "Media Office", "Available tomorrow", IMG_MEDIA, UB.Orange,
            listOf("Two microphones", "Portable recorder", "Cables included", "Good for podcast and interviews"),
            listOf("Check cables before return", "Store microphones in case")
        ),
        ResourceUi("sport-foot", ResourceKind.Sports, "Football Training Kit", "Balls, cones and training bibs", "Sports Center", "Available today", null, UB.Green,
            listOf("4 balls", "Training cones", "Team bibs", "Outdoor use"),
            listOf("Return all items", "Clean muddy equipment", "Report missing balls")
        ),
        ResourceUi("sport-gym", ResourceKind.Sports, "Gym Access Slot", "Indoor training slot", "Sports Hall", "Limited slots", null, UB.Green,
            listOf("Indoor access", "Supervised time slot", "Student ID required", "Capacity controlled"),
            listOf("Respect safety rules", "Do not exceed reserved time")
        ),
        ResourceUi("park-student", ResourceKind.Parking, "Student Parking Slot", "Daily student campus access", "North Gate", "Available today", IMG_PARKING, UB.Navy,
            listOf("Daily access", "Student ID required", "Plate number required", "North gate entry"),
            listOf("Use only assigned zone", "Do not share access", "Respect campus security")
        ),
        ResourceUi("park-visitor", ResourceKind.Parking, "Visitor Access Pass", "Guest parking with approval", "Security Office", "Approval required", IMG_PARKING, UB.Navy,
            listOf("Visitor name required", "Visit purpose required", "Security approval", "Limited duration"),
            listOf("Guest must carry ID", "Host is responsible for visitor")
        )
    )
}

@Composable
private fun StudentShell(current: String, onTab: (String) -> Unit, content: @Composable () -> Unit) {
    Scaffold(
        containerColor = UB.Bg,
        bottomBar = {
            NavigationBar(containerColor = Color.White) {
                listOf("Home" to "H", "Bookings" to "B", "Reports" to "R", "Help" to "?", "Profile" to "P").forEach { item ->
                    NavigationBarItem(
                        selected = current == item.first,
                        onClick = { onTab(item.first) },
                        icon = { Text(item.second, fontWeight = FontWeight.Black) },
                        label = { Text(item.first) }
                    )
                }
            }
        }
    ) { pad ->
        Box(modifier = Modifier.padding(pad).fillMaxSize()) {
            content()
        }
    }
}

@Composable
private fun StudentWelcomeScreen(onStart: () -> Unit, onSignIn: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().background(UB.BlueDark)) {
        Image(
            painter = painterResource(IMG_CAMPUS),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xAA032A82),
                        Color(0x770B5CFF),
                        Color(0xF0051742)
                    )
                )
            )
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(18.dp)
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(34.dp),
                colors = CardDefaults.cardColors(Color.White.copy(alpha = 0.96f))
            ) {
                Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(82.dp)
                            .clip(RoundedCornerShape(25.dp))
                            .background(Brush.linearGradient(listOf(UB.Blue, UB.BlueDark))),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("UB", color = Color.White, fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineLarge)
                    }

                    Spacer(Modifier.height(18.dp))
                    Text("Campus Booking", color = UB.Navy, fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(8.dp))
                    Text("Book rooms, labs, equipment, sports resources and parking in one student app.", color = UB.Muted, textAlign = TextAlign.Center)

                    Spacer(Modifier.height(22.dp))
                    Button(
                        onClick = onStart,
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        shape = RoundedCornerShape(18.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = UB.Blue)
                    ) {
                        Text("Get started", fontWeight = FontWeight.Black)
                    }

                    Spacer(Modifier.height(12.dp))
                    Text("Sign in", color = UB.Blue, fontWeight = FontWeight.Black, modifier = Modifier.clickable { onSignIn() })
                }
            }
        }
    }
}

@Composable
private fun StudentLoginScreen(onLogin: () -> Unit, onRegister: () -> Unit, onHelp: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    AuthFrame(title = "Sign in", subtitle = "Use your university account to continue") {
        InputField(
            value = email,
            onValueChange = {
                email = it
                error = ""
            },
            label = "University email",
            keyboardType = KeyboardType.Email
        )
        Spacer(Modifier.height(10.dp))
        InputField(
            value = password,
            onValueChange = {
                password = it
                error = ""
            },
            label = "Password",
            isPassword = true
        )

        if (error.isNotBlank()) {
            Spacer(Modifier.height(10.dp))
            Text(error, color = UB.Red, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }

        Spacer(Modifier.height(18.dp))
        Button(
            onClick = {
                when {
                    email.isBlank() -> error = "Please enter your university email."
                    !email.contains("@") -> error = "Please enter a valid email address."
                    password.length < 4 -> error = "Password must contain at least 4 characters."
                    else -> {
                        loading = true
                        onLogin()
                    }
                }
            },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(containerColor = UB.Blue)
        ) {
            Text(if (loading) "Signing in..." else "Sign in", fontWeight = FontWeight.Black)
        }

        Spacer(Modifier.height(8.dp))
        TextButton(onClick = onRegister) { Text("Create student account") }
        TextButton(onClick = onHelp) { Text("I have a login problem") }
    }
}

@Composable
private fun StudentRegisterScreen(onBack: () -> Unit, onNext: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var studentId by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }

    AuthFrame(title = "Create student account", subtitle = "Complete your academic identity") {
        InputField(name, { name = it; error = "" }, "Full name")
        Spacer(Modifier.height(10.dp))
        InputField(email, { email = it; error = "" }, "University email", KeyboardType.Email)
        Spacer(Modifier.height(10.dp))
        InputField(studentId, { studentId = it; error = "" }, "Student ID")
        Spacer(Modifier.height(10.dp))
        InputField(password, { password = it; error = "" }, "Create password", isPassword = true)

        if (error.isNotBlank()) {
            Spacer(Modifier.height(10.dp))
            Text(error, color = UB.Red, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }

        Spacer(Modifier.height(18.dp))
        Button(
            onClick = {
                when {
                    name.isBlank() -> error = "Please enter your full name."
                    !email.contains("@") -> error = "Please enter a valid university email."
                    studentId.isBlank() -> error = "Please enter your student ID."
                    password.length < 4 -> error = "Password is too short."
                    else -> onNext()
                }
            },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(containerColor = UB.Blue)
        ) {
            Text("Continue", fontWeight = FontWeight.Black)
        }

        TextButton(onClick = onBack) { Text("Back to sign in") }
    }
}

@Composable
private fun StudentVerifyScreen(onBack: () -> Unit, onDone: () -> Unit) {
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }

    AuthFrame(title = "Verify email", subtitle = "Enter the 6-digit code sent to your university email") {
        InputField(code, { code = it; error = "" }, "Verification code", KeyboardType.Number)

        if (error.isNotBlank()) {
            Spacer(Modifier.height(10.dp))
            Text(error, color = UB.Red, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }

        Spacer(Modifier.height(18.dp))
        Button(
            onClick = {
                if (code.length < 4) error = "Enter the verification code first." else onDone()
            },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(containerColor = UB.Blue)
        ) {
            Text("Verify and enter app", fontWeight = FontWeight.Black)
        }

        TextButton(onClick = onBack) { Text("Back") }
    }
}

@Composable
private fun StudentHomeScreen(
    categories: List<CategoryUi>,
    bookings: List<BookingUi>,
    onOpenCategory: (CategoryUi) -> Unit,
    onOpenBookings: () -> Unit,
    onWarnings: () -> Unit,
    onHelp: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth().statusBarsPadding(), verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Hello, Student", color = UB.Muted, fontWeight = FontWeight.Bold)
                    Text("Book your campus resources", color = UB.Navy, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                }
                Box(
                    modifier = Modifier.size(46.dp).clip(CircleShape).background(UB.Blue),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Y", color = Color.White, fontWeight = FontWeight.Black)
                }
            }
        }

        item {
            HomeHeroCard(onBookings = onOpenBookings, onWarnings = onWarnings)
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                HomeMiniTile("Active", bookings.count { it.status == "Approved" }.toString(), UB.Green, Modifier.weight(1f), onOpenBookings)
                HomeMiniTile("Pending", bookings.count { it.status == "Pending" }.toString(), UB.Orange, Modifier.weight(1f), onOpenBookings)
                HomeMiniTile("Reports", "2", UB.Red, Modifier.weight(1f), onHelp)
            }
        }

        item { SectionTitle("Choose a category", "Every category has its own booking logic") }

        items(categories) { category ->
            StudentCategoryCard(category = category, onClick = { onOpenCategory(category) })
        }

        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun StudentCategoryScreen(
    category: CategoryUi,
    resources: List<ResourceUi>,
    onBack: () -> Unit,
    onOpen: (ResourceUi) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            BackHeader(category.title, category.subtitle, onBack)
        }

        item {
            if (category.image != null) {
                PhotoBanner(category.image, category.title, category.subtitle)
            } else {
                SportsBanner()
            }
        }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(category.chips) {
                    AssistChip(onClick = {}, label = { Text(it) })
                }
            }
        }

        item {
            when (category.kind) {
                ResourceKind.Rooms -> CategoryExplanation("Rooms logic", listOf("Capacity matters", "Projector and seating are checked", "Some halls need approval"))
                ResourceKind.Labs -> CategoryExplanation("Lab logic", listOf("Safety rules apply", "Some labs require technician approval", "Equipment must be inspected"))
                ResourceKind.Media -> CategoryExplanation("Media logic", listOf("Kit parts are counted", "Battery state matters", "Pickup and return office are important"))
                ResourceKind.Sports -> CategoryExplanation("Sports logic", listOf("Team size is checked", "Indoor/outdoor rules differ", "Missing items create reports"))
                ResourceKind.Parking -> CategoryExplanation("Parking logic", listOf("Gate and plate number are required", "Visitor access needs approval", "Time limits apply"))
            }
        }

        items(resources) { resource ->
            StudentResourceCard(resource = resource, onClick = { onOpen(resource) })
        }
    }
}

@Composable
private fun StudentResourceDetailsScreen(resource: ResourceUi, onBack: () -> Unit, onBook: () -> Unit, onReport: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { BackHeader(resource.name, resource.location, onBack) }

        item {
            if (resource.image != null) {
                PhotoBanner(resource.image, resource.name, resource.status)
            } else {
                GradientResourceBanner(resource.name, resource.subtitle, resource.color)
            }
        }

        item {
            InfoPanel("What you get", resource.details)
        }

        item {
            InfoPanel("Responsibility rules", resource.rules)
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(
                    onClick = onReport,
                    modifier = Modifier.weight(1f).height(54.dp),
                    shape = RoundedCornerShape(18.dp)
                ) { Text("Report issue") }

                Button(
                    onClick = onBook,
                    modifier = Modifier.weight(1f).height(54.dp),
                    shape = RoundedCornerShape(18.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = resource.color)
                ) { Text("Book now", fontWeight = FontWeight.Black) }
            }
        }
    }
}

@Composable
private fun StudentAvailabilityScreen(resource: ResourceUi, onBack: () -> Unit, onContinue: () -> Unit) {
    var selectedDay by remember { mutableStateOf("Tue") }
    var selectedSlot by remember { mutableStateOf("13:00 - 15:00") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { BackHeader("Availability", resource.name, onBack) }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(listOf("Mon", "Tue", "Wed", "Thu", "Fri")) { day ->
                    SelectPill(day, selectedDay == day, resource.color) { selectedDay = day }
                }
            }
        }

        items(listOf("09:00 - 10:00", "10:00 - 12:00", "13:00 - 15:00", "15:00 - 17:00")) { slot ->
            AvailabilitySlot(
                slot = slot,
                selected = selectedSlot == slot,
                unavailable = slot == "10:00 - 12:00",
                color = resource.color,
                onSelect = { selectedSlot = slot }
            )
        }

        item {
            Button(
                onClick = onContinue,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(18.dp),
                colors = ButtonDefaults.buttonColors(containerColor = resource.color)
            ) { Text("Continue with $selectedDay, $selectedSlot", fontWeight = FontWeight.Black) }
        }
    }
}

@Composable
private fun StudentBookingReviewScreen(resource: ResourceUi, onBack: () -> Unit, onSubmit: () -> Unit) {
    var purpose by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { BackHeader("Confirm booking", "Review request before sending", onBack) }

        item {
            InfoPanel(
                "Booking summary",
                listOf(
                    "Resource: ${resource.name}",
                    "Location: ${resource.location}",
                    "Selected time: Tuesday 13:00 - 15:00",
                    "Current status: ${resource.status}"
                )
            )
        }

        item {
            InputField(
                value = purpose,
                onValueChange = {
                    purpose = it
                    error = ""
                },
                label = "Purpose of booking"
            )
            if (error.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(error, color = UB.Red, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        }

        item {
            InfoPanel("Before submitting", listOf("I will return the resource on time.", "I will report damage or missing items.", "I accept the university usage rules."))
        }

        item {
            Button(
                onClick = {
                    if (purpose.length < 3) error = "Please write a short purpose for this booking." else onSubmit()
                },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(18.dp),
                colors = ButtonDefaults.buttonColors(containerColor = UB.Green)
            ) { Text("Submit booking request", fontWeight = FontWeight.Black) }
        }
    }
}

@Composable
private fun StudentBookingSuccessScreen(onTrack: () -> Unit, onHome: () -> Unit) {
    CenterMessage(
        title = "Booking request sent",
        subtitle = "Your request was added to My Bookings. You can track approval, finish usage, rate the service or report a problem.",
        primary = "Track booking",
        onPrimary = onTrack,
        secondary = "Back home",
        onSecondary = onHome
    )
}

@Composable
private fun StudentMyBookingsScreen(bookings: List<BookingUi>, onOpen: (BookingUi) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item { AppHeader("My Bookings", "Approved, pending and finished requests") }

        items(bookings) { booking ->
            BookingCard(booking, onOpen)
        }
    }
}

@Composable
private fun StudentBookingTrackingScreen(booking: BookingUi, onBack: () -> Unit, onFinish: () -> Unit, onReport: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { BackHeader("Booking Tracking", booking.resource, onBack) }

        item {
            InfoPanel(
                "Booking",
                listOf(
                    "ID: ${booking.id}",
                    "Resource: ${booking.resource}",
                    "Time: ${booking.time}",
                    "Status: ${booking.status}",
                    "Purpose: ${booking.note}"
                )
            )
        }

        item {
            TrackingStep("1", "Submitted", true)
            TrackingStep("2", "Approved / Pending", booking.status != "Rejected")
            TrackingStep("3", "Active usage", booking.status == "Approved")
            TrackingStep("4", "Finished", booking.status == "Finished")
            TrackingStep("5", "Rated", false)
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = onReport, modifier = Modifier.weight(1f).height(54.dp), shape = RoundedCornerShape(18.dp)) {
                    Text("Report")
                }
                Button(onClick = onFinish, modifier = Modifier.weight(1f).height(54.dp), shape = RoundedCornerShape(18.dp), colors = ButtonDefaults.buttonColors(containerColor = UB.Blue)) {
                    Text("Finish", fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun StudentFinishBookingScreen(onBack: () -> Unit, onRate: () -> Unit, onProblem: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { BackHeader("Finish Booking", "Confirm return condition", onBack) }

        item {
            InfoPanel(
                "Final checklist",
                listOf(
                    "I returned all borrowed items.",
                    "The room or equipment is not damaged.",
                    "The door is closed if a room was used.",
                    "I will report any problem before finishing."
                )
            )
        }

        item {
            Button(onClick = onRate, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(18.dp), colors = ButtonDefaults.buttonColors(containerColor = UB.Green)) {
                Text("Everything is fine - rate service", fontWeight = FontWeight.Black)
            }
        }

        item {
            OutlinedButton(onClick = onProblem, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(18.dp)) {
                Text("There is a problem")
            }
        }
    }
}

@Composable
private fun StudentRateExperienceScreen(onBack: () -> Unit, onDone: () -> Unit) {
    var rating by remember { mutableIntStateOf(4) }
    var comment by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { BackHeader("Rate Experience", "Help improve campus services", onBack) }

        item {
            Card(shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(Color.White)) {
                Column(modifier = Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("How was it?", color = UB.Navy, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Spacer(Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (i in 1..5) {
                            Box(
                                modifier = Modifier.size(46.dp).clip(CircleShape).background(if (i <= rating) UB.Blue else UB.Bg).clickable { rating = i },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(i.toString(), color = if (i <= rating) Color.White else UB.Muted, fontWeight = FontWeight.Black)
                            }
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    InputField(comment, { comment = it }, "Optional comment")
                }
            }
        }

        item {
            Button(onClick = onDone, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(18.dp), colors = ButtonDefaults.buttonColors(containerColor = UB.Blue)) {
                Text("Submit rating", fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun StudentReportProblemScreen(resourceName: String, onBack: () -> Unit, onSubmit: (String) -> Unit) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { BackHeader("Report Problem", resourceName, onBack) }

        item {
            InfoPanel(
                "Problem types",
                listOf("Broken equipment", "Missing item", "Dirty room", "Door left open", "Unsafe situation")
            )
        }

        item {
            InputField(title, { title = it; error = "" }, "Problem title")
            Spacer(Modifier.height(10.dp))
            InputField(description, { description = it; error = "" }, "Describe what happened")
            if (error.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(error, color = UB.Red, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        }

        item {
            Button(
                onClick = {
                    if (title.length < 3) error = "Please enter a clear problem title." else onSubmit(title)
                },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(18.dp),
                colors = ButtonDefaults.buttonColors(containerColor = UB.Red)
            ) {
                Text("Send report to staff", fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun StudentReportsScreen(reports: List<ReportUi>, onNew: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item { AppHeader("My Reports", "Problems and maintenance messages") }

        item {
            Button(onClick = onNew, modifier = Modifier.fillMaxWidth().height(54.dp), shape = RoundedCornerShape(18.dp), colors = ButtonDefaults.buttonColors(containerColor = UB.Blue)) {
                Text("Create new report", fontWeight = FontWeight.Black)
            }
        }

        items(reports) {
            ReportCard(it)
        }
    }
}

@Composable
private fun StudentWarningsScreen(onBack: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item { BackHeader("Warnings Center", "Responsibility and rule notices", onBack) }

        item {
            WarningCard("Late return notice", "A media kit was returned 32 minutes late.", "Medium", UB.Orange)
        }

        item {
            WarningCard("Room condition notice", "A study room needed cleaning after use.", "Low", UB.Blue)
        }

        item {
            InfoPanel("What this means", listOf("Warnings help protect shared university resources.", "You may reply to staff if you disagree.", "Repeated serious issues may limit booking access."))
        }
    }
}

@Composable
private fun StudentHelpScreen(onBack: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item { BackHeader("Help Center", "Login, booking, rules and emergency support", onBack) }

        item {
            FAQCard("I cannot sign in", "Check your university email and password. If the problem continues, contact support.")
        }

        item {
            FAQCard("Why is my booking pending?", "Some rooms, labs and visitor access requests need staff approval.")
        }

        item {
            FAQCard("What if equipment is broken?", "Use Report Problem from the booking or resource details page.")
        }

        item {
            InfoPanel("Emergency cases", listOf("Door left open", "Unsafe laboratory situation", "Broken electrical equipment", "Missing important item"))
        }
    }
}

@Composable
private fun StudentProfileScreen(
    onWarnings: () -> Unit,
    onReports: () -> Unit,
    onHelp: () -> Unit,
    onLogout: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { AppHeader("Profile", "Student account and responsibility") }

        item {
            Card(shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(Color.White)) {
                Row(modifier = Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(66.dp).clip(CircleShape).background(UB.Blue), contentAlignment = Alignment.Center) {
                        Text("Y", color = Color.White, fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineMedium)
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text("University Student", color = UB.Navy, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
                        Text("Verified student account", color = UB.Muted)
                        Text("Booking permission: enabled", color = UB.Green, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        item { ProfileAction("My reports", "Problems sent to staff and technicians", onReports) }
        item { ProfileAction("Warnings center", "Responsibility records and notices", onWarnings) }
        item { ProfileAction("Help center", "Login, booking and support", onHelp) }
        item { ProfileAction("Log out", "Return to the sign-in screen", onLogout) }
    }
}

@Composable
private fun AuthFrame(
    title: String,
    subtitle: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(modifier = Modifier.fillMaxSize().background(UB.Bg)) {
        Image(
            painter = painterResource(IMG_CAMPUS),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        Box(modifier = Modifier.fillMaxSize().background(Color.White.copy(alpha = 0.84f)))

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.Center
        ) {
            item {
                Card(shape = RoundedCornerShape(32.dp), colors = CardDefaults.cardColors(Color.White)) {
                    Column(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(modifier = Modifier.size(70.dp).clip(RoundedCornerShape(22.dp)).background(UB.Blue), contentAlignment = Alignment.Center) {
                            Text("UB", color = Color.White, fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineMedium)
                        }
                        Spacer(Modifier.height(18.dp))
                        Text(title, color = UB.Navy, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                        Spacer(Modifier.height(6.dp))
                        Text(subtitle, color = UB.Muted, textAlign = TextAlign.Center)
                        Spacer(Modifier.height(22.dp))
                        content()
                    }
                }
            }
        }
    }
}

@Composable
private fun InputField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false
) {
    TextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(label) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        singleLine = !label.lowercase().contains("describe"),
        visualTransformation = if (isPassword) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        colors = TextFieldDefaults.colors(
            focusedContainerColor = UB.Bg,
            unfocusedContainerColor = UB.Bg,
            focusedIndicatorColor = Color.Transparent,
            unfocusedIndicatorColor = Color.Transparent
        )
    )
}

@Composable
private fun AppHeader(title: String, subtitle: String) {
    Column(modifier = Modifier.fillMaxWidth().statusBarsPadding()) {
        Text(title, color = UB.Navy, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
        Text(subtitle, color = UB.Muted)
    }
}

@Composable
private fun BackHeader(title: String, subtitle: String, onBack: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().statusBarsPadding(), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(44.dp).clip(CircleShape).background(Color.White).clickable { onBack() }, contentAlignment = Alignment.Center) {
            Text("<", color = UB.Navy, fontWeight = FontWeight.Black)
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = UB.Navy, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            Text(subtitle, color = UB.Muted, fontSize = 13.sp)
        }
    }
}

@Composable
private fun HomeHeroCard(onBookings: () -> Unit, onWarnings: () -> Unit) {
    Card(shape = RoundedCornerShape(32.dp), colors = CardDefaults.cardColors(UB.Navy)) {
        Box {
            Image(painter = painterResource(IMG_CAMPUS), contentDescription = null, modifier = Modifier.fillMaxWidth().height(205.dp), contentScale = ContentScale.Crop)
            Box(modifier = Modifier.matchParentSize().background(Brush.horizontalGradient(listOf(UB.Navy.copy(alpha = 0.96f), UB.Blue.copy(alpha = 0.45f)))))
            Column(modifier = Modifier.padding(22.dp)) {
                Text("Student booking hub", color = Color.White.copy(alpha = 0.82f), fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text("Reserve what you need without double booking or confusion.", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    HeroButton("My bookings", onBookings)
                    HeroButton("Warnings", onWarnings)
                }
            }
        }
    }
}

@Composable
private fun HeroButton(text: String, onClick: () -> Unit) {
    Text(
        text,
        color = Color.White,
        fontWeight = FontWeight.Black,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.18f)).clickable { onClick() }.padding(horizontal = 14.dp, vertical = 9.dp)
    )
}

@Composable
private fun HomeMiniTile(title: String, value: String, color: Color, modifier: Modifier, onClick: () -> Unit) {
    Card(modifier = modifier.height(106.dp).clickable { onClick() }, shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(Color.White)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(value, color = color, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(4.dp))
            Text(title, color = UB.Navy, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun SectionTitle(title: String, subtitle: String) {
    Column {
        Text(title, color = UB.Navy, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
        Text(subtitle, color = UB.Muted)
    }
}

@Composable
private fun StudentCategoryCard(category: CategoryUi, onClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().height(158.dp).clickable { onClick() }, shape = RoundedCornerShape(30.dp), colors = CardDefaults.cardColors(Color.White)) {
        Box {
            if (category.image != null) {
                Image(painter = painterResource(category.image), contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                Box(modifier = Modifier.matchParentSize().background(Brush.horizontalGradient(listOf(Color.Black.copy(alpha = 0.72f), Color.Transparent))))
            } else {
                Box(modifier = Modifier.fillMaxSize().background(Brush.linearGradient(listOf(category.color, UB.BlueDark))))
            }
            Column(modifier = Modifier.align(Alignment.BottomStart).padding(18.dp)) {
                Text(category.title, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text(category.subtitle, color = Color.White.copy(alpha = 0.86f), fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun PhotoBanner(image: Int, title: String, subtitle: String) {
    Card(modifier = Modifier.fillMaxWidth().height(210.dp), shape = RoundedCornerShape(30.dp), colors = CardDefaults.cardColors(Color.White)) {
        Box {
            Image(painter = painterResource(image), contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            Box(modifier = Modifier.matchParentSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.76f)))))
            Column(modifier = Modifier.align(Alignment.BottomStart).padding(18.dp)) {
                Text(title, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text(subtitle, color = Color.White.copy(alpha = 0.88f))
            }
        }
    }
}

@Composable
private fun SportsBanner() {
    Card(modifier = Modifier.fillMaxWidth().height(210.dp), shape = RoundedCornerShape(30.dp), colors = CardDefaults.cardColors(UB.Green)) {
        Box(modifier = Modifier.fillMaxSize().background(Brush.linearGradient(listOf(UB.Green, UB.BlueDark)))) {
            Column(modifier = Modifier.align(Alignment.Center).padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("SPORTS", color = Color.White.copy(alpha = 0.76f), fontWeight = FontWeight.Black, letterSpacing = 3.sp)
                Spacer(Modifier.height(8.dp))
                Text("Equipment and activity slots", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
                Spacer(Modifier.height(8.dp))
                Text("Football, gym, indoor and outdoor campus activities.", color = Color.White.copy(alpha = 0.88f), textAlign = TextAlign.Center)
            }
        }
    }
}

@Composable
private fun GradientResourceBanner(title: String, subtitle: String, color: Color) {
    Card(modifier = Modifier.fillMaxWidth().height(210.dp), shape = RoundedCornerShape(30.dp), colors = CardDefaults.cardColors(color)) {
        Box(modifier = Modifier.fillMaxSize().background(Brush.linearGradient(listOf(color, UB.BlueDark)))) {
            Column(modifier = Modifier.align(Alignment.BottomStart).padding(20.dp)) {
                Text(title, color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                Text(subtitle, color = Color.White.copy(alpha = 0.88f))
            }
        }
    }
}

@Composable
private fun CategoryExplanation(title: String, points: List<String>) {
    InfoPanel(title, points)
}

@Composable
private fun StudentResourceCard(resource: ResourceUi, onClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable { onClick() }, shape = RoundedCornerShape(26.dp), colors = CardDefaults.cardColors(Color.White)) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            if (resource.image != null) {
                Image(painter = painterResource(resource.image), contentDescription = null, modifier = Modifier.size(92.dp).clip(RoundedCornerShape(22.dp)), contentScale = ContentScale.Crop)
            } else {
                Box(modifier = Modifier.size(92.dp).clip(RoundedCornerShape(22.dp)).background(Brush.linearGradient(listOf(resource.color, UB.BlueDark))), contentAlignment = Alignment.Center) {
                    Text(resource.kind.name.take(1), color = Color.White, fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineMedium)
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(resource.name, color = UB.Navy, fontWeight = FontWeight.Black)
                Text(resource.subtitle, color = UB.Muted, fontSize = 13.sp)
                Spacer(Modifier.height(6.dp))
                StatusPill(resource.status, resource.color)
            }
        }
    }
}

@Composable
private fun StatusPill(text: String, color: Color) {
    Text(
        text,
        color = color,
        fontSize = 12.sp,
        fontWeight = FontWeight.Black,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(color.copy(alpha = 0.12f)).padding(horizontal = 10.dp, vertical = 5.dp)
    )
}

@Composable
private fun SelectPill(text: String, selected: Boolean, color: Color, onClick: () -> Unit) {
    Text(
        text,
        color = if (selected) Color.White else UB.Navy,
        fontWeight = FontWeight.Black,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (selected) color else Color.White).clickable { onClick() }.padding(horizontal = 18.dp, vertical = 12.dp)
    )
}

@Composable
private fun AvailabilitySlot(slot: String, selected: Boolean, unavailable: Boolean, color: Color, onSelect: () -> Unit) {
    val c = if (unavailable) UB.Red else if (selected) color else UB.Green
    Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(Color.White), modifier = Modifier.clickable(enabled = !unavailable) { onSelect() }) {
        Row(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(c))
            Spacer(Modifier.width(12.dp))
            Text(slot, color = UB.Navy, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Text(if (unavailable) "Booked" else if (selected) "Selected" else "Available", color = c, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun InfoPanel(title: String, lines: List<String>) {
    Card(shape = RoundedCornerShape(26.dp), colors = CardDefaults.cardColors(Color.White)) {
        Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
            Text(title, color = UB.Navy, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(12.dp))
            lines.forEach {
                Text("• $it", color = UB.Muted, modifier = Modifier.padding(bottom = 7.dp))
            }
        }
    }
}

@Composable
private fun CenterMessage(title: String, subtitle: String, primary: String, onPrimary: () -> Unit, secondary: String, onSecondary: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Box(modifier = Modifier.size(92.dp).clip(CircleShape).background(UB.Green), contentAlignment = Alignment.Center) {
            Text("OK", color = Color.White, fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineMedium)
        }
        Spacer(Modifier.height(22.dp))
        Text(title, color = UB.Navy, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Text(subtitle, color = UB.Muted, textAlign = TextAlign.Center)
        Spacer(Modifier.height(24.dp))
        Button(onClick = onPrimary, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(18.dp), colors = ButtonDefaults.buttonColors(containerColor = UB.Blue)) {
            Text(primary, fontWeight = FontWeight.Black)
        }
        TextButton(onClick = onSecondary) { Text(secondary) }
    }
}

@Composable
private fun BookingCard(booking: BookingUi, onOpen: (BookingUi) -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable { onOpen(booking) }, shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(Color.White)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(booking.resource, color = UB.Navy, fontWeight = FontWeight.Black)
                    Text(booking.time, color = UB.Muted, fontSize = 13.sp)
                    Text(booking.note, color = UB.Muted, fontSize = 13.sp)
                }
                StatusPill(booking.status, when (booking.status) {
                    "Approved" -> UB.Green
                    "Pending" -> UB.Orange
                    "Finished" -> UB.Blue
                    else -> UB.Red
                })
            }
        }
    }
}

@Composable
private fun TrackingStep(number: String, title: String, done: Boolean) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(38.dp).clip(CircleShape).background(if (done) UB.Green else UB.Line), contentAlignment = Alignment.Center) {
            Text(number, color = if (done) Color.White else UB.Muted, fontWeight = FontWeight.Black)
        }
        Spacer(Modifier.width(12.dp))
        Text(title, color = UB.Navy, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ReportCard(report: ReportUi) {
    Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(Color.White)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(report.title, color = UB.Navy, fontWeight = FontWeight.Black)
            Text("${report.resource} • ${report.date}", color = UB.Muted, fontSize = 13.sp)
            Spacer(Modifier.height(8.dp))
            StatusPill(report.status, UB.Blue)
        }
    }
}

@Composable
private fun WarningCard(title: String, details: String, level: String, color: Color) {
    Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(Color.White)) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(color), contentAlignment = Alignment.Center) {
                Text("!", color = Color.White, fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, color = UB.Navy, fontWeight = FontWeight.Black)
                Text(details, color = UB.Muted, fontSize = 13.sp)
                Text(level, color = color, fontWeight = FontWeight.Black, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun FAQCard(question: String, answer: String) {
    Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(Color.White)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(question, color = UB.Navy, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(6.dp))
            Text(answer, color = UB.Muted, fontSize = 13.sp)
        }
    }
}

@Composable
private fun ProfileAction(title: String, subtitle: String, onClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable { onClick() }, shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(Color.White)) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, color = UB.Navy, fontWeight = FontWeight.Black)
                Text(subtitle, color = UB.Muted, fontSize = 13.sp)
            }
            Text(">", color = UB.Blue, fontWeight = FontWeight.Black)
        }
    }
}

@Preview(name = "V9 Student App", showBackground = true, widthDp = 390, heightDp = 844)
@Composable
private fun PreviewV9StudentApp() {
    UbCampusBookingApp()
}




