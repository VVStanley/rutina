package app.rutina.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import app.rutina.BuildConfig
import app.rutina.feature.connection.data.ConnectionHealthClient
import app.rutina.feature.connection.ui.ConnectionScreen
import app.rutina.feature.connection.ui.ConnectionViewModel

class MainActivity : ComponentActivity() {
    private val connectionViewModel: ConnectionViewModel by viewModels {
        ConnectionViewModel.factory(ConnectionHealthClient(BuildConfig.API_BASE_URL)::check)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { ConnectionScreen(connectionViewModel) }
    }
}
