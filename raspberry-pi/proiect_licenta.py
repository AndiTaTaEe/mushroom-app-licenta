from datetime import datetime

import adafruit_dht
import adafruit_ads1x15.ads1115 as ADS
import board
import busio
import math
import sys
import signal
import subprocess
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

#imports for threading 
import threading
import queue


# constants
SAMPLE_INTERVAL = 3.0 # seconds between sample
# info - optimal conditions for mushroom growth: temperature between 15-30C, humidity between 80-90%, light level between 500-1000 lx, CO2 levels between 500-1000 ppm (during the fruiting phase), soil moisture between 80-90% (for the substrate) - values that can be changed based on the cultivated mushroom species and growth phase

# push notification settings
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send" # expo push notification API endpoint


# queue initialization for the communication between the hardware reading and firebase thread
telemetry_queue = queue.Queue(maxsize=10) #maxsize = 10 to avoid memory overflow if the WiFi connection is down for a long time and the readings are piling up in the queue
active_thresholds = None 

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
# logging an 'info' alert in firebase that the system has started - useful for tracking restarts and debugging
firebase_manager.register_alert("Raspberry Pi system booted and sensors initialized.", "info", "system")

# function for VPD calculation (vapor pressure deficit) - important parameter for mushroom growth, calculated based on temperature and air humidity readings
def calculate_vpd(temperature_c, air_humidity):
    try:
        # saturation vapor pressure calculation using Tetens formula
        # SVP = 0.61078 * e^((17.27 * T) / (T + 237.3)), where T is the temp in celsius
        svp = 0.61078 * math.exp((17.27 * temperature_c) / (temperature_c + 237.3)) # measured in kPa

        # actual vapor pressure calculation based on svp and air humidity
        avp = svp * (air_humidity / 100.0) # measured in kPa    

        # vpd = svp - avp
        return round(svp - avp, 2) # return vpd rounded to 2 decimal
    except Exception as e:
        print(f"Error calculating VPD: {e}")
        return None
    
#helper function to override the speed of the active cooler fan, used for lowering the temperature
def override_pi_fan(speed_level):
    """
    accepts an integer from 0 (off) to 4 (100% max speed)
    """
    try:
        #cooling_device0 is the standard linux path for the Pi5 PWM fan
        command = f"echo {speed_level} > /sys/class/thermal/cooling_device0/cur_state"
        #subprocess to run the bash command with sudo privileges
        subprocess.run(['sudo', 'sh', '-c', command], stdout = subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"Failed to override fan speed: {e}")

# cleanup function to handle exit signals
def cleanup_and_exit(code=0):
    try:
        override_pi_fan(0) # turn off the fan on exit
        dht22_sensor.exit()
    except Exception:
        pass
    sys.exit(code)

# signal handlers functions, for exit on SIGINT (ctrl+c) and SIGTERM
def sigint_handler(signum, frame):
    cleanup_and_exit(0)

signal.signal(signal.SIGINT, sigint_handler)
signal.signal(signal.SIGTERM, sigint_handler)

# push notifications logic & database alert log
# checks if the cooldown period has passed since the last alert for the given sensor type, and if so, sends a push notification to the mobile app using the Expo push notification service
def trigger_alarm(sensor_type, title, message, alert_type):
    
    is_new_alert = firebase_manager.register_alert(message, alert_type, sensor_type) # write to the alert log in firebase and check if the cooldown period has passed to trigger a new alert

    if is_new_alert:
        print(f"Sending push notification for {sensor_type} alert: {title}")

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
                requests.post(EXPO_PUSH_URL, headers=headers, json=payload, timeout=5)
                print("Push notification sent successfully\n")
            except Exception as e:
                print(f"Failed to send push notification: {e}")
        else:
            print("No push token available, cannot send notification")


# threshold evaluator - calculates buffer zones and triggers appropiate alerts
def evaluate_sensor(value, param_key, display_name, unit, current_time, thresholds):
    if value is None:
        return #skip evaluation if sensor failed to read
    
    critical_low = thresholds[param_key]["min"]
    critical_high = thresholds[param_key]["max"]

    # 15% warning buffer inside the safe zone
    range_span = critical_high - critical_low
    buffer = range_span * 0.15
    warning_low = critical_low + buffer
    warning_high = critical_high - buffer

    # evaluate critical conditions first
    if value <= critical_low or value >=critical_high:
        trigger_alarm(
            param_key,
            f"Critical {display_name}",
            f"{display_name} is {value:.1f}{unit} (Outside {critical_low} - {critical_high}{unit})",
            "critical",
        )
    # check warning buffer second
    elif value <= warning_low or value >= warning_high:
        trigger_alarm(
            param_key,
            f"{display_name} Warning",
            f"{display_name} is {value:.1f}{unit} (Approaching limits of {critical_low} - {critical_high}{unit})",
            "warning",
        )

