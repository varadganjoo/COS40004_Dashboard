#include <Adafruit_BME680.h>
#include <ArduinoJson.h>
#include <ArduinoJson.hpp>
#include <ArduinoMqttClient.h>
#include <Wire.h>
#include <WiFi.h>
#include <EEPROM.h>
#include <RTClib.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_GPS.h>
#define UID_ADDRESS 0xFC  // Unique identifier address
#define SSID_LENGTH 32
#define PASSWORD_LENGTH 63
#define EEPROM_ADDR 0x50  // I2C address of the 24AA025UID EEPROM
const int SSID_ADDR = 1;
const int PASSWORD_ADDR = 34;
#define DIGITAL_SENSOR_1_ADDR 100
#define DIGITAL_SENSOR_2_ADDR 101
#define DIGITAL_SENSOR_3_ADDR 102
#define ANALOG_SENSOR_1_ADDR 103
#define ANALOG_SENSOR_2_ADDR 104
#define ANALOG_SENSOR_3_ADDR 105
#define I2C_SENSOR_1_ADDR 106
#define I2C_SENSOR_1_name_ADDR 107
#define MQTT_ADDRESS 108
#define SETUP_FLAG_ADDR  99
#define RTC_ADDRESS 0x68
Adafruit_BME680 bme;
#define THERMISTORNOMINAL 9900
#define BCOEFFICIENT 3435  // K value
#define TEMPERATURENOMINAL 25

#define SEALEVELPRESSURE_HPA (1013.25)
Adafruit_GPS GPS(&Wire);
Adafruit_MPU6050 mpu;
RTC_DS1307 rtc;
WiFiClient wifiClient;
MqttClient mqttClient(wifiClient);

char broker[64];
int port = 1883;
const char topic[] = "SENSOR/READ";

const long interval = 1000;
unsigned long previousMillis = 0;
const size_t JSON_DOC_SIZE = JSON_OBJECT_SIZE(2) + JSON_ARRAY_SIZE(7) + 200;
String digital_sensor_1_name;
String digital_sensor_2_name;
String digital_sensor_3_name;

String analog_sensor_1_name;
String analog_sensor_2_name;
String analog_sensor_3_name;
String i2c_sensor_1_name;

bool digital_sensor_1_enabled;
bool digital_sensor_2_enabled;
bool digital_sensor_3_enabled;
bool analog_sensor_1_enabled;
bool analog_sensor_2_enabled;
bool analog_sensor_3_enabled;
bool i2c_sensor_1_enabled;


JsonArray i2c_sensor_1_values_array;
JsonArray digital_sensor_1_values_array;
JsonArray digital_sensor_2_values_array;
JsonArray digital_sensor_3_values_array;
JsonArray  analog_sensor_1_values_array;
JsonArray analog_sensor_2_values_array;
JsonArray analog_sensor_3_values_array;

String ssid;
String password;

