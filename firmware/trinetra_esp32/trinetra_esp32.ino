#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "DHT.h"
#include <time.h>
#include "config.h"

// ─────────────────────────────────────────────────────────────────
//  Trinetra sensor node — posts readings to Supabase PostgREST
//  over HTTPS (no GPS: station coordinates are fixed server-side).
// ─────────────────────────────────────────────────────────────────

// All configuration loaded from config.h (gitignored)
// See config.h for WiFi, Supabase, Station ID, Pins, Timing, NTP

DHT dht(DHTPIN, DHTTYPE);

unsigned long previousMillis = 0;  // interval timer for the last sample

String buildJson(float temp, float hum, int mq135, float dust) {
  time_t now = time(nullptr);
  struct tm tmv;
  // UTC (not localtime): the "Z" suffix below means Zulu/UTC. Using
  // localtime_r here would stamp IST readings as UTC and push them 5:30
  // into the future, breaking time-series ordering and the LSTM window.
  gmtime_r(&now, &tmv);
  char ts[32];
  if (now > 1000000) {
    strftime(ts, sizeof(ts), "%Y-%m-%dT%H:%M:%SZ", &tmv);
  } else {
    strcpy(ts, "");
  }
  String json = "{";
  json += "\"station_id\":\"" + String(STATION_ID) + "\",";
  json += "\"temperature\":" + String(temp, 1) + ",";
  json += "\"humidity\":"   + String(hum, 1)   + ",";
  json += "\"mq135_raw\":"  + String(mq135)    + ",";
  json += "\"dust_density\":" + String(dust, 1);
  if (ts[0] != '\0') {
    json += ",\"recorded_at\":\"" + String(ts) + "\"";
  }
  json += "}";
  return json;
}

void sendToSupabase(float temp, float hum, int mq135, float dust) {
  WiFiClientSecure client;
  client.setInsecure();

  String url = String(SUPABASE_URL) + "/rest/v1/" + SUPABASE_TABLE;
  String payload = buildJson(temp, hum, mq135, dust);
  Serial.println("POST " + url);
  Serial.println(payload);

  // Up to 2 attempts, each with a fresh HTTP session. A single failed POST
  // would otherwise silently drop a reading.
  int code = -1;
  for (int attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) {
      Serial.println("Retrying POST...");
      delay(1000);
      if (WiFi.status() != WL_CONNECTED) connectWifi();
    }

    HTTPClient http;
    http.setTimeout(10000);
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

    if (!http.begin(client, url)) {
      Serial.println("Unable to connect to Supabase endpoint");
      continue;
    }

    http.addHeader("apikey", SUPABASE_ANON_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Prefer", "return=minimal");

    code = http.POST(payload);

    if (code > 0) {
      Serial.print("Supabase response: ");
      Serial.println(code);
      if (code == 201) {
        Serial.println("Reading stored ✔");
      } else {
        Serial.println(http.getString());
      }
    } else {
      Serial.print("POST failed: ");
      Serial.println(http.errorToString(code).c_str());
    }

    http.end();

    if (code == 201) return;   // stored
    if (code >= 400 && code < 500) return;  // 4xx = our request is wrong; retrying won't help
  }
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected to Wi-Fi network!");
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET, NTP_SERVER);
  } else {
    Serial.println("\nWi-Fi connection failed — will retry in loop");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  dht.begin();
  pinMode(DUST_LED_PIN, OUTPUT);
  digitalWrite(DUST_LED_PIN, HIGH);
  analogSetPinAttenuation(DUST_VO_PIN, ADC_11db);
  analogSetPinAttenuation(MQ135_PIN, ADC_11db);

  connectWifi();
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= INTERVAL_MS) {
    previousMillis = currentMillis;

    if (WiFi.status() != WL_CONNECTED) {
      connectWifi();
    }

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Failed to read from DHT sensor!");
      humidity = 0.0;
      temperature = 0.0;
    }

    int mq135Raw = analogRead(MQ135_PIN);

    digitalWrite(DUST_LED_PIN, LOW);
    delayMicroseconds(210);
    int dustRaw = analogRead(DUST_VO_PIN);
    delayMicroseconds(40);
    digitalWrite(DUST_LED_PIN, HIGH);
    delayMicroseconds(9680);

    float dustVoltage = (dustRaw / 4095.0) * 3.3;
    float dustDensity = 0.0;
    if (dustVoltage > NO_DUST_VOLTAGE) {
      dustDensity = (dustVoltage - NO_DUST_VOLTAGE) * 200.0;
    }

    Serial.println("-----------------------------------");
    Serial.print("Temp: "); Serial.print(temperature); Serial.println(" °C");
    Serial.print("Hum:  "); Serial.print(humidity); Serial.println(" %");
    Serial.print("MQ135 Raw: "); Serial.println(mq135Raw);
    Serial.print("Dust Density: "); Serial.print(dustDensity); Serial.println(" ug/m3");

    sendToSupabase(temperature, humidity, mq135Raw, dustDensity);
  }
}
