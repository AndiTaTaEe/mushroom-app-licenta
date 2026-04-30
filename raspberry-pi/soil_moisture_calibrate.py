import time
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn
from soil_moisture_sensor import HW101

i2c_bus = busio.I2C(board.SCL, board.SDA)
ads = ADS.ADS1115(i2c_bus)
channel_soil_moisture = AnalogIn(ads, 1)  #channel 1 for soil moisture sensor
soil_moisture_sensor = HW101(channel_soil_moisture)
    
if soil_moisture_sensor.dry_val is None or soil_moisture_sensor.wet_val is None:
    soil_moisture_sensor.calibrate()