// Define the JSON document
StaticJsonDocument<JSON_DOC_SIZE> doc;
double sensorVal = 0;  // Set the initial sensor value to zero
double sensorSum = 0;  // Set the initial sensor sum to zero
int digital_sensor_1_value;
int digital_sensor_2_value;
int digital_sensor_3_value;
double analog_sensor_1_value;
double analog_sensor_2_value;
double analog_sensor_3_value;
int i2c_sensor_1_values[3];
byte uid[8];
int dig1pin = 2;
int dig2pin = 3;
int dig3pin = 4;
double sensorAvg;
int an1pin = 26;
int an2pin = 27;
int anThermpin = 28;
String user_input;
bool my_bool;
char uidString[17];
unsigned long startTime = 0;    // Set the initial start time to zero
unsigned long currentTime = 0;  // Set the initial current time to zero
double temp;
double humid;
double Pressure;
double gas;
double Acceleration_X;
double Acceleration_Y;
double Acceleration_Z;
double Rotation_X;
double Rotation_Y;
double Rotation_Z;
double Longitude;
double Latitude;

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
  while (!Serial) {
    digitalWrite(LED_BUILTIN, HIGH);  // turn the LED off by making the voltage LOW
    delay(1000);                      // wait for serial port to connect. Needed for native USB port only
  }
  Wire.setSDA(20);
  Wire.setSCL(21);
  Wire1.setSDA(18);
  Wire1.setSCL(19);

  Wire1.begin();  // Initialize I2C communication


  read24AA025UID(uid);

  sprintf(uidString, "%02X%02X%02X%02X%02X%02X%02X%02X", uid[0], uid[1], uid[2], uid[3], uid[4], uid[5], uid[6], uid[7]);
  Serial.println("uidString");
  Serial.println(uidString);

  Serial.println("uid read");



  wifisetup();







  Serial.print("Attempting to connect to the MQTT broker: ");
  Serial.println(broker);

  if (!mqttClient.connect(broker, port)) {
    Serial.print("MQTT connection failed! Error code = ");
    Serial.println(mqttClient.connectError());

    while (1)
      ;
  }

  mqttClient.subscribe(topic);

 resetBoard();


  Serial.println("You're connected to the MQTT broker!");
  Serial.println();

}
void loop() {

  Serial.println("loopstart");
  mqttClient.poll();
  sensorcheck();
  serialize();
}
//checks sensor values if they are enabled
void sensorcheck() {

  if (analog_sensor_1_enabled) {
    Analogue1();
  }
  if (analog_sensor_2_enabled) {
    Analogue2();
  }
  if (digital_sensor_1_enabled) {
    Digital1();
  }
  if (digital_sensor_2_enabled) {
    Digital2();
  }
  if (digital_sensor_3_enabled) {
    Digital3();
  }
  if (i2c_sensor_1_enabled) {
    Serial.println("I2c read");
     I2C();
  }
  if (analog_sensor_3_enabled) {
    Serial.println("Thermistor read");
    AnalogueTherm();
  }

}
//reads wifi ssid , password and MQTT out of Memory
void wificonnect() {
  // Read the SSID from EEPROM
  ssid = "";
  int i = 0;
  char ch;
  do {
    Wire1.beginTransmission(EEPROM_ADDR);
    Wire1.write(SSID_ADDR + i);
    Wire1.endTransmission();
    Wire1.requestFrom(EEPROM_ADDR, 1);
    if (Wire1.available()) {
      ch = Wire1.read();
      if (ch != '\0') ssid += ch;
    }
    i++;
  } while (ch != '\0' && i < 32);

  // Read the password from EEPROM
  password = "";
  i = 0;
  do {
    Wire1.beginTransmission(EEPROM_ADDR);
    Wire1.write(PASSWORD_ADDR + i);
    Wire1.endTransmission();
    Wire1.requestFrom(EEPROM_ADDR, 1);
    if (Wire1.available()) {
      ch = Wire1.read();
      if (ch != '\0') password += ch;
    }
    i++;
  } while (ch != '\0' && i < 32);

  // Connect to Wi-Fi
  WiFi.begin(ssid.c_str(), password.c_str());

  Serial.print("Connecting to ");
  Serial.println(ssid);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\nConnected to Wi-Fi");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
    String mqttAddress = "";
  i = 0;
 
  do {
    Wire1.beginTransmission(EEPROM_ADDR);
    Wire1.write(MQTT_ADDRESS + i);
    Wire1.endTransmission();
    Wire1.requestFrom(EEPROM_ADDR, 1);
    if (Wire1.available()) {
      ch = Wire1.read();
      if (ch != '\0') mqttAddress += ch;
    }
    i++;
  } while (ch != '\0');

  // Store the MQTT address in the 'broker' variable
  strcpy(broker, mqttAddress.c_str());

}
//check which sensors have been enabled in memory
void checkSensorsEnabled() {
  Wire1.beginTransmission(EEPROM_ADDR);

  Wire1.write(DIGITAL_SENSOR_1_ADDR);
  Wire1.endTransmission();
  Wire1.requestFrom(EEPROM_ADDR, 1);
  digital_sensor_1_enabled = Wire1.read();

  Wire1.write(DIGITAL_SENSOR_2_ADDR);
  Wire1.endTransmission();
  Wire1.requestFrom(EEPROM_ADDR, 1);
  digital_sensor_2_enabled = Wire1.read();

  Wire1.write(DIGITAL_SENSOR_3_ADDR);
  Wire1.endTransmission();
  Wire1.requestFrom(EEPROM_ADDR, 1);
  digital_sensor_3_enabled = Wire1.read();

  Wire1.write(ANALOG_SENSOR_1_ADDR);
  Wire1.endTransmission();
  Wire1.requestFrom(EEPROM_ADDR, 1);
  analog_sensor_1_enabled = Wire1.read();

  Wire1.write(ANALOG_SENSOR_2_ADDR);
  Wire1.endTransmission();
  Wire1.requestFrom(EEPROM_ADDR, 1);
  analog_sensor_2_enabled = Wire1.read();

  Wire1.write(ANALOG_SENSOR_3_ADDR);
  Wire1.endTransmission();
  Wire1.requestFrom(EEPROM_ADDR, 1);
  analog_sensor_3_enabled = Wire1.read();

  Wire1.write(I2C_SENSOR_1_ADDR);
  Wire1.endTransmission();
  Wire1.requestFrom(EEPROM_ADDR, 1);
  i2c_sensor_1_enabled = Wire1.read();
if(i2c_sensor_1_enabled == 1){
    // Read namememindicator from EEPROM
    Wire1.write(I2C_SENSOR_1_name_ADDR);
    Wire1.endTransmission();
    Wire1.requestFrom(EEPROM_ADDR, 1);
    int namememindicator = Wire1.read();

    // Convert namememindicator to i2c_sensor_1_name
    switch (namememindicator) {
      case 1:
        i2c_sensor_1_name = "BME";
        break;
      case 2:
        i2c_sensor_1_name = "MPU";
        break;
      case 3:
        i2c_sensor_1_name = "GPS";
        break;
    }
}

}
//checks the resetresponse topic for name and type for power outages
void messageReceived(int length) {
  // Read the message
  String resettopic = mqttClient.readStringUntil('/');
  String payload = mqttClient.readString();

    DynamicJsonDocument resetdoc(1024);
    DeserializationError error = deserializeJson(resetdoc, resettopic);

    if (error) {
      Serial.print(F("deserializeJson() failed with code "));
      Serial.println(error.c_str());
      return;
    }

    String sensorType = resetdoc["type"].as<String>();
    String sensorName = resetdoc["name"].as<String>();
   
Serial.print(sensorName);
    // Assign sensorName to your sensor name variables based on the type
    if(sensorType == "digital1"){
      digital_sensor_1_name = sensorName;
    }else if(sensorType == "digital2"){
      digital_sensor_2_name = sensorName;
    }else if(sensorType == "digital3"){
      digital_sensor_3_name = sensorName;
    }else if(sensorType == "analog1"){
      analog_sensor_1_name = sensorName;
    }else if(sensorType == "analog2"){
      analog_sensor_2_name = sensorName;
    }else if(sensorType == "AnalogueTherm"){
      analog_sensor_3_name = sensorName;
    }

}
// power outage watchdog
void resetBoard() {
 
Serial.println("ResetRequested");
  mqttClient.beginMessage("reset");
  mqttClient.print(uidString);
  mqttClient.endMessage();

  mqttClient.subscribe("resetresponse");
Serial.println("subscribed to resetresponse");
  // Set the callback
  mqttClient.onMessage(messageReceived);
}

