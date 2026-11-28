package app.rutina.feature.connection.data

import android.util.JsonReader
import android.util.JsonToken
import android.util.MalformedJsonException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.EOFException
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URI

private const val CONNECTION_TIMEOUT_MILLIS = 5000
private const val READ_TIMEOUT_MILLIS = 5000

sealed interface HealthResult {
    data object Connected : HealthResult

    data object ServerUnreachable : HealthResult

    data object UnexpectedResponse : HealthResult

    data class ApiError(
        val error: HealthApiError,
    ) : HealthResult
}

enum class HealthApiError(
    val statusCode: Int,
    val wireCode: String,
) {
    DATABASE_UNAVAILABLE(HttpURLConnection.HTTP_UNAVAILABLE, "database_unavailable"),
    INTERNAL_ERROR(HttpURLConnection.HTTP_INTERNAL_ERROR, "internal_error"),
}

internal fun classifyHealthError(
    statusCode: Int,
    wireCode: String?,
): HealthResult {
    val error = HealthApiError.entries.firstOrNull { it.statusCode == statusCode && it.wireCode == wireCode }
    return if (error == null) HealthResult.UnexpectedResponse else HealthResult.ApiError(error)
}

class ConnectionHealthClient(
    apiBaseUrl: String,
) {
    private val healthUrl = URI("$apiBaseUrl/health").toURL()

    suspend fun check(): HealthResult =
        withContext(Dispatchers.IO) {
            try {
                val connection = healthUrl.openConnection() as HttpURLConnection
                try {
                    connection.connectTimeout = CONNECTION_TIMEOUT_MILLIS
                    connection.readTimeout = READ_TIMEOUT_MILLIS
                    connection.instanceFollowRedirects = false
                    connection.useCaches = false
                    val statusCode = connection.responseCode
                    if (statusCode == HttpURLConnection.HTTP_NO_CONTENT) {
                        HealthResult.Connected
                    } else {
                        val contentType = connection.contentType?.substringBefore(';')?.trim()
                        val code =
                            if (contentType.equals("application/json", ignoreCase = true) &&
                                HealthApiError.entries.any { it.statusCode == statusCode }
                            ) {
                                readErrorCode(connection)
                            } else {
                                null
                            }
                        classifyHealthError(statusCode, code)
                    }
                } finally {
                    connection.disconnect()
                }
            } catch (_: IOException) {
                HealthResult.ServerUnreachable
            }
        }

    private fun readErrorCode(connection: HttpURLConnection): String? {
        val body = connection.errorStream ?: return null
        return try {
            JsonReader(body.bufferedReader()).use { reader ->
                if (reader.peek() != JsonToken.BEGIN_OBJECT) return null
                reader.beginObject()
                var code: String? = null
                while (reader.hasNext()) {
                    when {
                        reader.nextName() != "code" -> reader.skipValue()
                        code != null || reader.peek() != JsonToken.STRING -> return null
                        else -> code = reader.nextString()
                    }
                }
                reader.endObject()
                code.takeIf { reader.peek() == JsonToken.END_DOCUMENT }
            }
        } catch (_: MalformedJsonException) {
            null
        } catch (_: EOFException) {
            null
        }
    }
}
