import adafruit_dht
import adafruit_ads1x15.ads1115 as ADS
import board
import busio
import sys
import signal
import time
from adafruit_ads1x15.analog_in import AnalogIn 

# imports for OLED display
from luma.core.interface.serial import i2c 
from luma.core.render import canvas # import canvas for drawing on the display
from luma.oled.device import ssd1306 # import SSD1306 driver for OLED

#driver classes for sensors
from bh1750 import BH1750 
from mq135_ads import MQ135 
from soil_moisture_sensor import HW101
from ds18b20 import DS18B20 

#imports for firebase integration
from firebase_manager import FirebaseManager

# imports for pushing notifications to mobile app
import requests


# constants
SAMPLE_INTERVAL = 3.0 # seconds between sample
# optimal conditions for mushroom growth: temperature between 15-30C, humidity between 80-90%, light level between 500-1000 lx, CO2 levels between 500-1000 ppm (during the fruiting phase), soil moisture between 80-90% (for the substrate) - values that can be changed based on the cultivated mushroom species and growth phase
OPTIMAL_MUSH_TEMP = (15.0, 30.0) # celsius 
OPTIMAL_MUSH_HUMIDITY = (80.0, 90.0) # percentage
OPTIMAL_MUSH_LIGHT = (500.0, 1000.0) # lux 
OPTIMAL_MUSH_CO2 = (500.0, 1000.0) # ppm 
OPTIMAL_MUSH_SOIL_MOISTURE = (80.0, 90.0) # percentage

# push notification settings
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send" # expo push notification API endpoint
COOLDOWN_SECONDS = 300 # cooldown between alerts for the same parameter, to avoid spamming notifications

# dictionary to track last time an alert was sent for each parameter
last_alert_times = {
    'temp': 0,
    'humidity': 0,
    'light': 0,
    'co2': 0,
    'soil_moisture': 0
}


# hardware initialization
i2c_bus = busio.I2C(board.SCL, board.SDA) #uses board.SCL and board.SDA
ads = ADS.ADS1115(i2c_bus)
ads.gain = 1 # readings from 0 to +/-4.096V range

serial = i2c(port=1, address=0x3C) # 0x3C is the standard I2C address for SSD1306
device = ssd1306(serial)

# initialize sensor objects
dht22_sensor = adafruit_dht.DHT22(board.D17)
ds18b20_sensor = DS18B20() 
bh1750_sensor = BH1750(i2c_bus)

channel_mq135 = AnalogIn(ads, 0) #MQ135 AO pin connected to ADS1115 channel 0
mq135_sensor = MQ135(channel_mq135, voltage_divider_ratio=3.2, ro=MQ135.MQ135_CALIBRATED_RO)

channel_hw101 = AnalogIn(ads, 1) #soil moisture sensor AO pin connected to ADS1115 channel 1
hw101_sensor = HW101(channel_hw101, dry_val=17636, wet_val=8008) 
#calibrated values for dry and wet environment, obtained on 25/4/2026

# initalization of firebase manager
firebase_manager = FirebaseManager()

# cleanup function to handle exit signals
def cleanup_and_exit(code=0):
    try:
        dht22_sensor.exit()
    except Exception:
        pass
    sys.exit(code)

# signal handlers functions, for exit on SIGINT (ctrl+c) and SIGTERM
def sigint_handler(signum, frame):
    cleanup_and_exit(0)

signal.signal(signal.SIGINT, sigint_handler)
signal.signal(signal.SIGTERM, sigint_handler)

# push notifications logic 
# checks if the cooldown period has passed since the last alert for the given sensor type, and if so, sends a push notification to the mobile app using the Expo push notification service
def send_push_notification(sensor_type, title, message, current_time):
   
    if (current_time - last_alert_times[sensor_type]) > COOLDOWN_SECONDS:
        print(f"Sending push notification for {sensor_type} alert: {title} - {message}")
        token = firebase_manager.get_push_token() # get the push token from firebase

        # if the token is available, send the push notification with a given title and message to the mobile app
        if token:
            # construct the payload for the Expo push notification API
            headers = {
                "Accept": "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
            }
            payload = {
                "to": token,
                "sound": "default",
                "title": title,
                "body": message,
                "priority": "high"
            }

            # send the POST req to the Expo push notification endpoint with the payload
            try:
                requests.post(EXPO_PUSH_URL, headers=headers, json=payload)
                print("Push notification sent successfully")
                last_alert_times[sensor_type] = current_time # update the last alert time for this sensor type
            except Exception as e:
                print(f"Failed to send push notification: {e}")
        else:
            print("No push token available, cannot send notification")
    else:
        pass #skip sending notification if cooldown hasnt passed 