// serializes and sends info to broker
void serialize() {
  i2c_sensor_1_values_array.clear();
digital_sensor_1_values_array.clear();
digital_sensor_2_values_array.clear();
 digital_sensor_3_values_array.clear();
 analog_sensor_1_values_array.clear();
analog_sensor_2_values_array.clear();
analog_sensor_3_values_array.clear();
  doc.clear();

  // Create a JSON object
  String jsonString;
  // Get the current timestamp

  RTC();

  // Add the device ID
  doc["device_id"] = uidString;

  // Create an array for the sensors
  JsonArray sensors = doc.createNestedArray("sensors");

  // Add each enabled sensor to the array
  if (digital_sensor_1_enabled) {
    JsonObject digital_sensor_1 = sensors.createNestedObject();
    digital_sensor_1["name"] = "digital1";
    digital_sensor_1["type"] = digital_sensor_1_name;
     digital_sensor_1_values_array = digital_sensor_1.createNestedArray("value");
    digital_sensor_1_values_array.add(digital_sensor_1_value);

  }

  if (digital_sensor_2_enabled) {
    JsonObject digital_sensor_2 = sensors.createNestedObject();
    digital_sensor_2["name"] = "digital2";
    digital_sensor_2["type"] = digital_sensor_2_name;
      digital_sensor_2_values_array = digital_sensor_2.createNestedArray("value");
    digital_sensor_2_values_array.add(digital_sensor_2_value);
  }

  if (digital_sensor_3_enabled) {
    JsonObject digital_sensor_3 = sensors.createNestedObject();
    digital_sensor_3["name"] = "digital3";
    digital_sensor_3["type"] = digital_sensor_3_name;
      digital_sensor_3_values_array = digital_sensor_3.createNestedArray("value");
    digital_sensor_3_values_array.add(digital_sensor_3_value);
    
  }

  if (analog_sensor_1_enabled) {
    JsonObject analog_sensor_1 = sensors.createNestedObject();
    analog_sensor_1["name"] = "analog1";
    analog_sensor_1["type"] = analog_sensor_1_name;
      analog_sensor_1_values_array = analog_sensor_1.createNestedArray("value");
     analog_sensor_1_values_array.add(analog_sensor_1_value);

  }

  if (analog_sensor_2_enabled) {
    JsonObject analog_sensor_2 = sensors.createNestedObject();
    analog_sensor_2["name"] = "analog2";
    analog_sensor_2["type"] = analog_sensor_2_name;
      analog_sensor_2_values_array = analog_sensor_2.createNestedArray("value");
     analog_sensor_2_values_array.add(analog_sensor_2_value);

  }

  if (analog_sensor_3_enabled) {
    JsonObject analog_sensor_3 = sensors.createNestedObject();
    analog_sensor_3["name"] = analog_sensor_3_name;
    analog_sensor_3["type"] = "AnalogueTherm";
      analog_sensor_3_values_array = analog_sensor_3.createNestedArray("value");
     analog_sensor_3_values_array.add(analog_sensor_3_value);
     Serial.println("tempsaved");
  
  }

  if (i2c_sensor_1_enabled) {
    JsonObject i2c_sensor_1 = sensors.createNestedObject();
    i2c_sensor_1["name"] = i2c_sensor_1_name;
    i2c_sensor_1["type"] = "i2c";

    // Create an array for the I2C sensor values
    i2c_sensor_1_values_array = i2c_sensor_1.createNestedArray("value");
if (i2c_sensor_1_name == "BME") {
    // Add each value to the array
    i2c_sensor_1_values_array.add(temp);
    i2c_sensor_1_values_array.add(humid);
    i2c_sensor_1_values_array.add(Pressure);
    i2c_sensor_1_values_array.add(gas);
}else if(i2c_sensor_1_name == "MPU"){
    i2c_sensor_1_values_array.add(Acceleration_X);
    i2c_sensor_1_values_array.add(Acceleration_Y);
    i2c_sensor_1_values_array.add(Acceleration_Z);
    i2c_sensor_1_values_array.add(Rotation_X);
     i2c_sensor_1_values_array.add(Rotation_Y);
      i2c_sensor_1_values_array.add(Rotation_Z);
}else if(i2c_sensor_1_name == "GPS"){
      i2c_sensor_1_values_array.add(Latitude);
    i2c_sensor_1_values_array.add(Longitude);


}
  }
  // Serialize the JSON object to a string
  Serial.println("mqtt");
  serializeJson(doc, jsonString);



  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= interval) {
    // save the last time a message was sent
    previousMillis = currentMillis;

    Serial.print("Sending message to topic: ");
    Serial.println(topic);
    Serial.print("hello ");
  }


  // Print the JSON string to the serial monitor
  Serial.println(jsonString);

  // Send the JSON string using MQTT
  mqttClient.beginMessage(topic);
  mqttClient.print(jsonString);
  mqttClient.endMessage();
  delay(5000);
}
//following checks each relative sensor and averages the values
void Digital1() {
  startTime = millis();                      // Get the current time in milliseconds
  while (currentTime - startTime < 10000) {  // Read the sensor value for 10 seconds
    for (int i = 0; i < 10; i++) {           // Read the sensor value 10 times
      sensorVal = digitalRead(dig1pin);      // Read the sensor value
      sensorSum += sensorVal;                // Add the sensor value to the sensor sum
      delay(10);                             // Wait for 10 milliseconds before reading the sensor again
    }
    currentTime = millis();  // Get the current time in milliseconds

    sensorAvg = sensorSum / 10;  // Calculate the sensor average
    Serial.println(sensorAvg);   // Print the sensor average to the serial monitor
    sensorSum = 0;               // Reset the sensor sum for the next reading
  }


  digital_sensor_1_value = sensorAvg;
}
void Digital2() {
  startTime = millis();                      // Get the current time in milliseconds
  while (currentTime - startTime < 10000) {  // Read the sensor value for 10 seconds
    for (int i = 0; i < 10; i++) {           // Read the sensor value 10 times
      sensorVal = digitalRead(dig2pin);      // Read the sensor value
      sensorSum += sensorVal;                // Add the sensor value to the sensor sum
      delay(10);                             // Wait for 10 milliseconds before reading the sensor again
    }
    currentTime = millis();  // Get the current time in milliseconds
  }
  sensorAvg = sensorSum / 10;  // Calculate the sensor average
  Serial.println(sensorAvg);   // Print the sensor average to the serial monitor
  sensorSum = 0;               // Reset the sensor sum for the next reading

  digital_sensor_2_value = sensorAvg;
}
void Digital3() {
  startTime = millis();                      // Get the current time in milliseconds
  while (currentTime - startTime < 10000) {  // Read the sensor value for 10 seconds
    for (int i = 0; i < 10; i++) {           // Read the sensor value 10 times
      sensorVal = digitalRead(dig3pin);      // Read the sensor value
      sensorSum += sensorVal;                // Add the sensor value to the sensor sum
      delay(10);                             // Wait for 10 milliseconds before reading the sensor again
    }
    currentTime = millis();  // Get the current time in milliseconds
  }
  sensorAvg = sensorSum / 10;  // Calculate the sensor average
  Serial.println(sensorAvg);   // Print the sensor average to the serial monitor
  sensorSum = 0;               // Reset the sensor sum for the next reading

  digital_sensor_3_value = sensorAvg;
}
void Digital4() {
}
void Analogue1() {
  startTime = millis();                      // Get the current time in milliseconds
  while (currentTime - startTime < 10000) {  // Read the sensor value for 10 seconds
    for (int i = 0; i < 10; i++) {           // Read the sensor value 10 times
      sensorVal = analogRead(an1pin);        // Read the sensor value
      sensorSum += sensorVal;                // Add the sensor value to the sensor sum
      delay(10);                             // Wait for 10 milliseconds before reading the sensor again
    }
    currentTime = millis();  // Get the current time in milliseconds
  }
  sensorAvg = sensorSum / 10;  // Calculate the sensor average
  Serial.println(sensorAvg);   // Print the sensor average to the serial monitor
  sensorSum = 0;               // Reset the sensor sum for the next reading
  analog_sensor_1_value = sensorAvg;
}



