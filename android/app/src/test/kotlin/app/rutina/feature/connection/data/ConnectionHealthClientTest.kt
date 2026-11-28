package app.rutina.feature.connection.data

import org.junit.Assert.assertEquals
import org.junit.Test

class ConnectionHealthClientTest {
    @Test
    fun recognizesBothCodesFromTheHealthContract() {
        assertEquals(
            HealthResult.ApiError(HealthApiError.DATABASE_UNAVAILABLE),
            classifyHealthError(503, "database_unavailable"),
        )
        assertEquals(
            HealthResult.ApiError(HealthApiError.INTERNAL_ERROR),
            classifyHealthError(500, "internal_error"),
        )
    }

    @Test
    fun rejectsMissingUnknownOrMismatchedCodes() {
        assertEquals(HealthResult.UnexpectedResponse, classifyHealthError(503, null))
        assertEquals(HealthResult.UnexpectedResponse, classifyHealthError(503, "unknown_error"))
        assertEquals(HealthResult.UnexpectedResponse, classifyHealthError(503, "internal_error"))
        assertEquals(HealthResult.UnexpectedResponse, classifyHealthError(502, "database_unavailable"))
    }
}