# main loop
# to do: add control logic for heating/cooling and humidifying/dehumidifying based on readings
while True:
    try:
        current_time = time.time() # get the current time, used for checking cooldowns before sending notifications 

        #defining variables to hold sensor readings
        temperature_c = None
        humidity = None
        light_level = None
        co2_ppm = None
        soil_moisture_level = None

        #block to read temperature with error handling
        try:
            temperature_c = ds18b20_sensor.read_temp()
        except Exception as e:
            print(f"DS18B20 read error: {e}")
        
        #block to read humidity
        try:
            humidity = dht22_sensor.humidity
        except Exception as e:
            print(f"DHT22 read error: {e}")
           
        #block to read light level
        try:
            light_level = bh1750_sensor.read_light(bh1750_sensor.CONT_HIGH_RES_MODE)
        except Exception as e:
            print(f"BH1750 read error: {e}")

        #block to read CO2 level
        try:
            co2_ppm = mq135_sensor.get_ppm()
        except Exception as e:
            print(f"MQ-135 read error: {e}")

        #block to read soil moisture level
        try:
            soil_moisture_level = hw101_sensor.get_moisture_percentage()
        except Exception as e:
            print(f"Soil moisture sensor read error: {e}")

        # logic to upload readings to firebase - if all readings are valid => upload to firebase, if any reading is invalid => no uploading to firebase and display error 
        if all(value is not None for value in [temperature_c, humidity, light_level, co2_ppm, soil_moisture_level]):
            data = {
                'temperature_c': temperature_c,
                'humidity': humidity,
                'light_level': light_level,
                'co2_ppm': co2_ppm,
                'soil_moisture_level': soil_moisture_level
            }
            firebase_manager.upload_data(data)     
        
        # OLED logic to display readings
        with canvas(device) as draw:
            draw.text((0, 0),  f"Temp: {temperature_c:.1f}C" if temperature_c is not None else "Temp: ERR", fill="white")
            draw.text((0, 16), f"Hum:  {humidity:.1f}%" if humidity is not None else "Hum:  ERR", fill="white")
            draw.text((0, 32), f"CO2:  {int(co2_ppm)} ppm" if co2_ppm is not None else "CO2:  ERR", fill="white")
            draw.text((0, 48), f"Soil: {soil_moisture_level:.1f}%" if soil_moisture_level is not None else "Soil: ERR", fill="white")
            draw.text((70, 0), f"Light: {light_level:.1f} lx" if light_level is not None else "Light: ERR", fill="white")

        print(f"Temperature: {temperature_c:.1f}C, Humidity: {humidity:.1f}%, Light Level: {light_level:.1f} lx, CO2: {int(co2_ppm)} ppm, Soil Moisture: {soil_moisture_level:.1f}%")

        if temperature_c is not None and (temperature_c <= OPTIMAL_MUSH_TEMP[0] or temperature_c >= OPTIMAL_MUSH_TEMP[1]):
            send_push_notification("temp", "Temperature Warning", f'Temperature is {temperature_c:.1f}°C (Outside optimal range)', current_time)
        if humidity is not None and (humidity <= OPTIMAL_MUSH_HUMIDITY[0] or humidity >= OPTIMAL_MUSH_HUMIDITY[1]):
            send_push_notification("humidity", "Humidity Warning", f'Humidity is {humidity:.1f}% (Outside optimal range)', current_time)
        if light_level is not None and (light_level <= OPTIMAL_MUSH_LIGHT[0] or light_level >= OPTIMAL_MUSH_LIGHT[1]):
            send_push_notification("light", "Light Warning", f'Light level is {light_level:.1f} lx (Outside optimal range)', current_time)
        if co2_ppm is not None and (co2_ppm <= OPTIMAL_MUSH_CO2[0] or co2_ppm >= OPTIMAL_MUSH_CO2[1]):
            send_push_notification("co2", "CO2 Warning", f'CO2 level is {int(co2_ppm)} ppm (Outside optimal range)', current_time)
        if soil_moisture_level is not None and (soil_moisture_level <= OPTIMAL_MUSH_SOIL_MOISTURE[0] or soil_moisture_level >= OPTIMAL_MUSH_SOIL_MOISTURE[1]):
            send_push_notification("soil_moisture", "Soil Moisture Warning", f'Soil moisture level is {soil_moisture_level:.1f}% (Outside optimal range)', current_time)

    except Exception as error:
        print(f"Error in main loop: {error}")

    time.sleep(SAMPLE_INTERVAL)
    print("")

#TO DO: add fans and relays to control temperature and humidity based on sensor readings