void Analogue2() {
  startTime = millis();                      // Get the current time in milliseconds
  while (currentTime - startTime < 10000) {  // Read the sensor value for 10 seconds
    for (int i = 0; i < 10; i++) {           // Read the sensor value 10 times
      sensorVal = analogRead(an2pin);        // Read the sensor value
      sensorSum += sensorVal;                // Add the sensor value to the sensor sum
      delay(10);                             // Wait for 10 milliseconds before reading the sensor again
    }
    currentTime = millis();  // Get the current time in milliseconds
  }
  sensorAvg = sensorSum / 10;  // Calculate the sensor average
  Serial.println(sensorAvg);   // Print the sensor average to the serial monitor
  sensorSum = 0;               // Reset the sensor sum for the next reading
  analog_sensor_2_value = sensorAvg;
}
void AnalogueTherm() {
  int i;
  float average;
  int NUMSAMPLES = 10;
  int samples[NUMSAMPLES];
  //takes 11 samples from the Thermistor then averages the results
  for (i = 0; i < NUMSAMPLES; i++) {
    samples[i] = analogRead(anThermpin);
    delay(10);
  }
  average = 0;
  for (i = 0; i < NUMSAMPLES; i++) {
    average += samples[i];
  }
  //puts averaged results through a steinhart equation to obtain a rough temperature
  average /= NUMSAMPLES;
  float thermres = ((10000) / (1023 / average - 1));
  double steinhart;
  steinhart = thermres / THERMISTORNOMINAL;          // (R/Ro)
  steinhart = log(steinhart);                        // ln(R/Ro)
  steinhart /= BCOEFFICIENT;                         // 1/B * ln(R/Ro)
  steinhart += 1.0 / (TEMPERATURENOMINAL + 273.15);  // + (1/To)
  steinhart = 1.0 / steinhart;                       // Invert
  steinhart -= 273.15;                               // convert absolute temp to C
  analog_sensor_3_value = steinhart;
  Serial.print("Temperature ");
  Serial.print(steinhart);
  Serial.println(" *C");
}


