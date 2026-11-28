package app.rutina.feature.connection.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import app.rutina.feature.connection.data.HealthResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class ConnectionState {
    READY,
    CHECKING,
    CONNECTED,
    SERVER_UNREACHABLE,
    API_ERROR,
}

class ConnectionViewModel(
    private val checkHealth: suspend () -> HealthResult,
) : ViewModel() {
    private val mutableState = MutableStateFlow(ConnectionState.READY)
    val state: StateFlow<ConnectionState> = mutableState.asStateFlow()

    fun checkConnection() {
        if (mutableState.value == ConnectionState.CHECKING) return

        mutableState.value = ConnectionState.CHECKING
        viewModelScope.launch {
            mutableState.value =
                when (checkHealth()) {
                    HealthResult.Connected -> ConnectionState.CONNECTED
                    HealthResult.ServerUnreachable -> ConnectionState.SERVER_UNREACHABLE
                    is HealthResult.ApiError, HealthResult.UnexpectedResponse -> ConnectionState.API_ERROR
                }
        }
    }

    companion object {
        fun factory(checkHealth: suspend () -> HealthResult): ViewModelProvider.Factory =
            viewModelFactory { initializer { ConnectionViewModel(checkHealth) } }
    }
}
