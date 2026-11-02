# Product usage data

Botki sends no product usage events. The analytics sink keeps the upstream interface and drops
every event, so a self-hosted install never phones home. Local observability (file logs, the
event-loop monitor, and OTLP export you configure yourself) is unchanged.

## Mobile app crash reports

The mobile app's crash reporting is still upstream's and is the one path in this fork that
sends anything off the device. When the iOS or Android app crashes or hits an error, it sends a
report: the error message, the stack trace, the app version, and the device model and OS version,
keyed by a random per-install ID. Reports go to the OpenTelemetry receiver configured in the app
build, which defaults to upstream's hosted dataset. They do not include your threads, prompts, or
connection details, but an error message can quote a value the app was handling.

The mobile cloud surface, this included, is scheduled to be cut (TS9). Until then it is opt-out:
turn off **Send crash reports** in **Settings → About → Diagnostics**. The web and desktop clients
send nothing; there is no switch for them because there is nothing to switch.

To stop sending them, turn off **Send crash reports** in **Settings > About T3 Code > Diagnostics**.

## Export diagnostics to your own receiver

To send traces, metrics, or logs to an OpenTelemetry receiver, open
**Settings > Maintenance > Diagnostics**, select an environment, and enter each signal's OTLP HTTP
endpoint under **OpenTelemetry export** (for example `http://localhost:4318/v1/traces`). Save, then
restart that environment's server. The receiver must be reachable from the server's machine.
**Test** sends an empty export from the server to check an endpoint before or after you save it;
saved endpoints are checked when the section opens. Checks send authentication headers only to
the signal's currently running endpoint and do not follow redirects. To check a new endpoint
that requires authentication, save it and restart the server first.

`T3CODE_OTLP_*_URL` and standard `OTEL_EXPORTER_OTLP_*` environment variables override the saved
settings. An overridden signal shows **Set by environment** and names the variable that set it, and its
**Test** checks the running endpoint instead of the field. For endpoints saved here or set with `T3CODE_OTLP_*_URL`, set `T3CODE_OTLP_HEADERS` for
receivers that need authentication and `T3CODE_OTLP_PROTOCOL=http/protobuf` for receivers that do
not accept JSON. An endpoint set with `OTEL_EXPORTER_OTLP_*` takes its headers and protocol from
`OTEL_EXPORTER_OTLP_HEADERS` and `OTEL_EXPORTER_OTLP_PROTOCOL` instead.