void I2C() {
  if (i2c_sensor_1_name == "BME") {
      if (!bme.begin()) {
    Serial.println(F("Could not find a valid BME680 sensor, check wiring!"));
    while (1);
  }

      bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320, 150);  // 320*C for 150 ms
    unsigned long endTime = bme.beginReading();
    if (endTime == 0) {
      Serial.println(F("Failed to begin reading :("));
      return;
    }
    if (!bme.endReading()) {
      Serial.println(F("Failed to complete reading :("));
      return;
    }
    

    temp = bme.readTemperature();
    humid = bme.readHumidity();
    Pressure = bme.readPressure();
    gas = bme.readGas();

    delay(2000);



  } else if (i2c_sensor_1_name == "MPU") {
      // Try to initialize!
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip");
    while (1) {
      delay(10);
    }
  }
    sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
     mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  Acceleration_X = a.acceleration.x;
  Acceleration_Y = a.acceleration.y;
  Acceleration_Z = a.acceleration.z;
  Rotation_X = g.gyro.x;
  Rotation_Y = g.gyro.y;
  Rotation_Z =g.gyro.z;

  }else if (i2c_sensor_1_name == "GPS") {
      GPS.begin(0x10);  // The I2C address to use is 0x10

  if (GPS.available()) {
   Latitude = GPS.latitude;
   Longitude = GPS.longitude;
  }

  }
}

