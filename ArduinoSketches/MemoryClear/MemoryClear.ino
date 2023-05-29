#include <Wire.h>

#define EEPROM_ADDR 0x50  // Change this to your specific EEPROM's I2C address

void setup() {
    Wire1.setSDA(18);
  Wire1.setSCL(19);
  Wire1.begin(); // Initializes the Wire library (I2C)
 Serial.begin(9600);  // Start the serial communication with the baud rate of 9600

  bool isEmpty = true;
  // Write zeros to all of the EEPROM addresses
  for (int i = 0; i < 256; i++) {  // 256 bytes (2Kb) is the size of 24AA025UID
    Wire1.beginTransmission(EEPROM_ADDR);
    Wire1.write((int)(i >> 8));  // MSB
    Wire1.write((int)(i & 0xFF)); // LSB
Wire1.write('\0'); 
    Wire1.endTransmission();
  
    delay(5); // Give the EEPROM time to complete the write operation
  if (Wire1.available()) {
      byte read_byte = Wire1.read();
      if (read_byte != 0) {
        isEmpty = false;
        break;
      }
    }

    delay(5);  // Give the EEPROM time to complete the read operation
  }

  if (isEmpty) {
    Serial.println("EEPROM is empty");
  } else {
    Serial.println("EEPROM is not empty");
  }
}
void loop() {
  // Nothing to do here
}