# function to run the cloud uploader and notification trigger in a separate thread, to avoid blocking the main thread in case of WiFi connectivity issues or firebase errors
def cloud_worker_task():
    global active_thresholds # used for storing the latest thresholds fetched from firebase
    while True:
        try:
            payload = telemetry_queue.get() # blocking call, waits for new data from the main thread
            data = payload['data_dict']
            current_time = payload['time']

            #uploading data to firebase
            firebase_manager.upload_data(data)
            print("[CL-T] Data uploaded to Firebase")

            #getting the live thresholds and update global variabile 'active_thresholds'
            fetched_thresholds = firebase_manager.get_thresholds()
            if fetched_thresholds:
                active_thresholds = fetched_thresholds
            
            #evaluate sensors for push notifications
            if active_thresholds:
                evaluate_sensor(data.get('temperature_c'), 'temperature_c', 'Temperature', '°C', current_time, active_thresholds)
                evaluate_sensor(data.get('humidity_percent'), 'humidity_percent', 'Humidity', '%', current_time, active_thresholds)
                evaluate_sensor(data.get('light_lux'), 'light_lux', 'Light Level', 'lux', current_time, active_thresholds)
                evaluate_sensor(data.get('co2_ppm'), 'co2_ppm', 'CO2 Level', 'ppm', current_time, active_thresholds)
                evaluate_sensor(data.get('soil_moisture_percent'), 'soil_moisture_percent', 'Soil Moisture', '%', current_time, active_thresholds)
                evaluate_sensor(data.get('vpd_kpa'), 'vpd_kpa', 'VPD', 'kPa', current_time, active_thresholds)
            telemetry_queue.task_done() # mark the task as done after processing
        except Exception as e:
            print(f"Error in cloud worker thread: {e}")
            
# starting the cloud worker thread
print("Starting cloud worker thread for Firebase upload and notifications...")
cloud_thread = threading.Thread(target=cloud_worker_task, daemon=True)
cloud_thread.start()

# main loop - runs on another thread, responsible for reading the sensors, displaying on OLED and sending data to the cloud worker thread
while True:
    try:
        current_time = time.time() # get the current time, used for checking cooldowns before sending notifications 

        #defining variables to hold sensor readings
        temperature_c = None
        humidity = None
        light_level = None
        co2_ppm = None
        soil_moisture_level = None
        vpd_value = None

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

        # block to calculate VPD
        if temperature_c is not None and humidity is not None:
            vpd_value = calculate_vpd(temperature_c, humidity)

        if all(value is not None for value in [temperature_c, humidity, light_level, co2_ppm, soil_moisture_level, vpd_value]):
        # logic to upload readings to firebase - upload every time 
            data = {
                'temperature_c': temperature_c,
                'humidity_percent': humidity,
                'light_lux': light_level,
                'co2_ppm': co2_ppm,
                'soil_moisture_percent': soil_moisture_level,
                'vpd_kpa': vpd_value,
                'timestamp': str(datetime.now()),
                'last_updated': int(current_time * 1000) # store the timestamp in milliseconds
            }
            
            # non-blocking put to the telemtry queue, responsible for sending data to the cloud worker thread for firebase upload and notification evaluation
            if not telemetry_queue.full():
                telemetry_queue.put({'data_dict': data, 'time': current_time})
            else:
                print("Warning - your network is slow or down. Dropping telemetry packet to prevent overflow")
        
        # OLED logic to display readings
        with canvas(device) as draw:
            draw.text((0, 0),  f"Temp: {temperature_c:.1f}C" if temperature_c is not None else "Temp: ERR", fill="white")
            draw.text((0, 16), f"Hum:  {humidity:.1f}%" if humidity is not None else "Hum:  ERR", fill="white")
            draw.text((0, 32), f"CO2:  {int(co2_ppm)} ppm" if co2_ppm is not None else "CO2:  ERR", fill="white")
            draw.text((0, 48), f"Soil: {soil_moisture_level:.1f}%" if soil_moisture_level is not None else "Soil: ERR", fill="white")
            draw.text((70, 0), f"Light: {light_level:.1f} lx" if light_level is not None else "Light: ERR", fill="white")
            draw.text((70, 16), f"VPD: {vpd_value:.2f} kPa" if vpd_value is not None else "VPD: ERR", fill="white")

        print(f"[HW-T] Temperature: {temperature_c:.1f}C, Humidity: {humidity:.1f}%, Light Level: {light_level:.1f} lx, CO2: {int(co2_ppm)} ppm, Soil Moisture: {soil_moisture_level:.1f}%, VPD: {vpd_value:.2f} kPa")

        # fan actuator control logic based on temperature readings
        if active_thresholds and temperature_c is not None:
            max_temp = active_thresholds.get('temperature_c', {}).get("max", 30) # default max temp threshold is 30C if not available in firebase

            if temperature_c >= max_temp:
                print("Temperature exceeds max threshold, setting fan to max speed")
                override_pi_fan(4) # set fan to max speed
            elif temperature_c <= (max_temp - 1.0): # if temp is close to the max
                override_pi_fan(0) # turn off the fan

    except Exception as error:
        print(f"Error in main loop: {error}")

    time.sleep(SAMPLE_INTERVAL)
    print("")