//sets up on first boot for sensors
void sensorsetup() {
  Serial.println("Please indicate which sensors are enabled:  ");
  Serial.println("Is The digital1 sensor enabled?: ");

  Serial.println("Is the first digital sensor enabled?");
  while (!Serial.available()) {
    // Wait for user input
  }
  user_input = Serial.readStringUntil('\n');
  digital_sensor_1_enabled = user_input.equalsIgnoreCase("true");

  if (digital_sensor_1_enabled) {
    // Prompt user for input
    Serial.println("What type of sensor is this? (E.g.: Temperature, Pressure...)");
    while (!Serial.available()) {
      // Wait for user input
    }
    digital_sensor_1_name = Serial.readStringUntil('\n');
  }

  // Prompt user for input
  Serial.println("Is the second digital sensor enabled?");
  while (!Serial.available()) {
    // Wait for user input
  }
  user_input = Serial.readStringUntil('\n');
  digital_sensor_2_enabled = user_input.equalsIgnoreCase("true");

  if (digital_sensor_2_enabled) {
    // Prompt user for input
    Serial.println("What type of sensor is this? (E.g.: Temperature, Pressure...)");
    while (!Serial.available()) {
      // Wait for user input
    }
    digital_sensor_2_name = Serial.readStringUntil('\n');
  }

  // Prompt user for input
  Serial.println("Is the third digital sensor enabled?");
  while (!Serial.available()) {
    // Wait for user input
  }
  user_input = Serial.readStringUntil('\n');
  digital_sensor_3_enabled = user_input.equalsIgnoreCase("true");

  if (digital_sensor_3_enabled) {
    // Prompt user for input
    Serial.println("What type of sensor is this? (E.g.: Temperature, Pressure...)");
    while (!Serial.available()) {
      // Wait for user input
    }
    digital_sensor_3_name = Serial.readStringUntil('\n');
  }

  // Prompt user for input
  Serial.println("Is the first analog sensor enabled?");
  while (!Serial.available()) {
    // Wait for user input
  }
  user_input = Serial.readStringUntil('\n');
  analog_sensor_1_enabled = user_input.equalsIgnoreCase("true");

  if (analog_sensor_1_enabled) {
    // Prompt user for input
    Serial.println("What type of sensor is this? (E.g.: Temperature, Pressure...)");
    while (!Serial.available()) {
      // Wait for user input
    }
    analog_sensor_1_name = Serial.readStringUntil('\n');
  }

  // Prompt user for input
  Serial.println("Is the second analog sensor enabled?");
  while (!Serial.available()) {
    // Wait for user input
  }
  user_input = Serial.readStringUntil('\n');
  analog_sensor_2_enabled = user_input.equalsIgnoreCase("true");

  if (analog_sensor_2_enabled) {
    // Prompt user for input
    Serial.println("What type of sensor is this? (E.g.: Temperature, Pressure...)");
    while (!Serial.available()) {
      // Wait for user input
    }
    analog_sensor_2_name = Serial.readStringUntil('\n');
  }

  // Prompt user for input
  Serial.println("Is the third analog sensor enabled?");
  while (!Serial.available()) {
    // Wait for user input
  }
  user_input = Serial.readStringUntil('\n');
  analog_sensor_3_enabled = user_input.equalsIgnoreCase("true");

  if (analog_sensor_3_enabled) {
    // Prompt user for input
    Serial.println("What type of sensor is this? (E.g.: Temperature, Pressure...)");
    while (!Serial.available()) {
      // Wait for user input
    }
    analog_sensor_3_name = Serial.readStringUntil('\n');
  }

  // Prompt user for input
  Serial.println("Is the I2c enabled?");
  while (!Serial.available()) {
    // Wait for user input
  }
  user_input = Serial.readStringUntil('\n');
  i2c_sensor_1_enabled = user_input.equalsIgnoreCase("true");

  if (i2c_sensor_1_enabled) {
    // Prompt user for input
    Serial.println("What type of sensor is this? (E.g.: BME or MPU or GPS.)");
    while (!Serial.available()) {
      // Wait for user input
    }
    i2c_sensor_1_name = Serial.readStringUntil('\n');
  }
  // Prompt user for input

Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(DIGITAL_SENSOR_1_ADDR));
  Wire1.write(digital_sensor_1_enabled ? 1 : 0);
  Wire1.endTransmission();
  delay(5);

  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(DIGITAL_SENSOR_2_ADDR));
  Wire1.write(digital_sensor_2_enabled ? 1 : 0);
  Wire1.endTransmission();
  delay(5);

  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(DIGITAL_SENSOR_3_ADDR));
  Wire1.write(digital_sensor_3_enabled ? 1 : 0);
  Wire1.endTransmission();
  delay(5);

  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(ANALOG_SENSOR_1_ADDR));
  Wire1.write(analog_sensor_1_enabled ? 1 : 0);
  Wire1.endTransmission();
  delay(5);

  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(ANALOG_SENSOR_2_ADDR));
  Wire1.write(analog_sensor_2_enabled ? 1 : 0);
  Wire1.endTransmission();
  delay(5);

  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(ANALOG_SENSOR_3_ADDR));
  Wire1.write(analog_sensor_3_enabled ? 1 : 0);
  Wire1.endTransmission();
  delay(5);

  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(I2C_SENSOR_1_ADDR));
  Wire1.write(i2c_sensor_1_enabled ? 1 : 0);
  Wire1.endTransmission();
  delay(5);
