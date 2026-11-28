package app.rutina.feature.connection.ui

import app.rutina.feature.connection.data.HealthApiError
import app.rutina.feature.connection.data.HealthResult
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ConnectionViewModelTest {
    @Before
    fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun secondTapWhileCheckingDoesNotSendAnotherRequestAndFailureCanBeRetried() =
        runTest {
            val firstResult = CompletableDeferred<HealthResult>()
            var requestsSent = 0
            val viewModel =
                ConnectionViewModel {
                    requestsSent += 1
                    if (requestsSent == 1) firstResult.await() else HealthResult.Connected
                }

            assertEquals(ConnectionState.READY, viewModel.state.value)
            viewModel.checkConnection()
            viewModel.checkConnection()
            runCurrent()
            assertEquals(ConnectionState.CHECKING, viewModel.state.value)
            assertEquals(1, requestsSent)

            firstResult.complete(HealthResult.ServerUnreachable)
            runCurrent()
            assertEquals(ConnectionState.SERVER_UNREACHABLE, viewModel.state.value)

            viewModel.checkConnection()
            runCurrent()
            assertEquals(ConnectionState.CONNECTED, viewModel.state.value)
            assertEquals(2, requestsSent)
        }

    @Test
    fun apiErrorIsShownAsSeparateState() =
        runTest {
            val viewModel = ConnectionViewModel { HealthResult.ApiError(HealthApiError.INTERNAL_ERROR) }

            viewModel.checkConnection()
            runCurrent()

            assertEquals(ConnectionState.API_ERROR, viewModel.state.value)
        }
}