if(i2c_sensor_1_enabled){
  int namememindicator;
if(i2c_sensor_1_name == "BME"){
namememindicator = 1;


}else if(i2c_sensor_1_name == "MPU"){
namememindicator = 2;

}else if(i2c_sensor_1_name == "GPS"){
namememindicator = 3;

}
  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(I2C_SENSOR_1_name_ADDR));
  Wire1.write(namememindicator);
  Wire1.endTransmission();
  delay(5);
}

  Serial.println("Sensor settings saved to EEPROM.");
  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(SETUP_FLAG_ADDR));
  Wire1.write(1);  // write "true" as 1
  Wire1.endTransmission();
  delay(5);

  Serial.println("enabled");

}
// wifi setup and checks if the ssid and password are in mem if not allows user input for ssid, password and mqtt
void wifisetup() {
  if (!isSSIDAndPasswordSaved()) {
    // Wi-Fi credentials not found in EEPROM. Read them in:
    wifireadin();
       sensorsetup();
       
  }
  
  // Now that we have the credentials, attempt to connect to the Wi-Fi network:
  wificonnect();
   checkSensorsEnabled();
}


void wifireadin() {
  // Prompt the user to enter the SSID
  Serial.println("Enter the SSID:");
  while (!Serial.available()) {
    // Wait for user input
  }

  // Read the SSID from the serial input
  ssid = Serial.readString();
  ssid.trim();  // Remove leading/trailing whitespaces

  // Prompt the user to enter the password
  Serial.println("Enter the password:");
  while (!Serial.available()) {
    // Wait for user input
  }

  // Read the password from the serial input
  password = Serial.readString();
  password.trim();  // Remove leading/trailing whitespaces

  // Save the SSID to EEPROM
  for (int i = 0; i < ssid.length(); i++) {
    Wire1.beginTransmission(EEPROM_ADDR);
    Wire1.write((int)(SSID_ADDR + i)); // address
    Wire1.write(ssid[i]);               // data 
    Wire1.endTransmission();
    delay(5); // Add a small delay to allow the EEPROM time to write the data
  }
  // Null-terminate the string
  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(SSID_ADDR + ssid.length()));
  Wire1.write('\0');
  Wire1.endTransmission();
  delay(5);

  // Save the password to EEPROM
  for (int i = 0; i < password.length(); i++) {
    Wire1.beginTransmission(EEPROM_ADDR);
    Wire1.write((int)(PASSWORD_ADDR + i)); // address
    Wire1.write(password[i]);               // data 
    Wire1.endTransmission();
    delay(5);
  }
  // Null-terminate the string
  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(PASSWORD_ADDR + password.length()));
  Wire1.write('\0');
  Wire1.endTransmission();
  delay(5);


  // Prompt the user to enter the MQTT address
  Serial.println("Enter the MQTT address:");
  while (!Serial.available()) {
    // Wait for user input
  }
  
  // Read the MQTT address from the serial input
  String mqttAddress = Serial.readString();
  mqttAddress.trim();  // Remove leading/trailing whitespaces

  // Save the MQTT address to EEPROM
  for (int i = 0; i < mqttAddress.length(); i++) {
    Wire1.beginTransmission(EEPROM_ADDR);
    Wire1.write((int)(MQTT_ADDRESS + i)); // address
    Wire1.write(mqttAddress[i]);           // data 
    Wire1.endTransmission();
    delay(5); // Add a small delay to allow the EEPROM time to write the data
  }
  // Null-terminate the string
  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)(MQTT_ADDRESS + mqttAddress.length()));
  Wire1.write('\0');
  Wire1.endTransmission();
  delay(5);

  Serial.println("SSID, password and MQTT address saved to EEPROM.");
}


bool isSSIDAndPasswordSaved() {
  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write((int)SSID_ADDR);
  Wire1.endTransmission();

  Wire1.requestFrom(EEPROM_ADDR, 1);
  char firstCharSSID = Wire1.read();
  
  if (firstCharSSID != NULL) {
    return true;  // SSID is present in EEPROM
  }



  return false;  // Neither SSID nor password is present in EEPROM
}

void read24AA025UID(uint8_t* buffer) {
  // Array to store the unique identifier
  int i;

  // Read the unique identifier from the EEPROM chip
  Wire1.beginTransmission(EEPROM_ADDR);
  Wire1.write(UID_ADDRESS);
  Wire1.endTransmission(false);        // Send a repeated start condition
  Wire1.requestFrom(EEPROM_ADDR, 32);  // Request 32 bytes of data
  for (i = 0; i < 8; i++) {
    uid[i] = Wire1.read();  // Read each byte of data
  }
}
void RTC() {
Serial.println("RTC reading");


  String dateTimeString = "";
  //dateTimeString += String(year) + "-" +String(month) + "-" +  String(dayOfMonth);
 // dateTimeString += "T" + String(hour) + ":" + String(minute) + ":" + String(second+ ".000+00:00");
 doc["timestamp"] = dateTimeString;

 
}
int bcdToDec(int bcd) {
  return ((bcd / 16) * 10) + (bcd % 16);
}
